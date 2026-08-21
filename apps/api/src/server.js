import { createServer } from 'node:http';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { z } from 'zod';
import { featureCatalog } from '../../../src/data/features.js';
import { createEvent, MemoryEventBus } from '../../../services/event-gateway/src/eventBus.mjs';
import { randomBytes } from 'node:crypto';
import { attachRevocationStore, demoLoginEnabled, issueForPrincipal, loginDemo, requireAuthentication, revokeSession, verifySession } from './auth.mjs';
import { exchangeAuthorizationCode, oidcAuthorizationUrl, oidcConfig } from './oidc.mjs';
import { createPersistence } from './durableStore.mjs';
import { hasPermission, requirePermission, tenantFor } from './authorization.mjs';
import { calculateScorecard, newInterview, validateScorecard } from './domain.mjs';
import { northstarOrganization } from './organization.mjs';
import { createPlatformServices } from './platformServices.mjs';
import { createCompletionServices } from './completionServices.mjs';
import { createProductServices } from './productServices.mjs';
import { createMediaServices } from './mediaServices.mjs';
import { createDataPlatformServices } from './dataPlatformServices.mjs';
import { createAiServices } from './aiServices.mjs';
import { createSecurityServices } from './securityServices.mjs';
import { inSpan, recordMediaJoin, recordMediaQuality, recordRequest, recordRoomJoin, recordRoomJoinSignal, requestLogger, startTelemetry, stopTelemetry } from './telemetry.mjs';

const app = express();
const httpServer = createServer(app);
const port = Number(process.env.PORT || 8787);
const tenantId = 'northstar';
const events = new MemoryEventBus();
const demoSeed = [
  { id: 'int-2048', tenantId, candidateName: 'Alex Morgan', role: 'Senior Frontend Engineer', stage: 'Technical deep dive', scheduledAt: '2026-08-20T09:30:00+07:00', status: 'live', scorecards: [], consentHistory: [], lifecycle: [{ from: 'checked_in', to: 'live', at: '2026-08-20T02:30:00.000Z' }] },
  { id: 'int-2051', tenantId, candidateName: 'Nadia Rahman', role: 'Data Platform Manager', stage: 'Leadership conversation', scheduledAt: '2026-08-20T11:00:00+07:00', status: 'scheduled', scorecards: [], consentHistory: [], lifecycle: [{ from: 'draft', to: 'scheduled', at: '2026-08-19T02:30:00.000Z' }] },
];
const persistence = createPersistence({
  seedInterviews: process.env.SIGNALROOM_SEED_DEMO === 'true' ? demoSeed : [],
});
attachRevocationStore(persistence);
const auditLedger = persistence.auditLedger;
const responses = persistence.idempotency;
const presenceByRoom = new Map();
const requestBuckets = new Map();
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map((value) => value.trim()).filter(Boolean);
const io = new SocketIOServer(httpServer, {
  path: '/socket.io',
  cors: {
    origin: allowedOrigins?.length ? allowedOrigins : process.env.NODE_ENV === 'production' ? [] : true,
    credentials: true,
  },
  connectionStateRecovery: { maxDisconnectionDuration: 120_000, skipMiddlewares: false },
});

const repository = persistence.interviews;
const platform = createPlatformServices({ events });
const completion = createCompletionServices({ platform });
const product = createProductServices({ events, repository, tenantId });
const media = createMediaServices({ events, tenantId });
const dataPlatform = createDataPlatformServices({ events, tenantId });
const aiServices = createAiServices({ events, platform, tenantId, ollamaUrl: process.env.OLLAMA_URL });
const security = createSecurityServices({ events, platform, tenantId });

if (auditLedger.snapshot().length === 0) {
  auditLedger.append({
    tenantId,
    actor: { id: 'system', name: 'SignalRoom control plane', roles: ['system'] },
    action: 'platform.initialized',
    target: { type: 'tenant', id: tenantId },
    metadata: { eventContractVersion: '1.0', mode: persistence.mode },
  });
}

const consentSchema = z.object({
  recording: z.boolean(),
  transcription: z.boolean(),
  aiProcessing: z.boolean(),
  integrityProcessing: z.boolean(),
  legalNoticeVersion: z.string().trim().min(1).max(80),
});
const roomJoinSchema = z.object({ interviewId: z.string().regex(/^int-[a-zA-Z0-9-]+$/) });
const roomActionSchema = z.object({
  interviewId: z.string().regex(/^int-[a-zA-Z0-9-]+$/),
  action: z.enum(['microphone.changed', 'camera.changed', 'screen-share.changed', 'caption.changed']),
  value: z.boolean(),
});
const transitionSchema = z.object({ status: z.enum(['scheduled', 'checked_in', 'live', 'interrupted', 'completed', 'debrief', 'decision', 'archived', 'cancelled']) });
const artifactSchema = z.object({ type: z.enum(['recording', 'transcript', 'code_snapshot', 'attachment']), reference: z.string().trim().min(3).max(500), retentionClass: z.string().trim().min(3).max(100).optional() });
const codeEvaluationSchema = z.object({ language: z.string().trim().min(1).max(40), code: z.string().max(30_000) });
const followUpSchema = z.object({ rubricId: z.string().optional(), transcript: z.string().max(10_000).optional(), uncovered: z.array(z.string()).max(10).optional() });
const telemetrySchema = z.object({ interviewId: z.string().regex(/^int-[a-zA-Z0-9-]+$/), latencyMs: z.number().nonnegative().max(20_000), packetLoss: z.number().min(0).max(100), jitterMs: z.number().nonnegative().max(10_000) });
const webhookSchema = z.object({ url: z.string().url().max(500), eventTypes: z.array(z.string().min(3).max(100)).min(1).max(10), owner: z.string().trim().min(2).max(100) });
const incidentSchema = z.object({ title: z.string().trim().min(4).max(200), severity: z.enum(['sev1', 'sev2', 'sev3']), summary: z.string().trim().min(4).max(1_000) });
const availabilitySchema = z.object({ requisitionId: z.string().optional(), interviewId: z.string().regex(/^int-[a-zA-Z0-9-]+$/).optional(), panelIds: z.array(z.string()).max(10).optional(), from: z.string().datetime().optional(), to: z.string().datetime().optional(), durationMinutes: z.number().int().min(15).max(240).optional() });
const scheduleSchema = z.object({ interviewId: z.string().regex(/^int-[a-zA-Z0-9-]+$/), requisitionId: z.string().optional(), start: z.string().datetime(), panelIds: z.array(z.string()).max(10).optional() });
const calendarSyncSchema = z.object({ panelId: z.string().min(1).max(80), provider: z.string().min(1).max(80).default('mock-calendar'), externalCalendarId: z.string().min(1).max(200).optional() });
const calendarReconcileSchema = z.object({ events: z.array(z.object({ start: z.string().datetime(), end: z.string().datetime(), summary: z.string().optional() })).max(100) });
const invitationSchema = z.object({ interviewId: z.string().regex(/^int-[a-zA-Z0-9-]+$/), recipient: z.string().email().max(200), channel: z.enum(['email', 'sms', 'slack', 'teams']).default('email'), locale: z.string().min(2).max(10).default('en'), deliverBy: z.string().datetime().optional() });
const searchSchema = z.object({ query: z.string().trim().min(1).max(200), scope: z.array(z.enum(['interviews', 'artifacts', 'catalog'])).max(5).optional() });
const notificationSchema = z.object({ recipient: z.string().email().max(200), channel: z.enum(['email', 'sms', 'slack', 'teams']).default('email'), template: z.string().min(2).max(100), payload: z.record(z.unknown()).optional(), quietHoursStart: z.number().int().min(0).max(23).optional(), quietHoursEnd: z.number().int().min(0).max(23).optional(), retries: z.number().int().min(0).max(10).optional(), escalateTo: z.string().max(200).optional() });
const mediaProvisionSchema = z.object({ interviewId: z.string().regex(/^int-[a-zA-Z0-9-]+$/), region: z.enum(['ap-southeast-1', 'us-east-1', 'eu-central-1']).default('ap-southeast-1'), requesterRoles: z.array(z.string()).max(10).optional(), policy: z.object({ recording: z.string().max(100).optional(), rolePermissions: z.array(z.string()).max(10).optional(), participantLimit: z.number().int().min(1).max(100).optional() }).optional() });
const mediaStateSchema = z.object({ state: z.enum(['provisioning', 'ready', 'reconnecting', 'audio-only', 'ended']), detail: z.string().max(200).optional() });
const admissionSchema = z.object({ sessionId: z.string().min(1).max(100), userId: z.string().min(1).max(100), roles: z.array(z.string()).max(10).optional(), hostAdmitted: z.boolean().optional() });
const whiteboardSchema = z.object({ sessionId: z.string().min(1).max(100) });
const whiteboardActionSchema = z.object({ actorId: z.string().min(1).max(100), action: z.string().min(1).max(100), payload: z.record(z.unknown()).optional() });
const enhancementSchema = z.object({ sessionId: z.string().min(1).max(100), userId: z.string().min(1).max(100), preferences: z.object({ blur: z.boolean().optional(), noiseSuppression: z.boolean().optional(), echoCancellation: z.boolean().optional() }).optional() });
const cdcStreamSchema = z.object({ source: z.string().min(1).max(100).default('mongo.oplog'), topic: z.string().min(1).max(200).optional(), schemaVersion: z.number().int().min(1).max(10).optional() });
const cdcIngestSchema = z.object({ streamId: z.string().min(1).max(100), op: z.enum(['insert', 'update', 'delete', 'backfill']).default('insert'), documentId: z.string().min(1).max(200), payload: z.record(z.unknown()) });
const cdcReplaySchema = z.object({ streamId: z.string().min(1).max(100), fromSequence: z.number().int().min(0).optional() });
const cdcBackfillSchema = z.object({ streamId: z.string().min(1).max(100), records: z.array(z.object({ documentId: z.string().min(1), payload: z.record(z.unknown()) })).min(1).max(1000) });
const lakehouseIngestSchema = z.object({ zone: z.enum(['bronze', 'silver', 'gold']), recordType: z.string().min(1).max(100), payload: z.record(z.unknown()), consent: z.boolean().default(true) });
const artifactIngestSchema = z.object({ interviewId: z.string().regex(/^int-[a-zA-Z0-9-]+$/), artifactType: z.enum(['recording', 'transcript', 'code_snapshot', 'attachment']), reference: z.string().min(3).max(500), bytes: z.number().int().min(0).max(100_000_000).default(0), retentionClass: z.string().min(3).max(100).optional(), encrypt: z.boolean().default(true) });
const pipelineSchema = z.object({ name: z.string().min(2).max(100), schedule: z.string().min(1).max(50).optional(), tasks: z.array(z.object({ name: z.string().min(1).max(100), dependsOn: z.array(z.string()).max(10).optional() })).min(1).max(20) });
const featureSchema = z.object({ name: z.string().min(2).max(100), layer: z.enum(['online', 'offline']).default('online'), version: z.number().int().min(1).max(50).optional(), owner: z.string().min(2).max(100) });
const backupSchema = z.object({ scope: z.string().max(100).optional(), target: z.string().max(100).optional(), rpoMinutes: z.number().int().min(1).max(1440).optional() });
const semanticMetricSchema = z.object({ name: z.string().min(2).max(100), dimension: z.string().min(1).max(100), value: z.number() });
const consentGateSchema = z.object({ aiProcessing: z.boolean().optional(), transcription: z.boolean().optional(), integrityProcessing: z.boolean().optional() });
const aiPlanSchema = z.object({ requisitionId: z.string().min(1).max(100), rubricId: z.string().min(1).max(100).optional(), consent: consentGateSchema });
const aiResumeSchema = z.object({ resumeText: z.string().min(1).max(20_000), consent: consentGateSchema });
const aiBehaviorSchema = z.object({ transcript: z.string().min(1).max(20_000), consent: consentGateSchema });
const aiEngagementSchema = z.object({ segments: z.array(z.object({ text: z.string() })).max(200).optional(), consent: consentGateSchema });
const aiClaimSchema = z.object({ claim: z.string().min(1).max(2_000), knowledgeSource: z.string().max(200).optional(), consent: consentGateSchema });
const aiIntegritySchema = z.object({ signals: z.array(z.object({ type: z.string().max(100), flagged: z.boolean().optional(), severity: z.string().max(50).optional() })).max(50).optional(), consent: consentGateSchema });
const aiCoachSchema = z.object({ interviewerText: z.string().min(1).max(10_000), consent: consentGateSchema });
const aiExplainSchema = z.object({ criteria: z.array(z.object({ id: z.string(), label: z.string().optional(), weight: z.number(), score: z.number().optional(), evidence: z.string().optional() })).max(20).optional(), consent: consentGateSchema });
const aiFollowUpSchema = z.object({ transcript: z.string().max(10_000).optional(), uncovered: z.array(z.string()).max(10).optional(), consent: consentGateSchema });
const aiDebriefSchema = z.object({ criteria: z.array(z.object({ id: z.string(), label: z.string().optional(), weight: z.number(), score: z.number().optional() })).max(20).optional(), consent: consentGateSchema });
const stepUpSchema = z.object({ purpose: z.string().max(100).optional(), userId: z.string().min(1).max(100), methods: z.array(z.enum(['passkey', 'totp', 'sms', 'email'])).max(4).optional() });
const stepUpVerifySchema = z.object({ challengeId: z.string().min(1).max(100), method: z.string().min(1).max(20), verified: z.boolean().optional() });
const secretRotateSchema = z.object({ secretId: z.string().min(1).max(100) });
const dlpScanSchema = z.object({ content: z.string().max(20_000), contentType: z.string().max(50).optional() });
const wafSchema = z.object({ id: z.string().min(1).max(100), rules: z.array(z.string()).max(50).optional() });
const evidenceSchema = z.object({ frameworks: z.array(z.string()).max(10).optional() });
const drillSchema = z.object({ scenario: z.string().max(100).optional() });
const envelopeRotateSchema = z.object({ keyReference: z.string().max(200).optional() });

app.disable('x-powered-by');
app.use(express.json({ limit: '300kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; connect-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; script-src 'self'");
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=()');
  res.on('finish', () => recordRequest({ route: req.route?.path || req.path, method: req.method, statusCode: res.statusCode, tenantId: req.principal?.tenantId }));
  next();
});
app.use(requestLogger());

function requestTenant(req) {
  return tenantFor(req.principal, req.get('x-tenant-id'));
}

function idempotent(req, res, next) {
  const key = req.get('idempotency-key');
  if (!key) return res.status(400).json({ error: 'Idempotency-Key header is required for mutations' });
  if (responses.has(key)) return res.status(200).json({ ...responses.get(key), replayed: true });
  res.locals.idempotencyKey = key;
  return next();
}

function principalRateLimit(req, res, next) {
  const bucketKey = `${req.principal?.tenantId || 'unknown'}:${req.principal?.id || req.ip}`;
  const windowMs = 60_000;
  const limit = 120;
  const current = requestBuckets.get(bucketKey) || { startedAt: Date.now(), count: 0 };
  const withinWindow = Date.now() - current.startedAt < windowMs;
  const bucket = withinWindow ? current : { startedAt: Date.now(), count: 0 };
  bucket.count += 1;
  requestBuckets.set(bucketKey, bucket);
  res.setHeader('RateLimit-Limit', String(limit));
  res.setHeader('RateLimit-Remaining', String(Math.max(0, limit - bucket.count)));
  if (bucket.count > limit) return res.status(429).json({ error: 'Rate limit exceeded. Retry shortly.' });
  return next();
}

function appendAudit({ req, action, target, metadata = {} }) {
  return auditLedger.append({ tenantId: req.principal.tenantId, actor: req.principal, action, target, metadata });
}

function currentPresence(room) {
  return [...(presenceByRoom.get(room)?.values() || [])].map(({ userId, name, roles }) => ({ userId, name, roles }));
}

function removeSocketPresence(socket) {
  for (const room of socket.data.joinedRooms || []) {
    const roomPresence = presenceByRoom.get(room);
    if (!roomPresence) continue;
    roomPresence.delete(socket.id);
    if (roomPresence.size === 0) presenceByRoom.delete(room);
    io.to(room).emit('presence.updated', { room, participants: currentPresence(room) });
  }
}

// Public bootstrap endpoints. Swap the demo login for an OIDC/SAML callback adapter in production.
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'interview-api',
    eventAdapter: 'memory',
    persistence: persistence.mode,
    authentication: { demoLogin: demoLoginEnabled(), oidc: oidcConfig().enabled },
    time: new Date().toISOString(),
  });
});

app.get('/api/auth/methods', (_req, res) => {
  res.json({ data: { demoLogin: demoLoginEnabled(), oidc: oidcConfig(), persistence: persistence.mode } });
});

app.post('/api/auth/demo-login', async (req, res) => {
  try {
    const session = await loginDemo(req.body);
    if (session?.disabled) return res.status(403).json({ error: 'Demo login is disabled. Use OIDC or set ALLOW_DEMO_LOGIN=true.' });
    if (!session) return res.status(401).json({ error: 'Unknown demo identity' });
    auditLedger.append({ tenantId: session.principal.tenantId, actor: session.principal, action: 'auth.demo-login', target: { type: 'user', id: session.principal.id }, metadata: { labelled: true } });
    return res.json({ data: session });
  } catch (error) {
    return res.status(422).json({ error: error.issues?.[0]?.message || 'Invalid login request' });
  }
});

app.get('/api/auth/oidc/start', (req, res) => {
  try {
    const state = randomBytes(16).toString('hex');
    const redirectUri = process.env.OIDC_REDIRECT_URI || String(req.query.redirect_uri || '');
    const authorizationUrl = oidcAuthorizationUrl({ state, redirectUri: redirectUri || undefined });
    return res.json({ data: { authorizationUrl, state, provider: 'oidc' } });
  } catch (error) {
    return res.status(503).json({ error: error.message, code: error.code || 'oidc_unconfigured' });
  }
});

app.post('/api/auth/oidc/callback', async (req, res) => {
  try {
    const code = req.body?.code;
    if (!code) return res.status(422).json({ error: 'authorization code is required' });
    const exchanged = await exchangeAuthorizationCode({ code, redirectUri: req.body?.redirect_uri || process.env.OIDC_REDIRECT_URI });
    const session = await issueForPrincipal(exchanged.principal);
    auditLedger.append({ tenantId: session.principal.tenantId, actor: session.principal, action: 'auth.oidc-login', target: { type: 'user', id: session.principal.id }, metadata: { idp: 'oidc' } });
    return res.json({ data: session });
  } catch (error) {
    const status = error.code === 'oidc_unconfigured' ? 503 : 401;
    return res.status(status).json({ error: error.message, code: error.code });
  }
});

app.use('/api', requireAuthentication);
app.use('/api', principalRateLimit);

app.get('/api/auth/session', (req, res) => res.json({ data: req.principal }));

app.post('/api/auth/logout', (req, res) => {
  revokeSession(req.principal.jti);
  auditLedger.append({ tenantId: req.principal.tenantId, actor: req.principal, action: 'auth.logout', target: { type: 'user', id: req.principal.id }, metadata: { jti: req.principal.jti } });
  return res.json({ data: { revoked: true } });
});

app.get('/api/organization/current', requirePermission('organization:read'), (req, res) => {
  const tenant = requestTenant(req);
  const org = persistence.listOrganizations(tenant)[0] || northstarOrganization;
  res.json({ data: org });
});

app.get('/api/features', requirePermission('feature:read'), (_req, res) => {
  res.json({ data: featureCatalog, total: featureCatalog.length });
});

app.get('/api/interviews', requirePermission('interview:read'), async (req, res) => {
  const tenant = requestTenant(req);
  if (!tenant) return res.status(403).json({ error: 'Tenant context mismatch' });
  return res.json({ data: await repository.list(tenant) });
});

app.post('/api/interviews', requirePermission('interview:create'), idempotent, async (req, res) => {
  const tenant = requestTenant(req);
  if (!tenant) return res.status(403).json({ error: 'Tenant context mismatch' });
  try {
    const interview = await inSpan('interview.create', { 'signalroom.tenant_id': tenant }, async () => {
      const draft = newInterview({ ...req.body, tenantId: tenant });
      await repository.create(draft);
      events.publish(createEvent('interview.created', { tenantId: tenant, interviewId: draft.id, role: draft.role }, { idempotencyKey: res.locals.idempotencyKey }));
      appendAudit({ req, action: 'interview.created', target: { type: 'interview', id: draft.id }, metadata: { role: draft.role, stage: draft.stage } });
      return draft;
    });
    const response = { data: interview };
    responses.set(res.locals.idempotencyKey, response);
    return res.status(201).json(response);
  } catch (error) {
    return res.status(422).json({ error: error.message });
  }
});

app.get('/api/interviews/:id', requirePermission('interview:read', (req) => ({ interviewId: req.params.id })), async (req, res) => {
  const tenant = requestTenant(req);
  const interview = tenant && await repository.findById(req.params.id, tenant);
  if (!interview) return res.status(404).json({ error: 'Interview not found' });
  return res.json({ data: interview });
});

app.post('/api/interviews/:id/transition', requirePermission('workflow:write', (req) => ({ interviewId: req.params.id })), idempotent, async (req, res) => {
  const tenant = requestTenant(req);
  const parsed = transitionSchema.safeParse(req.body);
  if (!tenant) return res.status(403).json({ error: 'Tenant context mismatch' });
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const current = await repository.findById(req.params.id, tenant);
  if (!current) return res.status(404).json({ error: 'Interview not found' });
  try {
    const transitioned = platform.transition(current, parsed.data.status);
    const updated = await repository.replace(transitioned);
    events.publish(createEvent('interview.lifecycle.transitioned', { tenantId: tenant, interviewId: updated.id, status: updated.status }, { idempotencyKey: res.locals.idempotencyKey }));
    appendAudit({ req, action: 'interview.lifecycle.transitioned', target: { type: 'interview', id: updated.id }, metadata: { status: updated.status } });
    const response = { data: updated }; responses.set(res.locals.idempotencyKey, response); return res.status(200).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.get('/api/interviews/:id/artifacts', requirePermission('artifact:read', (req) => ({ interviewId: req.params.id })), (req, res) => {
  return res.json({ data: platform.artifacts(req.params.id) });
});

app.post('/api/interviews/:id/artifacts', requirePermission('artifact:write', (req) => ({ interviewId: req.params.id })), idempotent, async (req, res) => {
  const parsed = artifactSchema.safeParse(req.body);
  const tenant = requestTenant(req);
  if (!tenant) return res.status(403).json({ error: 'Tenant context mismatch' });
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const interview = await repository.findById(req.params.id, tenant);
  if (!interview) return res.status(404).json({ error: 'Interview not found' });
  const artifact = platform.addArtifact(interview.id, parsed.data);
  const job = platform.enqueue('artifact.process', { interviewId: interview.id, artifactId: artifact.id, type: artifact.type });
  events.publish(createEvent('artifact.created', { tenantId: tenant, interviewId: interview.id, artifactId: artifact.id, type: artifact.type }, { idempotencyKey: res.locals.idempotencyKey }));
  appendAudit({ req, action: 'artifact.created', target: { type: 'interview', id: interview.id }, metadata: { artifactId: artifact.id, type: artifact.type, jobId: job.id } });
  const response = { data: { artifact, job } }; responses.set(res.locals.idempotencyKey, response); return res.status(201).json(response);
});

app.get('/api/rubrics', requirePermission('workflow:read'), (_req, res) => res.json({ data: platform.listRubrics() }));
app.get('/api/rubrics/:id', requirePermission('workflow:read'), (req, res) => res.json({ data: platform.rubric(req.params.id) }));

app.post('/api/ai/follow-up', requirePermission('ai:use'), idempotent, (req, res) => {
  const parsed = followUpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const suggestion = platform.suggestFollowUp(parsed.data);
  events.publish(createEvent('ai.copilot.followup.created', { tenantId: req.principal.tenantId, interviewId: req.body.interviewId || 'int-2048', recommendationType: 'neutral_follow_up', modelVersion: 'signal-reasoner-4.2' }, { idempotencyKey: res.locals.idempotencyKey }));
  appendAudit({ req, action: 'ai.copilot.followup.generated', target: { type: 'rubric', id: suggestion.rubricId }, metadata: { competency: suggestion.competency, confidence: suggestion.confidence } });
  const response = { data: suggestion }; responses.set(res.locals.idempotencyKey, response); return res.status(201).json(response);
});

app.post('/api/ai/code-evaluation', requirePermission('ai:use'), idempotent, (req, res) => {
  const parsed = codeEvaluationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const evaluation = platform.evaluateCode(parsed.data);
  events.publish(createEvent('ai.code.evaluated', { tenantId: req.principal.tenantId, interviewId: req.body.interviewId || 'int-2048', recommendationType: 'code_evaluation', modelVersion: 'static-heuristic-local-adapter' }, { idempotencyKey: res.locals.idempotencyKey }));
  appendAudit({ req, action: 'code.evaluated', target: { type: 'code_submission', id: req.body.interviewId || 'int-2048' }, metadata: { score: evaluation.score, executionMode: evaluation.executionMode } });
  const response = { data: evaluation }; responses.set(res.locals.idempotencyKey, response); return res.status(201).json(response);
});

app.get('/api/ai/models', requirePermission('ai:use'), (_req, res) => res.json({ data: platform.modelRegistry() }));
app.post('/api/ai/models/:id/stage', requirePermission('workflow:write'), idempotent, (req, res) => {
  try {
    const model = platform.stageModel(req.params.id);
    appendAudit({ req, action: 'ai.model.staged', target: { type: 'model', id: model.id }, metadata: { version: model.version } });
    const response = { data: model }; responses.set(res.locals.idempotencyKey, response); return res.status(200).json(response);
  } catch (error) { return res.status(404).json({ error: error.message }); }
});

app.post('/api/interviews/:id/debrief', requirePermission('ai:use', (req) => ({ interviewId: req.params.id })), idempotent, async (req, res) => {
  const tenant = requestTenant(req);
  const interview = tenant && await repository.findById(req.params.id, tenant);
  if (!interview) return res.status(404).json({ error: 'Interview not found' });
  const latest = interview.scorecards?.at(-1);
  const debrief = platform.debrief({ interview, criteria: latest?.criteria || [] });
  const job = platform.enqueue('debrief.review', { interviewId: interview.id, debriefId: debrief.id }, { priority: 'high' });
  appendAudit({ req, action: 'ai.debrief.generated', target: { type: 'interview', id: interview.id }, metadata: { debriefId: debrief.id, coverage: debrief.coverage } });
  const response = { data: { debrief, job } }; responses.set(res.locals.idempotencyKey, response); return res.status(201).json(response);
});

app.get('/api/data/schemas', requirePermission('data:operate'), (_req, res) => res.json({ data: platform.schemas() }));
app.post('/api/data/schema-validate', requirePermission('data:operate'), (req, res) => {
  if (!req.body?.name || typeof req.body.payload !== 'object') return res.status(422).json({ error: 'name and object payload are required' });
  return res.json({ data: platform.validateSchema(req.body) });
});
app.post('/api/data/telemetry', requirePermission('data:operate'), idempotent, (req, res) => {
  const parsed = telemetrySchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const item = platform.recordTelemetry({ tenantId: req.principal.tenantId, ...parsed.data });
  recordMediaQuality({ latencyMs: parsed.data.latencyMs, packetLoss: parsed.data.packetLoss, jitterMs: parsed.data.jitterMs, interviewId: parsed.data.interviewId });
  events.publish(createEvent('data.telemetry.recorded', { tenantId: req.principal.tenantId, interviewId: item.interviewId, latencyMs: item.latencyMs, packetLoss: item.packetLoss }, { idempotencyKey: res.locals.idempotencyKey }));
  const response = { data: item }; responses.set(res.locals.idempotencyKey, response); return res.status(201).json(response);
});
app.get('/api/data/quality', requirePermission('data:operate'), (_req, res) => res.json({ data: platform.dataQuality() }));
app.get('/api/data/catalog', requirePermission('data:operate'), (_req, res) => res.json({ data: platform.dataCatalog() }));
app.post('/api/data/replay', requirePermission('data:operate'), idempotent, (req, res) => {
  const job = platform.replay({ topic: req.body?.topic || 'interview.lifecycle.v1', fromOffset: Number(req.body?.fromOffset || 0) });
  events.publish(createEvent('data.replay.requested', { tenantId: req.principal.tenantId, interviewId: req.body?.interviewId || 'int-2048', jobId: job.id }, { idempotencyKey: res.locals.idempotencyKey }));
  appendAudit({ req, action: 'data.replay.requested', target: { type: 'job', id: job.id }, metadata: { topic: job.payload.topic } });
  const response = { data: job }; responses.set(res.locals.idempotencyKey, response); return res.status(202).json(response);
});
app.post('/api/data/deletion', requirePermission('data:operate'), idempotent, (req, res) => {
  const interviewId = req.body?.interviewId || 'int-2048'; const job = platform.requestDeletion({ interviewId, reason: req.body?.reason });
  events.publish(createEvent('privacy.deletion.requested', { tenantId: req.principal.tenantId, interviewId, jobId: job.id }, { idempotencyKey: res.locals.idempotencyKey }));
  appendAudit({ req, action: 'privacy.deletion.requested', target: { type: 'interview', id: interviewId }, metadata: { jobId: job.id } });
  const response = { data: job }; responses.set(res.locals.idempotencyKey, response); return res.status(202).json(response);
});
app.get('/api/jobs', requirePermission('workflow:read'), (_req, res) => res.json({ data: platform.jobs() }));

app.get('/api/workflows', requirePermission('workflow:read'), (_req, res) => res.json({ data: platform.workflows() }));
app.get('/api/requisitions', requirePermission('workflow:read'), (_req, res) => res.json({ data: platform.requisitions() }));
app.get('/api/analytics/overview', requirePermission('analytics:read'), (_req, res) => res.json({ data: platform.analytics() }));

app.get('/api/feature-flags', requirePermission('featureflag:read'), (_req, res) => res.json({ data: platform.flags() }));
app.post('/api/feature-flags/:id', requirePermission('featureflag:write'), idempotent, (req, res) => {
  if (typeof req.body?.enabled !== 'boolean') return res.status(422).json({ error: 'enabled boolean is required' });
  try {
    const flag = platform.setFlag(req.params.id, req.body.enabled);
    events.publish(createEvent('feature.flag.updated', { tenantId: req.principal.tenantId, interviewId: 'platform', flagId: flag.id, enabled: flag.enabled }, { idempotencyKey: res.locals.idempotencyKey }));
    appendAudit({ req, action: 'feature.flag.updated', target: { type: 'feature_flag', id: flag.id }, metadata: { enabled: flag.enabled } });
    const response = { data: flag }; responses.set(res.locals.idempotencyKey, response); return res.status(200).json(response);
  } catch (error) { return res.status(404).json({ error: error.message }); }
});

app.get('/api/operations/slo', requirePermission('operations:read'), (_req, res) => res.json({ data: platform.slo() }));
app.get('/api/operations/incidents', requirePermission('operations:read'), (_req, res) => res.json({ data: platform.incidents() }));
app.post('/api/operations/incidents', requirePermission('operations:write'), idempotent, (req, res) => {
  const parsed = incidentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const incident = platform.incident(parsed.data);
  events.publish(createEvent('incident.created', { tenantId: req.principal.tenantId, interviewId: 'platform', incidentId: incident.id, severity: incident.severity }, { idempotencyKey: res.locals.idempotencyKey }));
  appendAudit({ req, action: 'incident.created', target: { type: 'incident', id: incident.id }, metadata: { severity: incident.severity } });
  const response = { data: incident }; responses.set(res.locals.idempotencyKey, response); return res.status(201).json(response);
});

app.get('/api/security/policy', requirePermission('security:read'), (_req, res) => res.json({ data: platform.securityPolicy() }));
app.post('/api/privacy/redact', requirePermission('privacy:redact'), (req, res) => res.json({ data: platform.redact(req.body?.text || '') }));
app.post('/api/security/envelope-encrypt', requirePermission('security:read'), idempotent, (req, res) => {
  const encrypted = platform.envelopeEncrypt({ classification: req.body?.classification || 'restricted', reference: req.body?.reference || 'artifact-reference' });
  const response = { data: encrypted }; responses.set(res.locals.idempotencyKey, response); return res.status(201).json(response);
});

app.get('/api/webhooks', requirePermission('workflow:read'), (_req, res) => res.json({ data: platform.webhooks() }));
function assertSafeWebhookUrl(rawUrl) {
  // SSRF guard: https-only + no private/loopback/link-local hosts (OWASP SSRF).
  let url;
  try { url = new URL(rawUrl); } catch { throw new Error('Webhook URL is not a valid URL'); }
  if (url.protocol !== 'https:') throw new Error('Webhook URL must use https');
  const host = url.hostname.toLowerCase();
  const privateHost = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0|\[::1\])/.test(host)
    || host === 'host.docker.internal' || host.endsWith('.local') || host.endsWith('.internal');
  if (privateHost) throw new Error('Webhook URL must point to a public https host');
  return url;
}

app.post('/api/webhooks', requirePermission('webhook:write'), idempotent, (req, res) => {
  const parsed = webhookSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  try {
    assertSafeWebhookUrl(parsed.data.url);
  } catch (error) { return res.status(422).json({ error: error.message }); }
  const webhook = platform.createWebhook(parsed.data);
  events.publish(createEvent('webhook.created', { tenantId: req.principal.tenantId, interviewId: 'platform', webhookId: webhook.id }, { idempotencyKey: res.locals.idempotencyKey }));
  appendAudit({ req, action: 'webhook.created', target: { type: 'webhook', id: webhook.id }, metadata: { eventTypes: webhook.eventTypes } });
  const response = { data: webhook }; responses.set(res.locals.idempotencyKey, response); return res.status(201).json(response);
});

app.get('/api/completion', requirePermission('workflow:read'), (_req, res) => res.json({ data: completion.overview() }));
app.post('/api/completion/:domain/:action', idempotent, (req, res) => {
  const permission = completion.permissionFor(req.params.domain);
  if (!permission || !hasPermission(req.principal, permission)) return res.status(403).json({ error: 'You do not have permission for this completion action' });
  const payload = req.body?.payload;
  if (payload !== undefined && (typeof payload !== 'object' || Array.isArray(payload) || JSON.stringify(payload).length > 12_000)) return res.status(422).json({ error: 'payload must be a small object' });
  try {
    const record = completion.run(req.params.domain, req.params.action, payload || {});
    events.publish(createEvent('completion.action.executed', { tenantId: req.principal.tenantId, interviewId: 'platform', domain: record.domain, action: record.action, featureId: record.featureId }, { idempotencyKey: res.locals.idempotencyKey }));
    appendAudit({ req, action: 'completion.action.executed', target: { type: 'feature', id: record.featureId }, metadata: { domain: record.domain, action: record.action, requiresHumanReview: record.requiresHumanReview } });
    const response = { data: record }; responses.set(res.locals.idempotencyKey, response); return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

// Phase 1 — Backend product services: scheduling, calendar, invitation, search, notification.
app.post('/api/availability', requirePermission('schedule:read'), (req, res) => {
  const parsed = availabilitySchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  return res.json({ data: product.availability(parsed.data) });
});

app.get('/api/schedules', requirePermission('schedule:read'), (req, res) => {
  const tenant = requestTenant(req);
  if (!tenant) return res.status(403).json({ error: 'Tenant context mismatch' });
  return res.json({ data: product.listSchedules() });
});
app.post('/api/schedules', requirePermission('schedule:write'), idempotent, (req, res) => {
  const tenant = requestTenant(req);
  if (!tenant) return res.status(403).json({ error: 'Tenant context mismatch' });
  const parsed = scheduleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  try {
    const schedule = product.createSchedule({ ...parsed.data, idempotencyKey: res.locals.idempotencyKey });
    appendAudit({ req, action: 'schedule.confirmed', target: { type: 'interview', id: schedule.interviewId }, metadata: { scheduleId: schedule.id, start: schedule.start } });
    const response = { data: schedule };
    responses.set(res.locals.idempotencyKey, response);
    return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});

app.post('/api/calendar/sync', requirePermission('calendar:sync'), idempotent, (req, res) => {
  const parsed = calendarSyncSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  try {
    const sync = product.createCalendarSync(parsed.data);
    appendAudit({ req, action: 'calendar.sync.created', target: { type: 'panel', id: sync.panelId }, metadata: { syncId: sync.id, provider: sync.provider } });
    const response = { data: sync };
    responses.set(res.locals.idempotencyKey, response);
    return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});
app.post('/api/calendar/sync/:id/reconcile', requirePermission('calendar:sync'), idempotent, (req, res) => {
  const parsed = calendarReconcileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const sync = product.listCalendarSyncs().find((s) => s.id === req.params.id);
  if (!sync) return res.status(404).json({ error: 'Calendar sync not found' });
  const events = sync.reconcile(parsed.data.events);
  appendAudit({ req, action: 'calendar.sync.reconciled', target: { type: 'calendar', id: sync.id }, metadata: { eventCount: events.length } });
  const response = { data: { syncId: sync.id, status: sync.status, events } };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(200).json(response);
});

app.get('/api/invitations', requirePermission('invitation:read'), (req, res) => {
  const tenant = requestTenant(req);
  if (!tenant) return res.status(403).json({ error: 'Tenant context mismatch' });
  return res.json({ data: product.listInvitations() });
});
app.post('/api/invitations', requirePermission('invitation:write'), idempotent, (req, res) => {
  const tenant = requestTenant(req);
  if (!tenant) return res.status(403).json({ error: 'Tenant context mismatch' });
  const parsed = invitationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const invitation = product.createInvitation(parsed.data);
  appendAudit({ req, action: 'invitation.created', target: { type: 'interview', id: invitation.interviewId }, metadata: { invitationId: invitation.id, channel: invitation.channel, locale: invitation.locale } });
  const response = { data: invitation };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});
app.get('/api/invitations/verify', requirePermission('invitation:read'), (req, res) => {
  const token = String(req.query.token || '');
  if (!token) return res.status(422).json({ error: 'token query parameter is required' });
  const result = product.verifyInvitation(token);
  if (!result.valid) return res.status(200).json({ data: result });
  return res.json({ data: result.invitation });
});

app.post('/api/search', requirePermission('search:read'), (req, res) => {
  const tenant = requestTenant(req);
  if (!tenant) return res.status(403).json({ error: 'Tenant context mismatch' });
  const parsed = searchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = product.search({
    query: parsed.data.query,
    scope: parsed.data.scope,
    artifactsByInterview: new Map([[tenant, platform.artifacts('int-2048')]]),
    dataCatalog: platform.dataCatalog(),
  });
  return res.json({ data: result });
});

app.post('/api/notifications', requirePermission('notification:write'), idempotent, (req, res) => {
  const tenant = requestTenant(req);
  if (!tenant) return res.status(403).json({ error: 'Tenant context mismatch' });
  const parsed = notificationSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const job = product.createNotificationJob(parsed.data);
  appendAudit({ req, action: 'notification.job.created', target: { type: 'notification', id: job.id }, metadata: { channel: job.channel, template: job.template } });
  const response = { data: job };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});
app.post('/api/notifications/:id/attempt', requirePermission('notification:write'), (req, res) => {
  try {
    const result = product.attemptNotification(req.params.id);
    return res.json({ data: result });
  } catch (error) { return res.status(404).json({ error: error.message }); }
});
app.get('/api/notifications/:id', requirePermission('notification:read'), (req, res) => {
  const status = product.notificationStatus(req.params.id);
  if (!status) return res.status(404).json({ error: 'Notification job not found' });
  return res.json({ data: status });
});

// Phase 2 — Media control plane: BE-07 orchestration, FE-01 resilient room, FE-07 whiteboard, FE-10 AV enhancement.
app.post('/api/media/sessions', requirePermission('media:provision'), idempotent, async (req, res) => {
  const tenant = requestTenant(req);
  if (!tenant) return res.status(403).json({ error: 'Tenant context mismatch' });
  const parsed = mediaProvisionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  try {
    const session = await inSpan('media.session.provisioned', { 'signalroom.tenant_id': tenant, 'signalroom.interview_id': parsed.data.interviewId, 'media.region': parsed.data.region }, async (span) => {
      const provisioned = media.provisionSession(parsed.data);
      span.setAttribute('media.session_id', provisioned.id);
      span.setAttribute('media.provider_state', provisioned.providerState);
      return provisioned;
    });
    recordMediaJoin({ tenantId: tenant, role: req.principal.roles?.[0] });
    appendAudit({ req, action: 'media.session.provisioned', target: { type: 'interview', id: session.interviewId }, metadata: { sessionId: session.id, region: session.region, providerState: session.providerState } });
    const response = { data: session };
    responses.set(res.locals.idempotencyKey, response);
    return res.status(201).json(response);
  } catch (error) { return res.status(422).json({ error: error.message }); }
});
app.get('/api/media/sessions/:id', requirePermission('media:join'), (req, res) => {
  const session = media.sessionStatus(req.params.id);
  if (!session) return res.status(404).json({ error: 'Media session not found' });
  return res.json({ data: session });
});
app.post('/api/media/sessions/:id/state', requirePermission('media:control'), idempotent, (req, res) => {
  const parsed = mediaStateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const session = media.updateConnectionState(req.params.id, parsed.data);
  if (!session) return res.status(404).json({ error: 'Media session not found' });
  const response = { data: { sessionId: session.id, status: session.status, connection: session.connection } };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(200).json(response);
});
app.post('/api/media/sessions/:id/ice-restart', requirePermission('media:control'), async (req, res) => {
  const result = await inSpan('media.ice_restart', { 'signalroom.interview_id': req.params.id }, async (span) => {
    const restarted = media.iceRestart(req.params.id);
    span.setAttribute('media.restart_state', restarted?.state || 'none');
    return restarted;
  });
  if (!result) return res.status(404).json({ error: 'Media session not found' });
  return res.json({ data: result });
});
app.post('/api/media/admission', requirePermission('media:join'), (req, res) => {
  const parsed = admissionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  return res.json({ data: media.evaluateAdmission(parsed.data) });
});
app.post('/api/media/whiteboards', requirePermission('whiteboard:control'), idempotent, (req, res) => {
  const parsed = whiteboardSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const board = media.createWhiteboard({ sessionId: parsed.data.sessionId, hostId: req.principal.id });
  if (!board) return res.status(404).json({ error: 'Media session not found' });
  appendAudit({ req, action: 'media.whiteboard.created', target: { type: 'media_session', id: parsed.data.sessionId }, metadata: { whiteboardId: board.id } });
  const response = { data: board };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});
app.post('/api/media/whiteboards/:id/action', requirePermission('whiteboard:control'), (req, res) => {
  const parsed = whiteboardActionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = media.whiteboardAction(req.params.id, parsed.data);
  if (!result) return res.status(404).json({ error: 'Whiteboard not found' });
  if (result.denied) return res.status(403).json({ error: result.reason });
  return res.status(201).json({ data: result });
});
app.post('/api/media/whiteboards/:id/stop', requirePermission('whiteboard:control'), (req, res) => {
  const result = media.stopWhiteboard(req.params.id, { actorId: req.principal.id });
  if (!result) return res.status(404).json({ error: 'Whiteboard not found' });
  if (result.denied) return res.status(403).json({ error: result.reason });
  return res.json({ data: result });
});
app.post('/api/media/enhancement', requirePermission('media:enhance'), idempotent, (req, res) => {
  const parsed = enhancementSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = media.applyEnhancement(parsed.data);
  if (!result) return res.status(404).json({ error: 'Media session not found' });
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});

// Phase 3 — Data engineering platform: DE-04 CDC, DE-06 lakehouse, DE-07 ingestion, DE-08 ETL, DE-11 feature store, DE-14 backup/DR, DE-15 semantic metrics.
app.post('/api/data/cdc/streams', requirePermission('data:operate'), idempotent, (req, res) => {
  const parsed = cdcStreamSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const stream = dataPlatform.createCdcStream(parsed.data);
  const response = { data: stream };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});
app.post('/api/data/cdc/ingest', requirePermission('data:operate'), idempotent, (req, res) => {
  const parsed = cdcIngestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const record = dataPlatform.cdcIngest(parsed.data.streamId, parsed.data);
  if (!record) return res.status(404).json({ error: 'CDC stream not found' });
  const response = { data: record };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});
app.post('/api/data/cdc/replay', requirePermission('data:operate'), idempotent, (req, res) => {
  const parsed = cdcReplaySchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = dataPlatform.cdcReplay(parsed.data.streamId, { fromSequence: parsed.data.fromSequence });
  if (!result) return res.status(404).json({ error: 'CDC stream not found' });
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(200).json(response);
});
app.post('/api/data/cdc/backfill', requirePermission('data:operate'), idempotent, (req, res) => {
  const parsed = cdcBackfillSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = dataPlatform.cdcBackfill(parsed.data.streamId, { records: parsed.data.records });
  if (!result) return res.status(404).json({ error: 'CDC stream not found' });
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(200).json(response);
});
app.post('/api/data/lakehouse/ingest', requirePermission('data:operate'), idempotent, (req, res) => {
  const parsed = lakehouseIngestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const entry = dataPlatform.ingestToZone(parsed.data.zone, parsed.data);
  const response = { data: entry };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});
app.get('/api/data/lakehouse/zones', requirePermission('data:operate'), (_req, res) => res.json({ data: dataPlatform.lakehouseZones() }));
app.post('/api/data/ingest-artifact', requirePermission('data:operate'), idempotent, (req, res) => {
  const parsed = artifactIngestSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const artifact = dataPlatform.ingestArtifact(parsed.data);
  appendAudit({ req, action: 'artifact.secure-ingested', target: { type: 'interview', id: artifact.interviewId }, metadata: { artifactId: artifact.id, status: artifact.status, hash: artifact.contentHash } });
  const response = { data: artifact };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});
app.get('/api/data/ingestions', requirePermission('data:operate'), (req, res) => {
  const tenant = requestTenant(req);
  if (!tenant) return res.status(403).json({ error: 'Tenant context mismatch' });
  return res.json({ data: dataPlatform.listIngestions() });
});
app.post('/api/data/pipelines', requirePermission('data:operate'), idempotent, (req, res) => {
  const parsed = pipelineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const pipeline = dataPlatform.createPipeline(parsed.data);
  const response = { data: pipeline };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});
app.post('/api/data/pipelines/:id/run', requirePermission('data:operate'), (req, res) => {
  const result = dataPlatform.runPipeline(req.params.id);
  if (!result) return res.status(404).json({ error: 'Pipeline not found' });
  return res.json({ data: result });
});
app.get('/api/data/pipelines', requirePermission('data:operate'), (_req, res) => res.json({ data: dataPlatform.listPipelines() }));
app.post('/api/data/features', requirePermission('data:operate'), idempotent, (req, res) => {
  const parsed = featureSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const feature = dataPlatform.defineFeature(parsed.data);
  const response = { data: feature };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});
app.get('/api/data/features/skew', requirePermission('data:operate'), (req, res) => {
  const result = dataPlatform.featureSkewTest(String(req.query.name || ''), Number(req.query.version || 1));
  return res.json({ data: result });
});
app.get('/api/data/features', requirePermission('data:operate'), (_req, res) => res.json({ data: dataPlatform.listFeatures() }));
app.post('/api/data/backup', requirePermission('data:operate'), idempotent, (req, res) => {
  const parsed = backupSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const backup = dataPlatform.runBackup(parsed.data);
  appendAudit({ req, action: 'data.backup.completed', target: { type: 'tenant', id: tenantId }, metadata: { backupId: backup.id, rpoMinutes: backup.rpoMinutes } });
  const response = { data: backup };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});
app.post('/api/data/backup/:id/restore-test', requirePermission('data:operate'), (req, res) => {
  const result = dataPlatform.restoreTest(req.params.id);
  if (!result) return res.status(404).json({ error: 'Backup not found' });
  return res.json({ data: result });
});
app.get('/api/data/backup/evidence', requirePermission('data:operate'), (_req, res) => res.json({ data: dataPlatform.backupEvidence() }));
app.post('/api/data/semantic-metrics', requirePermission('data:operate'), idempotent, (req, res) => {
  const parsed = semanticMetricSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const metric = dataPlatform.publishSemanticMetric(parsed.data);
  const response = { data: metric };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});
app.get('/api/data/semantic-metrics', requirePermission('data:operate'), (_req, res) => res.json({ data: dataPlatform.semanticMetricsSnapshot() }));

// Phase 4 — AI agent productionization: consent-gated, grounded, human-reviewed.
function aiConsentGate(req, res, next) {
  const tenant = requestTenant(req);
  if (!tenant) return res.status(403).json({ error: 'Tenant context mismatch' });
  return next();
}

app.post('/api/ai/interviewer/plan', requirePermission('ai:use'), idempotent, aiConsentGate, (req, res) => {
  const parsed = aiPlanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const plan = aiServices.interviewPlan(parsed.data);
  appendAudit({ req, action: 'ai.interviewer.plan-created', target: { type: 'requisition', id: parsed.data.requisitionId }, metadata: { planId: plan.planId, requiresHumanReview: plan.requiresHumanReview } });
  const response = { data: plan };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(plan.allowed === false ? 409 : 201).json(response);
});
app.post('/api/ai/resume/parse', requirePermission('ai:use'), idempotent, aiConsentGate, (req, res) => {
  const parsed = aiResumeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = aiServices.parseResume(parsed.data);
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(result.allowed === false ? 409 : 201).json(response);
});
app.post('/api/ai/behavior/analyze', requirePermission('ai:use'), idempotent, aiConsentGate, (req, res) => {
  const parsed = aiBehaviorSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = aiServices.analyzeBehavior(parsed.data);
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(result.allowed === false ? 409 : 201).json(response);
});
app.post('/api/ai/engagement/analyze', requirePermission('ai:use'), idempotent, aiConsentGate, (req, res) => {
  const parsed = aiEngagementSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = aiServices.analyzeEngagement(parsed.data);
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(result.allowed === false ? 409 : 201).json(response);
});
app.post('/api/ai/claim/verify', requirePermission('ai:use'), idempotent, aiConsentGate, (req, res) => {
  const parsed = aiClaimSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = aiServices.verifyClaim(parsed.data);
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(result.allowed === false ? 409 : 201).json(response);
});
app.post('/api/ai/integrity/review', requirePermission('ai:use'), idempotent, aiConsentGate, (req, res) => {
  const parsed = aiIntegritySchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = aiServices.reviewIntegrity(parsed.data);
  appendAudit({ req, action: 'ai.integrity.reviewed', target: { type: 'interview', id: 'int-2048' }, metadata: { reviewId: result.reviewId, anomalyCount: result.detectedSignals?.length, automatedDecision: result.automatedDecision } });
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(result.allowed === false ? 409 : 201).json(response);
});
app.post('/api/ai/language/coach', requirePermission('ai:use'), idempotent, aiConsentGate, (req, res) => {
  const parsed = aiCoachSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = aiServices.coachLanguage(parsed.data);
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(result.allowed === false ? 409 : 201).json(response);
});
app.post('/api/ai/score/explain', requirePermission('ai:use'), idempotent, aiConsentGate, (req, res) => {
  const parsed = aiExplainSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = aiServices.explainScore(parsed.data);
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(result.allowed === false ? 409 : 201).json(response);
});
app.post('/api/ai/follow-up-grounded', requirePermission('ai:use'), idempotent, aiConsentGate, (req, res) => {
  const parsed = aiFollowUpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = aiServices.groundedFollowUp(parsed.data);
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(result.allowed === false ? 409 : 201).json(response);
});
app.post('/api/ai/debrief/generate', requirePermission('ai:use'), idempotent, aiConsentGate, (req, res) => {
  const parsed = aiDebriefSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = aiServices.generateDebrief({ interview: { id: 'int-2048', candidateName: 'Alex Morgan' }, criteria: parsed.data.criteria || [], consent: parsed.data.consent });
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(result.allowed === false ? 409 : 201).json(response);
});
app.get('/api/ai/governance', requirePermission('ai:use'), (_req, res) => res.json({ data: aiServices.modelGovernanceSnapshot() }));
app.get('/api/ai/evaluations', requirePermission('ai:use'), (_req, res) => res.json({ data: aiServices.evaluationSuite() }));

// Phase 5 — Security, SRE & production readiness.
app.post('/api/security/step-up', requirePermission('security:stepup'), idempotent, (req, res) => {
  const parsed = stepUpSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const challenge = security.createStepUpChallenge(parsed.data);
  appendAudit({ req, action: 'security.stepup.issued', target: { type: 'user', id: parsed.data.userId }, metadata: { challengeId: challenge.challengeId, purpose: challenge.purpose } });
  const response = { data: challenge };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});
app.post('/api/security/step-up/verify', requirePermission('security:stepup'), (req, res) => {
  const parsed = stepUpVerifySchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = security.verifyStepUp(parsed.data.challengeId, parsed.data);
  if (!result.ok) return res.status(401).json({ error: result.reason });
  return res.json({ data: result });
});
app.post('/api/security/secrets/rotate', requirePermission('security:rotate'), idempotent, (req, res) => {
  const parsed = secretRotateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = security.rotateSecret(parsed.data.secretId);
  if (!result) return res.status(404).json({ error: 'Secret not found' });
  appendAudit({ req, action: 'security.secret.rotated', target: { type: 'secret', id: result.id }, metadata: { class: result.class, rotationCount: result.rotationCount } });
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(200).json(response);
});
app.get('/api/security/secrets/policy', requirePermission('security:read'), (_req, res) => res.json({ data: security.secretPolicy() }));
app.post('/api/security/envelope-rotate', requirePermission('security:rotate'), idempotent, (req, res) => {
  const parsed = envelopeRotateSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = security.rotateEnvelopeKey(parsed.data);
  appendAudit({ req, action: 'security.envelope-key.rotated', target: { type: 'key', id: result.keyReference }, metadata: { keyVersion: result.keyVersion } });
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(200).json(response);
});
app.post('/api/security/dlp/scan', requirePermission('security:dlp'), idempotent, (req, res) => {
  const parsed = dlpScanSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = security.runDlpScan(parsed.data);
  appendAudit({ req, action: 'security.dlp.scanned', target: { type: 'dlp', id: result.scanId }, metadata: { findingCount: result.findings.length, blocked: result.blocked } });
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(result.blocked ? 409 : 201).json(response);
});
app.post('/api/security/waf/policy', requirePermission('security:waf'), idempotent, (req, res) => {
  const parsed = wafSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = security.setWafPolicy(parsed.data);
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});
app.get('/api/security/waf/policies', requirePermission('security:read'), (_req, res) => res.json({ data: security.wafPoliciesSnapshot() }));
app.post('/api/security/evidence', requirePermission('security:evidence'), idempotent, (req, res) => {
  const parsed = evidenceSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = security.assembleEvidence(parsed.data);
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});
app.get('/api/security/evidence', requirePermission('security:evidence'), (_req, res) => res.json({ data: security.evidenceSnapshot() }));
app.get('/api/security/supply-chain', requirePermission('security:read'), (_req, res) => res.json({ data: security.supplyChainReport() }));
app.post('/api/delivery/iac-plan', requirePermission('delivery:iac'), idempotent, (req, res) => {
  const result = security.generateIacPlan();
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});
app.post('/api/delivery/release-pipeline', requirePermission('delivery:release'), idempotent, (req, res) => {
  const result = security.createReleasePipeline(req.body?.name ? { name: req.body.name } : {});
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});
app.post('/api/security/dr/drill', requirePermission('security:dr'), idempotent, (req, res) => {
  const parsed = drillSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const result = security.runDrDrill(parsed.data);
  appendAudit({ req, action: 'security.dr.drill-planned', target: { type: 'drill', id: result.drillId }, metadata: { scenario: result.scenario } });
  const response = { data: result };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});

app.post('/api/interviews/:id/scorecards', requirePermission('scorecard:submit', (req) => ({ interviewId: req.params.id })), idempotent, async (req, res) => {
  const tenant = requestTenant(req);
  if (!tenant) return res.status(403).json({ error: 'Tenant context mismatch' });
  const validationError = validateScorecard(req.body);
  if (validationError) return res.status(422).json({ error: validationError });
  const interview = await inSpan('scorecard.submit', { 'signalroom.tenant_id': tenant, 'signalroom.interview_id': req.params.id }, async () => {
    const result = calculateScorecard(req.body.criteria);
    const explanation = platform.explainScorecard(req.body.criteria);
    const scorecard = { id: `sc-${crypto.randomUUID().slice(0, 8)}`, criteria: req.body.criteria, ...result, explanation, submittedAt: new Date().toISOString(), reviewerId: req.principal.id };
    const updated = await repository.saveScorecard(req.params.id, tenant, scorecard);
    if (!updated) return null;
    events.publish(createEvent('scorecard.submitted', { tenantId: tenant, interviewId: updated.id, scorecardId: scorecard.id, completeness: scorecard.completeness }, { idempotencyKey: res.locals.idempotencyKey }));
    appendAudit({ req, action: 'scorecard.submitted', target: { type: 'interview', id: updated.id }, metadata: { scorecardId: scorecard.id, completeness: scorecard.completeness, recommendation: scorecard.recommendation } });
    return { updated, scorecard };
  });
  if (!interview) return res.status(404).json({ error: 'Interview not found' });
  const response = { data: interview.scorecard };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});

app.post('/api/interviews/:id/consent', requirePermission('consent:write', (req) => ({ interviewId: req.params.id })), idempotent, async (req, res) => {
  const tenant = requestTenant(req);
  if (!tenant) return res.status(403).json({ error: 'Tenant context mismatch' });
  const parsed = consentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(422).json({ error: parsed.error.issues[0].message });
  const consent = {
    id: `consent-${crypto.randomUUID().slice(0, 8)}`,
    ...parsed.data,
    subjectId: req.principal.id,
    recordedAt: new Date().toISOString(),
  };
  const interview = await repository.saveConsent(req.params.id, tenant, consent);
  if (!interview) return res.status(404).json({ error: 'Interview not found' });
  events.publish(createEvent('consent.updated', { tenantId: tenant, interviewId: interview.id, consentId: consent.id, recording: consent.recording, aiProcessing: consent.aiProcessing }, { idempotencyKey: res.locals.idempotencyKey }));
  appendAudit({ req, action: 'consent.recorded', target: { type: 'interview', id: interview.id }, metadata: { consentId: consent.id, recording: consent.recording, transcription: consent.transcription, aiProcessing: consent.aiProcessing, integrityProcessing: consent.integrityProcessing } });
  const response = { data: consent };
  responses.set(res.locals.idempotencyKey, response);
  return res.status(201).json(response);
});

app.get('/api/audit', requirePermission('audit:read'), (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 100);
  return res.json({ data: auditLedger.list({ tenantId: req.principal.tenantId, limit }) });
});

app.get('/api/audit/verify', requirePermission('audit:read'), (req, res) => {
  return res.json({ data: auditLedger.verify({ tenantId: req.principal.tenantId }) });
});

app.get('/api/events', requirePermission('event:read'), (req, res) => {
  const tenant = requestTenant(req);
  if (!tenant) return res.status(403).json({ error: 'Tenant context mismatch' });
  return res.json({ data: events.list({ tenantId: tenant, type: req.query.type, afterOffset: Number(req.query.afterOffset || -1) }) });
});

io.use(async (socket, next) => {
  try {
    const principal = await verifySession(socket.handshake.auth?.token);
    if (!hasPermission(principal, 'presence:connect')) throw new Error('Presence access denied');
    socket.data.principal = principal;
    socket.data.joinedRooms = [];
    next();
  } catch {
    next(new Error('Unauthorized realtime connection'));
  }
});

io.on('connection', (socket) => {
  const principal = socket.data.principal;
  socket.emit('realtime.ready', { userId: principal.id, tenantId: principal.tenantId, recovered: socket.recovered });

  socket.on('room.join', async (rawInput, acknowledge = () => {}) => {
    const parsed = roomJoinSchema.safeParse(rawInput);
    if (!parsed.success || !hasPermission(principal, 'interview:room:join', { interviewId: rawInput?.interviewId })) {
      return acknowledge({ ok: false, error: 'Room access denied' });
    }
    const interview = await repository.findById(parsed.data.interviewId, principal.tenantId);
    if (!interview) return acknowledge({ ok: false, error: 'Interview not found' });
    const room = `interview:${interview.id}`;
    socket.join(room);
    socket.data.joinedRooms.push(room);
    const members = presenceByRoom.get(room) || new Map();
    members.set(socket.id, { userId: principal.id, name: principal.name, roles: principal.roles });
    presenceByRoom.set(room, members);
    const payload = { room, participants: currentPresence(room) };
    io.to(room).emit('presence.updated', payload);
    events.publish(createEvent('interview.room.joined', { tenantId: principal.tenantId, interviewId: interview.id, userId: principal.id }));
    auditLedger.append({ tenantId: principal.tenantId, actor: principal, action: 'room.joined', target: { type: 'interview', id: interview.id }, metadata: { transport: 'socket.io' } });
    recordRoomJoin({ tenantId: principal.tenantId, role: principal.roles[0] });
    recordRoomJoinSignal({ tenantId: principal.tenantId, role: principal.roles[0] });
    return acknowledge({ ok: true, ...payload });
  });

  socket.on('room.action', (rawInput, acknowledge = () => {}) => {
    const parsed = roomActionSchema.safeParse(rawInput);
    if (!parsed.success || !hasPermission(principal, 'interview:room:join', { interviewId: rawInput?.interviewId })) {
      return acknowledge({ ok: false, error: 'Room action denied' });
    }
    const room = `interview:${parsed.data.interviewId}`;
    socket.to(room).emit('room.action', { userId: principal.id, name: principal.name, ...parsed.data });
    return acknowledge({ ok: true });
  });

  socket.on('disconnect', () => removeSocketPresence(socket));
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Unexpected control-plane error' });
});

async function start() {
  await startTelemetry();
  httpServer.listen(port, '0.0.0.0', () => console.log(`Interview API listening on http://0.0.0.0:${port}`));
}

if (process.env.NODE_ENV !== 'test') {
  start().catch((error) => {
    console.error('Failed to start telemetry or API', error);
    process.exitCode = 1;
  });
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.once(signal, async () => {
      await stopTelemetry();
      httpServer.close(() => process.exit(0));
    });
  }
}

export { app, auditLedger, events, httpServer, io, repository };
