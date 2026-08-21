import express from 'express';
import { z } from 'zod';
import { createReadinessService } from '../../../packages/candidate-readiness-domain/src/readinessService.mjs';
import { assertPreparationOnly } from '../../../packages/candidate-readiness-domain/src/policies.mjs';
import { hashTenant, inSpan, requestLogger, startTelemetry } from '../../../packages/observability/src/telemetry.mjs';
import { requireBearerOrDevHeaders } from '../../../apps/api/src/auth.mjs';

await startTelemetry({ serviceName: process.env.OTEL_SERVICE_NAME || 'candidate-readiness-api' });

const app = express();
const port = Number(process.env.PORT || 8790);
const service = createReadinessService();
const idempotencyResponses = new Map();
const auditEvents = [];

app.disable('x-powered-by');
app.use(express.json({ limit: '250kb' }));
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
  if (!['candidate', 'program_admin'].includes(req.actor.role)) return res.status(403).json({ error: 'Candidate or program admin role required.' });
  next();
}

function coachOrAdmin(req, res, next) {
  if (!['coach', 'program_admin'].includes(req.actor.role)) return res.status(403).json({ error: 'Coach or program admin role required.' });
  next();
}

function recordAudit(req, action, entityId, metadata = {}) {
  const event = { id: `cr-event-${crypto.randomUUID().slice(0, 8)}`, action, entityId, tenantId: req.actor.tenantId, actorId: req.actor.actorId, actorRole: req.actor.role, metadata, at: new Date().toISOString() };
  auditEvents.unshift(event);
  return event;
}

const practiceSessionSchema = z.object({
  planId: z.string().min(1),
  sessionContext: z.literal('preparation'),
  consentForAi: z.boolean(),
  practiceMode: z.enum(['behavioral', 'technical', 'system_design', 'portfolio', 'coding']),
  competency: z.string().min(2),
  answer: z.string().max(10_000).default(''),
});

const bookingSchema = z.object({ planId: z.string().min(1), coachId: z.string().min(1), slot: z.string().min(3), candidateApprovedAt: z.string().datetime() });
const milestoneSchema = z.object({ milestoneId: z.string().min(1), status: z.enum(['not_started', 'in_progress', 'complete']) });

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'candidate-readiness-api', mode: 'development-scaffold', boundary: 'preparation_only' }));

app.post('/v1/profiles', requireContext, candidateOnly, idempotent, (req, res) => {
  try {
    const profile = service.upsertProfile({ ...req.body, tenantId: req.actor.tenantId, candidateId: req.body.candidateId || req.actor.actorId });
    const response = { data: profile }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'profile.upserted', profile.candidateId); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.post('/v1/job-descriptions', requireContext, candidateOnly, idempotent, (req, res) => {
  try {
    const job = service.createJobDescription({ ...req.body, tenantId: req.actor.tenantId, candidateId: req.body.candidateId || req.actor.actorId });
    const response = { data: job, boundary: 'preparation_only' }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'job_description.created', job.id, { sourceApproval: job.sourceApproval }); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.get('/v1/job-descriptions/:jobId/intelligence', requireContext, candidateOnly, (req, res) => {
  try { return res.json({ data: service.buildRoleIntelligence({ tenantId: req.actor.tenantId, candidateId: req.query.candidateId || req.actor.actorId, jobDescriptionId: req.params.jobId }) }); }
  catch (error) { return res.status(404).json({ error: error.message }); }
});

app.post('/v1/readiness-plans', requireContext, candidateOnly, idempotent, (req, res) => {
  try {
    const plan = service.createPlan({ ...req.body, tenantId: req.actor.tenantId, candidateId: req.body.candidateId || req.actor.actorId });
    const response = { data: plan, boundary: 'preparation_only' }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'readiness_plan.created', plan.id); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.get('/v1/readiness-plans/:planId', requireContext, candidateOnly, (req, res) => {
  const plan = service.getPlan(req.params.planId, { tenantId: req.actor.tenantId, candidateId: req.query.candidateId || req.actor.actorId });
  if (!plan) return res.status(404).json({ error: 'Readiness plan not found.' });
  return res.json({ data: plan });
});

app.post('/v1/readiness-plans/:planId/milestones', requireContext, candidateOnly, idempotent, (req, res) => {
  const parsed = milestoneSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  try {
    const plan = service.updateMilestone({ tenantId: req.actor.tenantId, candidateId: req.actor.actorId, planId: req.params.planId, ...parsed.data });
    const response = { data: plan }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'milestone.updated', plan.id, parsed.data); return res.status(200).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.post('/v1/stories', requireContext, candidateOnly, idempotent, (req, res) => {
  try {
    const story = service.addStory({ ...req.body, tenantId: req.actor.tenantId, candidateId: req.actor.actorId });
    const response = { data: story }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'story.created', story.id); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.post('/v1/practice-sessions', requireContext, candidateOnly, idempotent, async (req, res) => {
  const parsed = practiceSessionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  try {
    assertPreparationOnly(parsed.data);
    const session = await inSpan('candidate_readiness.practice.submit', { tenant: hashTenant(req.actor.tenantId), practice_mode: parsed.data.practiceMode }, async (span) => {
      const created = service.createPracticeSession({ ...parsed.data, tenantId: req.actor.tenantId, candidateId: req.actor.actorId });
      span.setAttribute('session_id', created.id);
      span.setAttribute('readiness_signal', created.feedback?.readinessSignal || 0);
      return created;
    });
    const response = { data: session, liveAssessmentAccess: false }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'practice.completed', session.id, { practiceMode: session.practiceMode }); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.post('/v1/coaches', requireContext, coachOrAdmin, idempotent, (req, res) => {
  try {
    const coach = service.upsertCoach({ ...req.body, tenantId: req.actor.tenantId, coachId: req.body.coachId || req.actor.actorId });
    const response = { data: coach }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'coach.upserted', coach.coachId); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.post('/v1/coach-matches', requireContext, candidateOnly, (req, res) => {
  try { return res.json({ data: service.matchCoaches({ tenantId: req.actor.tenantId, planId: req.body.planId, language: req.body.language, timeZone: req.body.timeZone }), matchingPolicy: 'candidate_choice_required' }); }
  catch (error) { return res.status(422).json({ error: error.message }); }
});

app.post('/v1/coach-bookings', requireContext, candidateOnly, idempotent, (req, res) => {
  const parsed = bookingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  try {
    const booking = service.createBooking({ tenantId: req.actor.tenantId, candidateId: req.actor.actorId, ...parsed.data });
    const response = { data: booking, boundary: 'preparation_only' }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'coach_booking.requested', booking.id); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.post('/v1/handoffs', requireContext, candidateOnly, idempotent, (req, res) => {
  try {
    const handoff = service.createHandoff({ ...req.body, tenantId: req.actor.tenantId, candidateId: req.body.candidateId || req.actor.actorId });
    const response = { data: handoff, boundary: 'candidate_selected_preparation_data_only' }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'handoff.created', handoff.id, { sharedFields: handoff.sharedFields }); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.post('/v1/opportunities', requireContext, candidateOnly, idempotent, (req, res) => {
  try {
    const opportunity = service.createOpportunity({ ...req.body, tenantId: req.actor.tenantId, candidateId: req.actor.actorId });
    const response = { data: opportunity }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'opportunity.saved', opportunity.id); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.post('/v1/applications', requireContext, candidateOnly, idempotent, (req, res) => {
  try {
    const application = service.createApplication({ ...req.body, tenantId: req.actor.tenantId, candidateId: req.actor.actorId });
    const response = { data: application, autoSubmit: false, policy: 'candidate_review_required' }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'application.review_requested', application.id); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.post('/v1/campaigns', requireContext, candidateOnly, idempotent, (req, res) => {
  try {
    const campaign = service.createCampaign({ ...req.body, tenantId: req.actor.tenantId, candidateId: req.actor.actorId });
    const response = { data: campaign, autoApplyStatus: 'disabled_until_official_partner_connector_and_explicit_policy_approval' }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'campaign.created', campaign.id); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.post('/v1/consents', requireContext, candidateOnly, idempotent, (req, res) => {
  try {
    const consent = service.updateConsent({ ...req.body, tenantId: req.actor.tenantId, candidateId: req.actor.actorId });
    const response = { data: consent }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'consent.updated', consent.candidateId); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.post('/v1/readiness-plans/:planId/device-ready', requireContext, candidateOnly, idempotent, (req, res) => {
  try {
    const plan = service.markDeviceReady({ tenantId: req.actor.tenantId, candidateId: req.actor.actorId, planId: req.params.planId });
    const response = { data: plan }; idempotencyResponses.set(res.locals.idempotencyKey, response); recordAudit(req, 'device_check.completed', plan.id); return res.status(200).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.get('/v1/dashboard', requireContext, candidateOnly, (req, res) => {
  return res.json({ data: service.getDashboard({ tenantId: req.actor.tenantId, candidateId: req.query.candidateId || req.actor.actorId }) });
});

app.get('/v1/data-export', requireContext, candidateOnly, (req, res) => {
  return res.json({ data: service.exportCandidateData({ tenantId: req.actor.tenantId, candidateId: req.query.candidateId || req.actor.actorId }), exportScope: 'candidate_owned_readiness_data_only' });
});

app.get('/v1/audit', requireContext, (req, res) => res.json({ data: auditEvents.filter((event) => event.tenantId === req.actor.tenantId) }));

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Candidate readiness service error.' });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, '0.0.0.0', () => console.log(`Candidate readiness API listening on http://0.0.0.0:${port}`));
}

export { app, service };
