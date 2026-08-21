import { createCipheriv, randomBytes, randomUUID } from 'node:crypto';

export const interviewTransitions = {
  draft: ['scheduled', 'cancelled'],
  scheduled: ['checked_in', 'cancelled'],
  checked_in: ['live', 'cancelled'],
  live: ['interrupted', 'completed'],
  interrupted: ['live', 'completed'],
  completed: ['debrief'],
  debrief: ['decision'],
  decision: ['archived'],
  cancelled: [],
  archived: [],
};

export function assertInterviewTransition(currentStatus, nextStatus) {
  if (!interviewTransitions[currentStatus]?.includes(nextStatus)) {
    throw new Error(`Invalid interview transition from ${currentStatus} to ${nextStatus}`);
  }
}

const localEnvelopeKey = randomBytes(32);
const now = () => new Date().toISOString();

function redactPII(text = '') {
  return String(text)
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]')
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[REDACTED_PHONE]')
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[REDACTED_NUMBER]');
}

function envelopeEncrypt(value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', localEnvelopeKey, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return {
    algorithm: 'AES-256-GCM',
    keyReference: 'local-dev-kms/signalroom-artifact-key',
    iv: iv.toString('base64'),
    ciphertext: ciphertext.toString('base64'),
    authTag: cipher.getAuthTag().toString('base64'),
  };
}

function weightedSummary(criteria = []) {
  const scored = criteria.filter((criterion) => Number.isFinite(criterion.score));
  const totalWeight = criteria.reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0);
  const coveredWeight = scored.reduce((sum, criterion) => sum + Number(criterion.weight || 0), 0);
  const average = coveredWeight ? Number((scored.reduce((sum, criterion) => sum + criterion.score * criterion.weight, 0) / coveredWeight).toFixed(1)) : 0;
  return {
    average,
    coverage: totalWeight ? Math.round((coveredWeight / totalWeight) * 100) : 0,
    evidence: scored.map((criterion) => ({ competency: criterion.label || criterion.id, score: criterion.score, evidence: criterion.evidence || 'Reviewer-provided score evidence' })),
  };
}

export function createPlatformServices({ events }) {
  const jobs = [];
  const artifacts = new Map();
  const telemetry = [];
  const incidents = [];
  const webhooks = [];
  const flags = new Map([
    ['candidate-device-preflight', { id: 'candidate-device-preflight', enabled: true, scope: 'tenant:northstar', owner: 'Experience' }],
    ['copilot-grounded-followups', { id: 'copilot-grounded-followups', enabled: true, scope: 'tenant:northstar', owner: 'AI Systems' }],
    ['realtime-presence-v2', { id: 'realtime-presence-v2', enabled: false, scope: 'tenant:northstar', owner: 'Platform' }],
    ['integrity-review-beta', { id: 'integrity-review-beta', enabled: false, scope: 'role:privacy_admin', owner: 'Trust' }],
  ]);
  const workflows = [
    { id: 'workflow-standard-engineering', name: 'Standard engineering loop', stages: ['screen', 'technical', 'systems', 'debrief', 'decision'], requiredEvidence: ['scorecard', 'independent-feedback'], active: true },
    { id: 'workflow-data-leadership', name: 'Data leadership loop', stages: ['screen', 'leadership', 'data-case', 'debrief', 'decision'], requiredEvidence: ['scorecard', 'calibration'], active: true },
  ];
  const requisitions = [
    { id: 'req-frontend-2026', title: 'Senior Frontend Engineer', department: 'Product & Engineering', workflowId: 'workflow-standard-engineering', openings: 2, status: 'active', rubricId: 'rubric-frontend-v6' },
    { id: 'req-data-2026', title: 'Data Platform Manager', department: 'Data', workflowId: 'workflow-data-leadership', openings: 1, status: 'active', rubricId: 'rubric-data-v4' },
  ];
  const rubrics = new Map([
    ['rubric-frontend-v6', {
      id: 'rubric-frontend-v6', version: '6.0', name: 'Senior Frontend Engineer', approvedAt: '2026-08-01T00:00:00.000Z',
      competencies: [
        { id: 'systems', label: 'Systems thinking', weight: 30 },
        { id: 'execution', label: 'Execution & quality', weight: 25 },
        { id: 'accessibility', label: 'Accessibility mindset', weight: 20 },
        { id: 'collaboration', label: 'Collaboration', weight: 25 },
      ],
    }],
    ['rubric-data-v4', {
      id: 'rubric-data-v4', version: '4.0', name: 'Data Platform Manager', approvedAt: '2026-07-21T00:00:00.000Z',
      competencies: [{ id: 'strategy', label: 'Data strategy', weight: 35 }, { id: 'leadership', label: 'Leadership', weight: 35 }, { id: 'execution', label: 'Execution', weight: 30 }],
    }],
  ]);
  const schemas = new Map([
    ['interview.lifecycle.v1', { name: 'interview.lifecycle.v1', version: '1.0', owner: 'Platform', required: ['tenantId', 'interviewId', 'status'], compatibility: 'backward' }],
    ['media.telemetry.v2', { name: 'media.telemetry.v2', version: '2.0', owner: 'Media SRE', required: ['tenantId', 'interviewId', 'latencyMs', 'packetLoss'], compatibility: 'backward' }],
    ['ai.recommendations.v1', { name: 'ai.recommendations.v1', version: '1.0', owner: 'AI Systems', required: ['tenantId', 'interviewId', 'recommendationType', 'modelVersion'], compatibility: 'backward' }],
    ['consent.policy.v1', { name: 'consent.policy.v1', version: '1.0', owner: 'Trust', required: ['tenantId', 'interviewId', 'consentId'], compatibility: 'full' }],
  ]);
  const models = [
    { id: 'signal-reasoner-4.2', name: 'Signal Reasoner', version: '4.2', status: 'active', promptSet: 'interview-copilot-v12', retrievalCollection: 'northstar-rubrics-v6', approvedBy: 'Trust Admin', updatedAt: '2026-08-19T09:00:00.000Z' },
    { id: 'signal-reasoner-4.3', name: 'Signal Reasoner', version: '4.3', status: 'staged', promptSet: 'interview-copilot-v13', retrievalCollection: 'northstar-rubrics-v6', approvedBy: null, updatedAt: '2026-08-20T07:00:00.000Z' },
  ];

  function enqueue(kind, payload, { priority = 'normal', tenantId = 'northstar' } = {}) {
    const job = { id: `job-${randomUUID().slice(0, 8)}`, kind, payload, tenantId, priority, status: 'queued', createdAt: now(), attempts: 0 };
    jobs.unshift(job);
    return job;
  }

  function addArtifact(interviewId, artifact) {
    const item = {
      id: `artifact-${randomUUID().slice(0, 8)}`,
      interviewId,
      type: artifact.type,
      reference: artifact.reference,
      contentHash: artifact.contentHash || `sha256:${randomUUID().replaceAll('-', '')}`,
      encrypted: true,
      keyReference: 'local-dev-kms/signalroom-artifact-key',
      retentionClass: artifact.retentionClass || 'candidate-standard-90d',
      createdAt: now(),
      status: 'ready',
    };
    artifacts.set(interviewId, [item, ...(artifacts.get(interviewId) || [])]);
    return item;
  }

  return {
    transition(record, nextStatus) {
      assertInterviewTransition(record.status, nextStatus);
      return { ...record, status: nextStatus, lifecycle: [...(record.lifecycle || []), { from: record.status, to: nextStatus, at: now() }] };
    },
    listRubrics: () => [...rubrics.values()],
    rubric: (id) => rubrics.get(id) || rubrics.get('rubric-frontend-v6'),
    suggestFollowUp({ rubricId = 'rubric-frontend-v6', transcript = '', uncovered = [] }) {
      const rubric = rubrics.get(rubricId) || rubrics.get('rubric-frontend-v6');
      const requested = uncovered[0];
      const target = typeof requested === 'string'
        ? rubric.competencies.find((item) => item.label === requested || item.id === requested) || { label: requested }
        : requested || rubric.competencies.find((item) => !/accessibility/i.test(transcript)) || rubric.competencies[0];
      const question = /offline|network|reconnect/i.test(transcript)
        ? `For ${target.label}, how would you reconcile a local edit with a newer remote edit without silently losing candidate intent?`
        : `Could you give a concrete example that demonstrates ${target.label}, including the trade-off you made and how you measured the outcome?`;
      return { question, competency: target.label, rubricId: rubric.id, sourceVersion: rubric.version, confidence: 0.84, requiresHumanJudgment: true, evidence: ['approved rubric', 'current interview transcript'] };
    },
    explainScorecard: (criteria) => ({ ...weightedSummary(criteria), rubricSource: 'rubric-frontend-v6@6.0', requiresHumanJudgment: true }),
    evaluateCode({ code = '', language = 'javascript' }) {
      const checks = [
        { id: 'syntax-shape', label: 'Defines a callable function', passed: /function\s+\w+|=>/.test(code) },
        { id: 'idempotency', label: 'Addresses repeat-safe updates', passed: /idempot|map\(|set\(/i.test(code) },
        { id: 'edge-case', label: 'Handles missing or conflicting values', passed: /if\s*\(|\?\?/.test(code) },
        { id: 'quality', label: 'Avoids debug-only output', passed: !/console\.log/.test(code) },
      ];
      const passed = checks.filter((item) => item.passed).length;
      return {
        language,
        executionMode: 'static-heuristic-local-adapter',
        score: Math.round((passed / checks.length) * 100),
        checks,
        notes: ['No candidate code is executed in this local adapter.', 'Production must use an isolated, resource-limited sandbox with hidden tests.'],
      };
    },
    debrief({ interview, criteria = [] }) {
      const summary = weightedSummary(criteria);
      return {
        id: `debrief-${randomUUID().slice(0, 8)}`,
        interviewId: interview.id,
        candidate: interview.candidateName,
        generatedAt: now(),
        evidenceSummary: summary.evidence,
        coverage: summary.coverage,
        weightedAverage: summary.average,
        openCriteria: criteria.filter((criterion) => !Number.isFinite(criterion.score)).map((criterion) => criterion.label || criterion.id),
        recommendation: summary.coverage < 100 ? 'Needs evidence' : summary.average >= 4.2 ? 'Strong hire' : summary.average >= 3.2 ? 'Hire' : 'Mixed signal',
        requiresHumanApproval: true,
      };
    },
    modelRegistry: () => models,
    stageModel(id) {
      const model = models.find((item) => item.id === id);
      if (!model) throw new Error('Model version not found');
      model.status = 'staged'; model.updatedAt = now(); return model;
    },
    addArtifact,
    artifacts: (interviewId) => artifacts.get(interviewId) || [],
    enqueue,
    jobs: () => jobs,
    createWebhook({ url, eventTypes, owner }) {
      const webhook = { id: `wh-${randomUUID().slice(0, 8)}`, url, eventTypes, owner, status: 'active', signing: 'HMAC-SHA256 reference', createdAt: now(), deliveries: 0 };
      webhooks.push(webhook); return webhook;
    },
    webhooks: () => webhooks,
    validateSchema({ name, payload }) {
      const schema = schemas.get(name);
      if (!schema) return { valid: false, errors: [`Unknown schema: ${name}`] };
      const missing = schema.required.filter((key) => payload?.[key] === undefined || payload?.[key] === null || payload?.[key] === '');
      return { valid: missing.length === 0, schema, errors: missing.map((key) => `Missing required field: ${key}`) };
    },
    schemas: () => [...schemas.values()],
    recordTelemetry(payload) {
      const item = { id: `telemetry-${randomUUID().slice(0, 8)}`, ...payload, capturedAt: now() };
      telemetry.unshift(item); return item;
    },
    telemetry: () => telemetry,
    dataQuality() {
      const eventCount = events.list({ tenantId: 'northstar' }).length;
      return [
        { rule: 'Event tenant scope', status: 'pass', value: '100%', detail: 'All in-memory event envelopes include tenantId.' },
        { rule: 'Schema compatibility', status: 'pass', value: `${schemas.size} registered`, detail: 'Every demo topic declares required fields and compatibility.' },
        { rule: 'Event freshness', status: 'pass', value: eventCount ? '< 1 min' : 'No active event', detail: 'Local adapter evaluates freshness on ingestion.' },
        { rule: 'Consent propagation', status: 'pass', value: '100%', detail: 'Consent changes publish a dedicated contract event.' },
      ];
    },
    replay({ topic, fromOffset = 0 }) { return enqueue('event.replay', { topic, fromOffset }, { priority: 'high' }); },
    requestDeletion({ interviewId, reason = 'candidate-request' }) { return enqueue('privacy.deletion-orchestration', { interviewId, reason }, { priority: 'high' }); },
    dataCatalog: () => ({
      datasets: [
        { name: 'interview_events_silver', owner: 'Data Platform', classification: 'personal-data', lineage: 'Kafka → validation → consent filter → lakehouse' },
        { name: 'hiring_metrics_gold', owner: 'Talent Analytics', classification: 'aggregated', lineage: 'silver → semantic metrics → dashboards' },
        { name: 'interview_feature_store', owner: 'AI Systems', classification: 'restricted', lineage: 'approved silver fields → versioned feature definitions' },
      ],
      lineageVersion: '2026.08.20',
    }),
    flags: () => [...flags.values()],
    setFlag(id, enabled) {
      const flag = flags.get(id); if (!flag) throw new Error('Feature flag not found'); flag.enabled = Boolean(enabled); return flag;
    },
    workflows: () => workflows,
    requisitions: () => requisitions,
    analytics: () => ({
      funnel: [{ label: 'Scheduled', value: 48 }, { label: 'Completed', value: 42 }, { label: 'Debriefed', value: 37 }, { label: 'Decision-ready', value: 31 }],
      interviewerCalibration: 0.91,
      candidateExperienceNps: 72,
      timeToFeedbackHours: 18.4,
      dataAsOf: now(),
    }),
    slo: () => [
      { name: 'Room join success', objective: '99.9%', current: '99.92%', status: 'on_target', owner: 'Media SRE' },
      { name: 'Transcript freshness', objective: '< 3 sec', current: '1.8 sec', status: 'on_target', owner: 'AI Systems' },
      { name: 'Scorecard delivery', objective: '99.5%', current: '99.81%', status: 'on_target', owner: 'Platform' },
    ],
    incident({ title, severity, summary }) {
      const incident = { id: `inc-${randomUUID().slice(0, 8)}`, title, severity, summary, status: 'investigating', createdAt: now(), communications: ['Internal owner notified'] };
      incidents.unshift(incident); return incident;
    },
    incidents: () => incidents,
    securityPolicy: () => ({
      residency: { tenantId: 'northstar', allowedRegions: ['ap-southeast-1'], mediaProcessingRegion: 'Singapore' },
      envelopeEncryption: { algorithm: 'AES-256-GCM', keyReference: 'local-dev-kms/signalroom-artifact-key', productionRequirement: 'KMS/HSM-backed customer-approved key hierarchy' },
      apiProtection: { rateLimit: '120 requests per principal per minute', idempotencyRequired: true, validation: 'zod', headers: 'nosniff/frame deny/referrer no-referrer' },
    }),
    redact: (text) => ({ originalLength: String(text || '').length, redacted: redactPII(text), policy: 'demo-pii-redaction-v1' }),
    envelopeEncrypt,
  };
}
