export const foundationSnapshot = {
  workflows: [
    { id: 'workflow-standard-engineering', name: 'Standard engineering loop', stages: ['screen', 'technical', 'systems', 'debrief', 'decision'], requiredEvidence: ['scorecard', 'independent-feedback'], active: true },
    { id: 'workflow-data-leadership', name: 'Data leadership loop', stages: ['screen', 'leadership', 'data-case', 'debrief', 'decision'], requiredEvidence: ['scorecard', 'calibration'], active: true },
  ],
  requisitions: [
    { id: 'req-frontend-2026', title: 'Senior Frontend Engineer', department: 'Product & Engineering', workflowId: 'workflow-standard-engineering', openings: 2, status: 'active', rubricId: 'rubric-frontend-v6' },
    { id: 'req-data-2026', title: 'Data Platform Manager', department: 'Data', workflowId: 'workflow-data-leadership', openings: 1, status: 'active', rubricId: 'rubric-data-v4' },
  ],
  jobs: [
    { id: 'job-93f1a', kind: 'transcript.enrichment', tenantId: 'northstar', priority: 'normal', status: 'queued', createdAt: '2026-08-20T02:44:00.000Z', attempts: 0 },
    { id: 'job-15bc9', kind: 'artifact.process', tenantId: 'northstar', priority: 'high', status: 'queued', createdAt: '2026-08-20T02:43:00.000Z', attempts: 0 },
  ],
  schemas: [
    { name: 'interview.lifecycle.v1', version: '1.0', owner: 'Platform', required: ['tenantId', 'interviewId', 'status'], compatibility: 'backward' },
    { name: 'media.telemetry.v2', version: '2.0', owner: 'Media SRE', required: ['tenantId', 'interviewId', 'latencyMs', 'packetLoss'], compatibility: 'backward' },
    { name: 'ai.recommendations.v1', version: '1.0', owner: 'AI Systems', required: ['tenantId', 'interviewId', 'recommendationType', 'modelVersion'], compatibility: 'backward' },
    { name: 'consent.policy.v1', version: '1.0', owner: 'Trust', required: ['tenantId', 'interviewId', 'consentId'], compatibility: 'full' },
  ],
  quality: [
    { rule: 'Event tenant scope', status: 'pass', value: '100%', detail: 'All local event envelopes include tenantId.' },
    { rule: 'Schema compatibility', status: 'pass', value: '4 registered', detail: 'Every topic declares required fields and compatibility.' },
    { rule: 'Event freshness', status: 'pass', value: '< 1 min', detail: 'Adapter evaluates freshness on ingestion.' },
    { rule: 'Consent propagation', status: 'pass', value: '100%', detail: 'Consent changes publish a dedicated event.' },
  ],
  catalog: {
    datasets: [
      { name: 'interview_events_silver', owner: 'Data Platform', classification: 'personal-data', lineage: 'Kafka → validation → consent filter → lakehouse' },
      { name: 'hiring_metrics_gold', owner: 'Talent Analytics', classification: 'aggregated', lineage: 'silver → semantic metrics → dashboards' },
      { name: 'interview_feature_store', owner: 'AI Systems', classification: 'restricted', lineage: 'approved silver fields → versioned feature definitions' },
    ],
    lineageVersion: '2026.08.20',
  },
  flags: [
    { id: 'candidate-device-preflight', enabled: true, scope: 'tenant:northstar', owner: 'Experience' },
    { id: 'copilot-grounded-followups', enabled: true, scope: 'tenant:northstar', owner: 'AI Systems' },
    { id: 'realtime-presence-v2', enabled: false, scope: 'tenant:northstar', owner: 'Platform' },
    { id: 'integrity-review-beta', enabled: false, scope: 'role:privacy_admin', owner: 'Trust' },
  ],
  slo: [
    { name: 'Room join success', objective: '99.9%', current: '99.92%', status: 'on_target', owner: 'Media SRE' },
    { name: 'Transcript freshness', objective: '< 3 sec', current: '1.8 sec', status: 'on_target', owner: 'AI Systems' },
    { name: 'Scorecard delivery', objective: '99.5%', current: '99.81%', status: 'on_target', owner: 'Platform' },
  ],
  analytics: {
    funnel: [{ label: 'Scheduled', value: 48 }, { label: 'Completed', value: 42 }, { label: 'Debriefed', value: 37 }, { label: 'Decision-ready', value: 31 }],
    interviewerCalibration: 0.91,
    candidateExperienceNps: 72,
    timeToFeedbackHours: 18.4,
  },
  security: {
    residency: { tenantId: 'northstar', allowedRegions: ['ap-southeast-1'], mediaProcessingRegion: 'Singapore' },
    envelopeEncryption: { algorithm: 'AES-256-GCM', keyReference: 'local-dev-kms/signalroom-artifact-key', productionRequirement: 'KMS/HSM-backed customer-approved key hierarchy' },
    apiProtection: { rateLimit: '120 requests per principal per minute', idempotencyRequired: true, validation: 'zod', headers: 'nosniff/frame deny/referrer no-referrer' },
  },
  models: [
    { id: 'signal-reasoner-4.2', name: 'Signal Reasoner', version: '4.2', status: 'active', promptSet: 'interview-copilot-v12', retrievalCollection: 'northstar-rubrics-v6', approvedBy: 'Trust Admin' },
    { id: 'signal-reasoner-4.3', name: 'Signal Reasoner', version: '4.3', status: 'staged', promptSet: 'interview-copilot-v13', retrievalCollection: 'northstar-rubrics-v6', approvedBy: null },
  ],
};
