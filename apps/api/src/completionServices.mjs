import { createHash, randomUUID } from 'node:crypto';

const now = () => new Date().toISOString();
const identifier = (prefix) => `${prefix}-${randomUUID().slice(0, 8)}`;

const domains = [
  {
    id: 'ai-advanced', label: 'AI automation & safeguards', icon: 'sparkles', permission: 'ai:use',
    features: [
      ['AI-02', 'AI interviewer agent', 'simulate-interviewer'],
      ['AI-05', 'Resume and portfolio intelligence', 'parse-resume'],
      ['AI-08', 'Communication and behavioral signal analysis', 'analyze-behavior'],
      ['AI-09', 'Sentiment and engagement trend detection', 'analyze-engagement'],
      ['AI-11', 'Technical answer verification', 'verify-claim'],
      ['AI-12', 'Interview integrity anomaly detection', 'review-integrity'],
      ['AI-13', 'Inclusive-language and interviewer-bias coach', 'coach-language'],
    ],
  },
  {
    id: 'data-platform', label: 'Data platform & recovery', icon: 'database', permission: 'data:operate',
    features: [
      ['DE-04', 'Change data capture from operational systems', 'run-cdc-sync'],
      ['DE-06', 'Lakehouse ingestion zones', 'initialize-lakehouse'],
      ['DE-07', 'Secure media and artifact ingestion', 'ingest-artifact'],
      ['DE-08', 'Orchestrated ETL/ELT pipelines', 'run-etl-pipeline'],
      ['DE-11', 'Online/offline AI feature store', 'refresh-feature-store'],
      ['DE-14', 'Backup, disaster recovery, and auditability', 'run-backup-restore'],
      ['DE-15', 'Semantic analytics and workforce insights layer', 'publish-semantic-metrics'],
    ],
  },
  {
    id: 'media-experience', label: 'Media & candidate experience', icon: 'video', permission: 'interview:room:join',
    features: [
      ['FE-01', 'Resilient WebRTC interview room', 'provision-media-session'],
      ['FE-04', 'Responsive multi-participant video layout', 'save-layout-preference'],
      ['FE-07', 'Screen sharing and collaborative whiteboard', 'create-whiteboard-session'],
      ['FE-10', 'Audio/video enhancement controls', 'apply-media-enhancement'],
      ['FE-13', 'Enterprise theming, localization, and time zones', 'save-experience-preference'],
    ],
  },
  {
    id: 'platform-operations', label: 'Scheduling & platform workflow', icon: 'calendar', permission: 'workflow:write',
    features: [
      ['BE-03', 'Availability and scheduling engine', 'suggest-schedule'],
      ['BE-04', 'Calendar synchronization service', 'sync-calendar'],
      ['BE-05', 'Secure interview invitation service', 'issue-invitation'],
      ['BE-07', 'Media-session orchestration', 'orchestrate-media'],
      ['BE-12', 'Unified search and retrieval service', 'run-unified-search'],
      ['BE-13', 'Notification preference and escalation engine', 'create-notification-route'],
    ],
  },
  {
    id: 'trust-risk', label: 'Trust, compliance & risk', icon: 'shield', permission: 'security:read',
    features: [
      ['SC-03', 'Strong authentication and step-up verification', 'create-step-up-challenge'],
      ['SC-09', 'Data loss prevention controls', 'run-dlp-scan'],
      ['SC-10', 'Secure media access and forensic watermarking', 'issue-media-access'],
      ['SC-12', 'Secrets and credential governance', 'plan-secret-rotation'],
      ['SC-13', 'Compliance evidence center', 'assemble-evidence-bundle'],
      ['SC-14', 'Fairness, AI risk, and appeal governance', 'open-ai-appeal'],
    ],
  },
  {
    id: 'delivery-sre', label: 'Delivery & reliability engineering', icon: 'activity', permission: 'operations:write',
    features: [
      ['DO-01', 'Infrastructure as code and environment parity', 'generate-iac-plan'],
      ['DO-02', 'Container orchestration and elastic scaling', 'evaluate-autoscale-policy'],
      ['DO-03', 'Global media edge and failover routing', 'simulate-edge-failover'],
      ['DO-04', 'Continuous integration and delivery', 'create-release-pipeline'],
      ['DO-06', 'End-to-end quality automation', 'run-quality-matrix'],
      ['DO-09', 'Synthetic monitoring and real-user monitoring', 'run-synthetic-journey'],
      ['DO-10', 'Capacity forecasting and cost intelligence', 'forecast-capacity'],
      ['DO-11', 'Disaster recovery and resilience exercises', 'run-resilience-drill'],
      ['DO-12', 'Secure software supply chain', 'generate-supply-chain-report'],
      ['DO-13', 'Model and pipeline deployment operations', 'stage-model-pipeline'],
    ],
  },
  {
    id: 'enterprise-ecosystem', label: 'Enterprise ecosystem', icon: 'plug', permission: 'workflow:write',
    features: [
      ['EO-02', 'Interviewer capability and certification directory', 'query-interviewer-directory'],
      ['EO-05', 'Applicant tracking system connectors', 'configure-ats-connector'],
      ['EO-06', 'HRIS, directory, and identity integrations', 'configure-hris-connector'],
      ['EO-07', 'Communications ecosystem integrations', 'configure-communications'],
      ['EO-08', 'Integration marketplace and workflow automation', 'create-marketplace-workflow'],
      ['EO-10', 'Tenant administration command center', 'review-tenant-admin'],
      ['EO-11', 'White-label and regional deployment controls', 'save-brand-region-policy'],
      ['EO-12', 'Usage metering, quotas, and billing operations', 'generate-usage-meter'],
      ['EO-13', 'Customer support, export, and migration toolkit', 'prepare-support-export'],
    ],
  },
];

const domainById = new Map(domains.map((domain) => [domain.id, domain]));
const featureByAction = new Map(domains.flatMap((domain) => domain.features.map(([id, title, action]) => [`${domain.id}:${action}`, { id, title, action, domainId: domain.id }])));

function sanitizeDomain(domain) {
  return { id: domain.id, label: domain.label, icon: domain.icon, features: domain.features.map(([id, title, action]) => ({ id, title, action, status: 'adapter-ready' })) };
}

function textSignals(text = '') {
  const normalized = String(text).trim();
  const words = normalized ? normalized.split(/\s+/) : [];
  return { words: words.length, questions: (normalized.match(/\?/g) || []).length, sentences: (normalized.match(/[.!?]/g) || []).length };
}

export function createCompletionServices({ platform }) {
  const records = [];
  const connectorConfigs = [];
  const preferenceState = new Map();

  function actionRecord(domain, action, result, { requiresHumanReview = false, job = null } = {}) {
    const feature = featureByAction.get(`${domain}:${action}`);
    const record = {
      id: identifier('action'), domain, action, featureId: feature?.id, featureTitle: feature?.title,
      status: 'completed_local_adapter', requiresHumanReview, result, job, createdAt: now(),
    };
    records.unshift(record);
    return record;
  }

  function requireAction(domainId, action) {
    const domain = domainById.get(domainId);
    if (!domain) throw new Error('Unknown completion domain');
    const feature = featureByAction.get(`${domainId}:${action}`);
    if (!feature) throw new Error('Unknown completion action');
    return { domain, feature };
  }

  return {
    overview() {
      return { domains: domains.map(sanitizeDomain), activity: records.slice(0, 12), connectorConfigs: connectorConfigs.slice(0, 12), preferences: [...preferenceState.values()] };
    },

    permissionFor(domainId) { return domainById.get(domainId)?.permission || null; },

    run(domainId, action, payload = {}) {
      const { feature } = requireAction(domainId, action);
      const transcript = payload.text || payload.transcript || 'The candidate described a resilient, collaborative system design.';
      let result;
      let requiresHumanReview = false;
      let job = null;

      switch (`${domainId}:${action}`) {
        case 'ai-advanced:simulate-interviewer':
          result = { planId: identifier('plan'), questions: ['Describe the problem context.', 'What trade-off did you make?', 'How did you evaluate accessibility and reliability?'], timeboxMinutes: 45, takeoverAvailable: true, policy: 'approved-rubric-only' };
          requiresHumanReview = true; break;
        case 'ai-advanced:parse-resume':
          result = { profileId: identifier('profile'), extracted: ['Frontend platform migration', 'Design system leadership', 'Accessibility ownership'], maskedFields: ['email', 'phone'], validationPrompts: ['Which migration outcome can the candidate quantify?'] };
          requiresHumanReview = true; break;
        case 'ai-advanced:analyze-behavior':
          result = { signals: { clarity: 'high', structure: 'high', collaborationEvidence: 'present' }, exclusions: ['protected-trait inference', 'automated disposition'], source: 'candidate-provided interview text' };
          requiresHumanReview = true; break;
        case 'ai-advanced:analyze-engagement':
          result = { trend: 'steady', confidence: 0.61, signalUse: 'advisory only', inputStats: textSignals(transcript) };
          requiresHumanReview = true; break;
        case 'ai-advanced:verify-claim':
          result = { claim: payload.claim || 'Offline edits use idempotency keys.', verification: 'requires approved knowledge-source review', suggestedQuestion: 'What makes the write idempotent across retry boundaries?', confidence: 0.72 };
          requiresHumanReview = true; break;
        case 'ai-advanced:review-integrity':
          result = { risk: 'low', action: 'No automatic outcome; trained reviewer only if escalation policy triggers.', consentRequired: true, detectedSignals: ['No simulated anomaly'] };
          requiresHumanReview = true; break;
        case 'ai-advanced:coach-language':
          result = { finding: 'No prohibited language found in demo prompt.', alternative: 'Could you describe the specific behavior and impact?', scope: 'private interviewer coaching' };
          requiresHumanReview = true; break;

        case 'data-platform:run-cdc-sync':
          job = platform.enqueue('cdc.capture', { source: 'mongo-operational', collection: 'interviews', checkpoint: payload.checkpoint || 'resume-token-demo' });
          result = { source: 'MongoDB operational adapter', mode: 'change-stream-compatible', checkpoint: job.payload.checkpoint }; break;
        case 'data-platform:initialize-lakehouse':
          result = { zones: ['bronze/raw immutable', 'silver/validated consent-aware', 'gold/semantic metrics'], storage: 'provider-config-required', lineage: 'event → validation → zone transform' }; break;
        case 'data-platform:ingest-artifact':
          job = platform.enqueue('media.secure-ingestion', { reference: payload.reference || 'vault://northstar/demo-artifact', scan: 'malware + hash + retention tags' }, { priority: 'high' });
          result = { artifactReference: job.payload.reference, encryption: 'required', metadataOnly: true }; break;
        case 'data-platform:run-etl-pipeline':
          job = platform.enqueue('etl.transcript-enrichment', { pipeline: 'transcript-to-score-evidence', retryPolicy: 'exponential-backoff' });
          result = { pipeline: job.payload.pipeline, orchestration: 'event-triggered + scheduled backfill' }; break;
        case 'data-platform:refresh-feature-store':
          result = { offlineStore: 'versioned training features', onlineStore: 'low-latency interview context', skewCheck: 'enabled' }; break;
        case 'data-platform:run-backup-restore':
          job = platform.enqueue('dr.restore-validation', { recoveryPoint: 'latest-encrypted-snapshot', target: 'isolated-validation-environment' }, { priority: 'high' });
          result = { rpo: '15 minutes target', rto: '8 minutes target', immutableAuditExport: true }; break;
        case 'data-platform:publish-semantic-metrics':
          result = { metrics: ['funnel conversion', 'time to feedback', 'candidate NPS', 'interviewer calibration'], access: 'tenant-scoped semantic layer' }; break;

        case 'media-experience:provision-media-session':
          result = { providerState: 'adapter-ready', sfU: 'provider selection required', fallback: ['adaptive bitrate', 'TURN', 'audio-only'], admission: 'role-scoped lobby' }; break;
        case 'media-experience:save-layout-preference':
          preferenceState.set('video-layout', { key: 'video-layout', value: payload.layout || 'active-speaker', savedAt: now() });
          result = preferenceState.get('video-layout'); break;
        case 'media-experience:create-whiteboard-session':
          result = { whiteboardId: identifier('whiteboard'), permissions: ['host-control', 'participant-annotate'], export: 'policy-controlled', screenShare: 'user-gesture-required' }; break;
        case 'media-experience:apply-media-enhancement':
          preferenceState.set('media-enhancement', { key: 'media-enhancement', value: { blur: true, noiseSuppression: true, echoCancellation: true }, savedAt: now() });
          result = preferenceState.get('media-enhancement'); break;
        case 'media-experience:save-experience-preference':
          preferenceState.set('experience', { key: 'experience', value: { locale: payload.locale || 'en-ID', theme: payload.theme || 'system', timeZone: payload.timeZone || 'Asia/Jakarta' }, savedAt: now() });
          result = preferenceState.get('experience'); break;

        case 'platform-operations:suggest-schedule':
          result = { suggestions: [{ start: '2026-08-21T09:30:00+07:00', panel: ['Maya Patel', 'Jordan Nguyen'], rationale: 'matches competency, timezone, and buffer policy' }, { start: '2026-08-21T14:00:00+07:00', panel: ['Maya Patel', 'Rafael Kim'], rationale: 'second best availability' }], conflictCheck: 'passed' }; break;
        case 'platform-operations:sync-calendar':
          job = platform.enqueue('calendar.sync', { provider: payload.provider || 'Google Workspace', direction: 'two-way', conflictPolicy: 'source-of-truth-resolve' });
          result = { provider: job.payload.provider, status: 'queued', updateHandling: ['reschedule', 'cancel', 'timezone'] }; break;
        case 'platform-operations:issue-invitation':
          result = { invitationId: identifier('invite'), delivery: 'email template + expiring authenticated link', expiry: '24 hours', singleUse: true, localization: 'candidate locale' }; break;
        case 'platform-operations:orchestrate-media':
          result = { roomId: identifier('room'), policy: ['region-aware routing', 'TURN credentials', 'recording policy', 'role permissions'], providerState: 'adapter-ready' }; break;
        case 'platform-operations:run-unified-search':
          result = { query: payload.query || 'Alex Morgan', results: [{ type: 'candidate', label: 'Alex Morgan', access: 'authorized' }, { type: 'interview', label: 'int-2048 · Technical deep dive', access: 'authorized' }], policy: 'permission-filtered retrieval' }; break;
        case 'platform-operations:create-notification-route':
          result = { routeId: identifier('notify'), channels: ['email', 'in-app'], quietHours: 'respected', escalation: 'owner after 15 minutes', consentAware: true }; break;

        case 'trust-risk:create-step-up-challenge':
          result = { challengeId: identifier('mfa'), allowedMethods: ['passkey', 'TOTP'], purpose: payload.purpose || 'recording export', expiresInSeconds: 300, providerState: 'identity-provider-required' }; break;
        case 'trust-risk:run-dlp-scan':
          result = { scanId: identifier('dlp'), findings: [{ category: 'email', action: 'mask in export preview' }], downloadPolicy: 'authorization + watermark required' }; break;
        case 'trust-risk:issue-media-access':
          result = { accessTokenReference: identifier('media-token'), ttlSeconds: 300, download: false, watermark: `forensic:${payload.viewer || 'authorized-viewer'}`, audit: 'playback event required' }; break;
        case 'trust-risk:plan-secret-rotation':
          job = platform.enqueue('secret.rotation', { secretClass: payload.secretClass || 'TURN credential', rotationWindow: '30 days', vault: 'managed-vault-required' }, { priority: 'high' });
          result = { policy: 'least privilege', jobId: job.id, secretExposure: 'never returned to client' }; break;
        case 'trust-risk:assemble-evidence-bundle':
          result = { bundleId: identifier('evidence'), frameworks: ['SOC 2', 'ISO 27001', 'GDPR'], controls: 14, ownerAssignments: true, export: 'auditor-scoped' }; break;
        case 'trust-risk:open-ai-appeal':
          result = { appealId: identifier('appeal'), status: 'human-review-required', reason: payload.reason || 'Request review of AI-assisted evidence interpretation', fairnessMonitoring: 'enabled' }; requiresHumanReview = true; break;

        case 'delivery-sre:generate-iac-plan':
          result = { planId: identifier('iac'), modules: ['network', 'IAM', 'API', 'event adapter', 'media provider boundary', 'monitoring'], environmentParity: ['dev', 'staging', 'production'], reviewRequired: true }; break;
        case 'delivery-sre:evaluate-autoscale-policy':
          result = { workloads: [{ name: 'api', policy: 'CPU + request rate' }, { name: 'workers', policy: 'queue depth' }, { name: 'AI', policy: 'latency + GPU budget' }], disruptionBudget: 'configured before production' }; break;
        case 'delivery-sre:simulate-edge-failover':
          result = { scenarioId: identifier('failover'), route: 'Jakarta → Singapore edge', expectedReconnectSeconds: 8, residencyCheck: 'pass', liveInterviewImpact: 'simulation only' }; break;
        case 'delivery-sre:create-release-pipeline':
          result = { pipelineId: identifier('release'), stages: ['lint', 'unit', 'contract', 'accessibility', 'build', 'signed artifact', 'canary', 'rollback'], approvalGate: 'release manager' }; break;
        case 'delivery-sre:run-quality-matrix':
          result = { suites: ['browser', 'WebRTC compatibility', 'accessibility', 'API contract', 'load', 'chaos'], status: 'local matrix registered', providerBrowsers: 'CI configuration required' }; break;
        case 'delivery-sre:run-synthetic-journey':
          result = { journeyId: identifier('synthetic'), steps: ['login', 'schedule', 'room join', 'scorecard', 'integration'], regions: ['ap-southeast-1'], result: 'simulated healthy' }; break;
        case 'delivery-sre:forecast-capacity':
          result = { forecast: { concurrentRooms: 120, eventThroughputPerMinute: 26000, aiMinutes: 6800 }, costAttribution: 'tenant-tagged', anomalyThreshold: '20% week-over-week' }; break;
        case 'delivery-sre:run-resilience-drill':
          result = { drillId: identifier('drill'), exercises: ['backup restore', 'Kafka replay', 'media failover'], status: 'planned-safe-drill', correctiveActionTracking: true }; break;
        case 'delivery-sre:generate-supply-chain-report':
          result = { sbom: 'generated-at-build', signedArtifacts: true, dependencyScan: 'run npm audit in CI', exceptions: [] }; break;
        case 'delivery-sre:stage-model-pipeline':
          result = { deploymentId: identifier('model'), stages: ['offline validation', 'staging shadow', 'human approval', 'canary'], rollback: 'model + prompt + retrieval index versioned' }; break;

        case 'enterprise-ecosystem:query-interviewer-directory':
          result = { interviewers: [{ name: 'Maya Patel', skills: ['frontend', 'accessibility'], certified: true, capacity: '3 this week' }, { name: 'Jordan Nguyen', skills: ['systems', 'reliability'], certified: true, capacity: '2 this week' }], conflictPolicy: 'enforced before assignment' }; break;
        case 'enterprise-ecosystem:configure-ats-connector':
          connectorConfigs.push({ id: identifier('connector'), type: 'ATS', provider: payload.provider || 'Greenhouse', status: 'mapping_required', createdAt: now() });
          result = connectorConfigs.at(-1); break;
        case 'enterprise-ecosystem:configure-hris-connector':
          connectorConfigs.push({ id: identifier('connector'), type: 'HRIS', provider: payload.provider || 'Workday', status: 'mapping_required', createdAt: now() });
          result = connectorConfigs.at(-1); break;
        case 'enterprise-ecosystem:configure-communications':
          connectorConfigs.push({ id: identifier('connector'), type: 'communications', provider: payload.provider || 'Slack', status: 'ready_for_oauth', createdAt: now() });
          result = connectorConfigs.at(-1); break;
        case 'enterprise-ecosystem:create-marketplace-workflow':
          result = { workflowId: identifier('automation'), trigger: 'interview.completed', actions: ['create feedback request', 'post secure notification'], sandbox: 'tenant-scoped' }; break;
        case 'enterprise-ecosystem:review-tenant-admin':
          result = { sections: ['users', 'roles', 'domains', 'consent', 'residency', 'integrations', 'audit'], supportImpersonation: 'privacy-safe + audited' }; break;
        case 'enterprise-ecosystem:save-brand-region-policy':
          result = { brand: payload.brand || 'Northstar Systems', customDomain: 'pending DNS verification', region: payload.region || 'ap-southeast-1', legalTextVersion: 'candidate-notice-2026.08' }; break;
        case 'enterprise-ecosystem:generate-usage-meter':
          result = { usage: { seats: 48, interviewMinutes: 6820, recordingGB: 114, aiMinutes: 2180 }, quotas: 'enforced at tenant policy layer', billingExport: 'ready_for_finance_connector' }; break;
        case 'enterprise-ecosystem:prepare-support-export':
          job = platform.enqueue('tenant.support-export', { scope: payload.scope || 'diagnostic-bundle', redaction: 'policy-controlled', migration: 'approved workflow only' }, { priority: 'high' });
          result = { jobId: job.id, supportImpersonation: 'time-bound + audited', export: 'tenant-authorized only' }; break;
        default:
          throw new Error('Action implementation is unavailable');
      }

      return actionRecord(domainId, action, result, { requiresHumanReview, job });
    },

    recentActivity() { return records.slice(0, 50); },
  };
}
