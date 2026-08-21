import express from 'express';
import { z } from 'zod';
import { createCareerVaultService } from '../../../packages/career-vault-domain/src/careerVaultService.mjs';
import { createRagService } from '../../../packages/career-vault-domain/src/ragService.mjs';
import { assertCandidatePrivateDefault, assertCareerPlanningContext } from '../../../packages/career-vault-domain/src/policies.mjs';
import { hashTenant, inSpan, recordRagAbstention, requestLogger, startTelemetry } from '../../../packages/observability/src/telemetry.mjs';
import { requireBearerOrDevHeaders } from '../../../apps/api/src/auth.mjs';

await startTelemetry({ serviceName: process.env.OTEL_SERVICE_NAME || 'career-vault-api' });

const app = express();
const port = Number(process.env.PORT || 8792);
const service = createCareerVaultService();
const rag = createRagService();
const idempotencyResponses = new Map();
const auditEvents = [];

app.disable('x-powered-by');
app.use(express.json({ limit: '300kb' }));
app.use(requestLogger());
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// Development-only identity seam. Production must replace this with verified
// OIDC/SAML claims, tenant membership, roles, MFA, and durable audit events.
function requireContext(req, res, next) {
  const tenantId = req.get('x-tenant-id');
  const actorId = req.get('x-actor-id');
  const role = req.get('x-actor-role');
  if (!tenantId || !actorId || !role) return res.status(401).json({ error: 'Tenant, actor, and role context are required.' });
  req.actor = { tenantId, actorId, role };
  next();
}

function idempotent(req, res, next) {
  const key = req.get('idempotency-key');
  if (!key) return res.status(400).json({ error: 'Idempotency-Key is required for mutations.' });
  if (idempotencyResponses.has(key)) return res.status(200).json({ ...idempotencyResponses.get(key), replayed: true });
  res.locals.idempotencyKey = key;
  next();
}

function candidateOnly(req, res, next) {
  if (req.actor.role !== 'candidate') return res.status(403).json({ error: 'Candidate role required for Career Vault data.' });
  next();
}

function recordAudit(req, action, entityId, metadata = {}) {
  const event = { id: `cv-event-${crypto.randomUUID().slice(0, 8)}`, action, entityId, tenantId: req.actor.tenantId, actorId: req.actor.actorId, actorRole: req.actor.role, metadata, at: new Date().toISOString() };
  auditEvents.unshift(event);
  return event;
}

const candidateIdFor = (req) => req.query.candidateId || req.actor.actorId;

const opportunitySchema = z.object({
  title: z.string().trim().min(2).max(180),
  company: z.string().trim().min(2).max(180),
  source: z.enum(['official_career_page', 'approved_ats', 'partner_feed', 'referral', 'recruiter_invitation', 'candidate_added', 'email_receipt']),
  sourceReference: z.string().trim().min(3).max(500),
  sourceUrl: z.string().url().optional(),
  requirements: z.array(z.string().trim().min(2).max(100)).max(30).default([]),
  status: z.enum(['saved', 'review_required', 'submitted', 'received', 'reviewing', 'interview_requested', 'paused', 'closed', 'withdrawn']).default('saved'),
  deadline: z.string().datetime().optional(),
  verifiedSource: z.boolean().default(false),
});

const statusSchema = z.object({ status: z.enum(['saved', 'review_required', 'submitted', 'received', 'reviewing', 'interview_requested', 'paused', 'closed', 'withdrawn']) });

const artifactSchema = z.object({
  kind: z.enum(['note', 'feedback', 'document', 'audio', 'video', 'transcript', 'portfolio', 'practice_session']),
  title: z.string().trim().min(2).max(180),
  content: z.string().trim().max(50_000).default(''),
  source: z.enum(['candidate_entered', 'email_import', 'calendar_import', 'coach_shared', 'practice_artifact', 'approved_connector']).default('candidate_entered'),
  sourceReference: z.string().trim().min(1).max(500).default('candidate-entered'),
  opportunityId: z.string().optional(),
  competency: z.string().trim().max(100).default(''),
  retention: z.enum(['keep', 'delete_after_90_days', 'delete_after_1_year', 'delete_on_request']).default('keep'),
  consent: z.object({ recording: z.boolean().default(false), transcript: z.boolean().default(false), rightsConfirmed: z.boolean().default(false) }).default({}),
  contentHash: z.string().max(128).default(''),
});

const timelineSchema = z.object({
  kind: z.enum(['opportunity', 'application', 'interview', 'feedback', 'note', 'practice', 'coaching', 'next_action']),
  title: z.string().trim().min(2).max(180),
  occurredAt: z.string().datetime().optional(),
  source: z.enum(['candidate_entered', 'email_import', 'calendar_import', 'coach_shared', 'practice_artifact', 'approved_connector']).default('candidate_entered'),
  opportunityId: z.string().optional(),
  details: z.record(z.string(), z.unknown()).default({}),
});

const emailImportSchema = z.object({
  connectorId: z.string().min(1),
  subject: z.string().trim().min(2).max(300),
  from: z.string().trim().min(3).max(200),
  receivedAt: z.string().datetime(),
  body: z.string().trim().max(50_000).default(''),
  eligibleFolder: z.boolean().default(true),
  scopeLabel: z.string().trim().min(2).max(200),
  candidateConsentedFolder: z.boolean(),
});

const importReviewSchema = z.object({
  importId: z.string().min(1),
  decision: z.enum(['approve', 'reject', 'correct']),
  titleOverride: z.string().trim().min(2).max(180).optional(),
  companyOverride: z.string().trim().min(2).max(180).optional(),
  candidateApprovedAt: z.string().datetime(),
});

const ragAskSchema = z.object({
  question: z.string().trim().min(3).max(1000),
  opportunityId: z.string().optional(),
  includeArtifactIds: z.array(z.string().min(1)).optional(),
});

const ragPlanSchema = z.object({
  targetOpportunityId: z.string().optional(),
  includeArtifactIds: z.array(z.string().min(1)).optional(),
});

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'career-vault-api', mode: 'development-scaffold', boundary: 'candidate_private_default' }));

// ---- Timeline ----

app.get('/v1/timeline', requireContext, candidateOnly, (req, res) => {
  return res.json({ data: service.listTimeline({ tenantId: req.actor.tenantId, candidateId: candidateIdFor(req), kind: req.query.kind, source: req.query.source }) });
});

app.post('/v1/timeline', requireContext, candidateOnly, idempotent, (req, res) => {
  const parsed = timelineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  try {
    const event = service.addTimelineEvent({ ...parsed.data, tenantId: req.actor.tenantId, candidateId: req.actor.actorId });
    const response = { data: event }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'timeline.event_added', event.id); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

// ---- Opportunities ----

app.get('/v1/opportunities', requireContext, candidateOnly, (req, res) => {
  return res.json({ data: service.listOpportunities({ tenantId: req.actor.tenantId, candidateId: candidateIdFor(req), status: req.query.status }) });
});

app.post('/v1/opportunities', requireContext, candidateOnly, idempotent, (req, res) => {
  const parsed = opportunitySchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  try {
    const opportunity = service.createOpportunity({ ...parsed.data, tenantId: req.actor.tenantId, candidateId: req.actor.actorId });
    const response = { data: opportunity }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'opportunity.created', opportunity.id); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.post('/v1/opportunities/:opportunityId/status', requireContext, candidateOnly, idempotent, (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  try {
    const opportunity = service.updateOpportunityStatus({ tenantId: req.actor.tenantId, candidateId: req.actor.actorId, opportunityId: req.params.opportunityId, status: parsed.data.status, actorId: req.actor.actorId });
    const response = { data: opportunity }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'opportunity.status_updated', opportunity.id, { status: parsed.data.status }); return res.status(200).json(response);
  } catch (error) { return res.status(404).json({ error: error.message }); }
});

// ---- Artifact Vault ----

app.get('/v1/artifacts', requireContext, candidateOnly, (req, res) => {
  return res.json({ data: service.listArtifacts({ tenantId: req.actor.tenantId, candidateId: candidateIdFor(req), kind: req.query.kind }) });
});

app.get('/v1/artifacts/:artifactId', requireContext, candidateOnly, (req, res) => {
  try {
    const artifact = service.getArtifact({ tenantId: req.actor.tenantId, candidateId: req.actor.actorId, artifactId: req.params.artifactId, actorId: req.actor.actorId });
    return res.json({ data: artifact });
  } catch (error) { return res.status(404).json({ error: error.message }); }
});

app.post('/v1/artifacts', requireContext, candidateOnly, idempotent, (req, res) => {
  const parsed = artifactSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  try {
    const artifact = service.addArtifact({ ...parsed.data, tenantId: req.actor.tenantId, candidateId: req.actor.actorId });
    const response = { data: artifact, privateByDefault: true }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'artifact.created', artifact.id, { kind: artifact.kind }); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.post('/v1/artifacts/:artifactId/exclude', requireContext, candidateOnly, idempotent, (req, res) => {
  try {
    const artifact = service.excludeArtifactFromRetrieval({ tenantId: req.actor.tenantId, candidateId: req.actor.actorId, artifactId: req.params.artifactId, actorId: req.actor.actorId });
    const response = { data: artifact }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'artifact.retrieval_excluded', artifact.id); return res.status(200).json(response);
  } catch (error) { return res.status(404).json({ error: error.message }); }
});

// ---- Consent, connectors, sharing ----

app.post('/v1/consents', requireContext, candidateOnly, idempotent, (req, res) => {
  try {
    const consent = service.updateConsent({ ...req.body, tenantId: req.actor.tenantId, candidateId: req.actor.actorId });
    const response = { data: consent }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'consent.updated', consent.candidateId); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.post('/v1/connectors', requireContext, candidateOnly, idempotent, (req, res) => {
  try {
    const connector = service.registerConnector({ ...req.body, tenantId: req.actor.tenantId, candidateId: req.actor.actorId });
    const response = { data: connector, providerStatus: 'blocked_on_provider_decision', reviewBeforeImport: true }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'connector.registered', connector.id, { provider: connector.provider }); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.post('/v1/shares', requireContext, candidateOnly, idempotent, (req, res) => {
  try {
    const share = service.createShare({ ...req.body, tenantId: req.actor.tenantId, candidateId: req.actor.actorId });
    const response = { data: share }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'share.created', share.id, { recipientRole: share.recipientRole }); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

// ---- Email import (review-before-save) ----

app.post('/v1/email/import', requireContext, candidateOnly, idempotent, async (req, res) => {
  const parsed = emailImportSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  try {
    const imported = await inSpan('career_vault.email_import', { tenant: hashTenant(req.actor.tenantId), outcome: 'awaiting_review' }, async (span) => {
      const record = await service.importEmail({ ...parsed.data, tenantId: req.actor.tenantId, candidateId: req.actor.actorId });
      span.setAttribute('import_id', record.id);
      return record;
    });
    const response = { data: imported, status: 'awaiting_review', reviewBeforeSave: true, trainingUse: false, forwardedToEmployer: false };
    idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'email_import.received', imported.id, { subject: imported.subject.slice(0, 80) }); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.get('/v1/email/imports', requireContext, candidateOnly, (req, res) => {
  return res.json({ data: service.listImports({ tenantId: req.actor.tenantId, candidateId: req.actor.actorId, status: req.query.status }) });
});

app.post('/v1/email/imports/:importId/review', requireContext, candidateOnly, idempotent, (req, res) => {
  const parsed = importReviewSchema.safeParse({ ...req.body, importId: req.params.importId });
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  try {
    const reviewed = service.reviewImport({ ...parsed.data, tenantId: req.actor.tenantId, candidateId: req.actor.actorId });
    const response = { data: reviewed }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'email_import.reviewed', reviewed.id, { decision: reviewed.status }); return res.status(200).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

// ---- RAG Career Coach (deterministic retrieval over candidate-owned vault) ----

function ragEvidence(req, includeArtifactIds) {
  const artifacts = includeArtifactIds?.length
    ? includeArtifactIds.map((artifactId) => service.getArtifact({ tenantId: req.actor.tenantId, candidateId: req.actor.actorId, artifactId, actorId: req.actor.actorId }))
    : service.listArtifacts({ tenantId: req.actor.tenantId, candidateId: req.actor.actorId });
  return artifacts.filter((artifact) => !artifact.excludeFromRetrieval).map((artifact) => ({
    artifactId: artifact.id, title: artifact.title, kind: artifact.kind, content: artifact.content,
    source: artifact.source, date: artifact.createdAt, tenantId: artifact.tenantId, candidateId: artifact.candidateId,
    competency: artifact.competency || '', opportunityId: artifact.opportunityId || '',
  }));
}

app.post('/v1/rag/ask', requireContext, candidateOnly, async (req, res) => {
  const parsed = ragAskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  try {
    const providers = service.listProviders({ tenantId: req.actor.tenantId, candidateId: req.actor.actorId });
    const ragProvider = providers.find((item) => item.id === 'rag_coach');
    if (ragProvider && !ragProvider.enabled) return res.status(409).json({ error: 'The RAG Career Coach is disabled. Enable it in Trust & data to ask cited questions over your records.' });
    const result = await inSpan('career_vault.rag.ask', { tenant: hashTenant(req.actor.tenantId), citation_count: 0 }, async (span) => {
      const output = await rag.ask({ tenantId: req.actor.tenantId, candidateId: req.actor.actorId, sessionContext: 'career_planning', question: parsed.data.question, opportunityId: parsed.data.opportunityId, evidence: ragEvidence(req, parsed.data.includeArtifactIds) });
      span.setAttribute('abstention', output.abstention);
      span.setAttribute('citation_count', output.citations.length);
      if (output.abstention) {
        span.setAttribute('abstention_reason', output.reason);
        recordRagAbstention(output.reason);
      }
      return output;
    });
    recordAudit(req, 'rag.asked', req.actor.actorId, { abstention: result.abstention, citationCount: result.citations.length });
    return res.json({ data: result });
  } catch (error) { console.error('[career-vault-api] rag/ask failed:', error); return res.status(409).json({ error: error.message }); }
});

app.post('/v1/rag/plan', requireContext, candidateOnly, async (req, res) => {
  const parsed = ragPlanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  try {
    const providers = service.listProviders({ tenantId: req.actor.tenantId, candidateId: req.actor.actorId });
    const ragProvider = providers.find((item) => item.id === 'rag_coach');
    if (ragProvider && !ragProvider.enabled) return res.status(409).json({ error: 'The RAG Career Coach is disabled. Enable it in Trust & data to generate cited plans.' });
    const result = await inSpan('career_vault.rag.plan', { tenant: hashTenant(req.actor.tenantId) }, async (span) => {
      const output = await rag.createSevenDayPlan({ tenantId: req.actor.tenantId, candidateId: req.actor.actorId, sessionContext: 'career_planning', targetOpportunityId: parsed.data.targetOpportunityId, evidence: ragEvidence(req, parsed.data.includeArtifactIds) });
      span.setAttribute('abstention', output.abstention);
      span.setAttribute('plan_days', output.plan?.days?.length || 0);
      return output;
    });
    recordAudit(req, 'rag.plan_created', req.actor.actorId, { abstention: result.abstention, days: result.plan?.days?.length || 0 });
    return res.json({ data: result });
  } catch (error) { return res.status(409).json({ error: error.message }); }
});

// ---- Provider connections (disable now / connect when available) ----

app.get('/v1/providers', requireContext, candidateOnly, (req, res) => {
  return res.json({ data: service.listProviders({ tenantId: req.actor.tenantId, candidateId: req.actor.actorId }) });
});

app.post('/v1/providers/:providerId', requireContext, candidateOnly, idempotent, (req, res) => {
  const enabled = req.body.enabled === true;
  try {
    const updated = service.setProviderEnabled({ tenantId: req.actor.tenantId, candidateId: req.actor.actorId, providerId: req.params.providerId, enabled });
    const response = { data: updated }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, enabled ? 'provider.enabled' : 'provider.disabled', updated.id, { providerId: updated.id }); return res.status(200).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

// ---- Dashboard, export, delete, audit ----

app.get('/v1/dashboard', requireContext, candidateOnly, (req, res) => {
  try {
    return res.json({ data: service.getDashboard({ tenantId: req.actor.tenantId, candidateId: req.actor.actorId, actorId: req.actor.actorId }) });
  } catch (error) { return res.status(403).json({ error: error.message }); }
});

app.post('/v1/data-export', requireContext, candidateOnly, idempotent, (req, res) => {
  try {
    const result = service.exportCandidateData({ ...req.body, tenantId: req.actor.tenantId, candidateId: req.actor.actorId });
    const response = { data: result }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'data.export_requested', req.actor.actorId); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.post('/v1/data-deletion', requireContext, candidateOnly, idempotent, (req, res) => {
  try {
    const result = service.deleteCandidateData({ ...req.body, tenantId: req.actor.tenantId, candidateId: req.actor.actorId });
    const response = { data: result }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'data.deletion_requested', req.actor.actorId); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.get('/v1/audit', requireContext, (req, res) => res.json({ data: auditEvents.filter((event) => event.tenantId === req.actor.tenantId) }));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Career Vault service error.' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, '0.0.0.0', () => console.log(`Career Vault API listening on http://0.0.0.0:${port}`));
}

export { app, service };
