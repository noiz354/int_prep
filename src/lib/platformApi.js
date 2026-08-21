import { featureCatalog } from '../data/features.js';
import { upcomingInterviews } from '../data/platformData.js';
import { foundationSnapshot } from '../data/foundationData.js';
import { completionOverview } from '../data/completionData.js';
import { clientEventBus } from './eventBus.js';
import { getDemoSession } from './session.js';

const wait = (ms = 180) => new Promise((resolve) => setTimeout(resolve, ms));
const storageKey = 'signalroom:scorecards';
const useApi = import.meta.env.VITE_USE_API === 'true';

async function apiRequest(path, options = {}) {
  const session = await getDemoSession();
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'X-Tenant-Id': 'northstar',
      ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `API request failed (${response.status})`);
  }
  return response.json();
}

/** Re-export for browser-safe API calls from other adapters (media, product). */
export const apiFetch = apiRequest;

function readScorecards() {
  try {
    return JSON.parse(localStorage.getItem(storageKey) || '{}');
  } catch {
    return {};
  }
}

const clone = (value) => structuredClone(value);
const localId = (prefix) => `${prefix}-${crypto.randomUUID().slice(0, 8)}`;

export const platformApi = {
  async getInterviews() {
    if (useApi) return (await apiRequest('/api/interviews')).data;
    await wait();
    return upcomingInterviews;
  },

  async getFeatures() {
    if (useApi) return (await apiRequest('/api/features')).data;
    await wait(80);
    return featureCatalog;
  },

  async saveScorecard(interviewId, scorecard) {
    if (useApi) {
      const data = await apiRequest(`/api/interviews/${interviewId}/scorecards`, {
        method: 'POST',
        headers: { 'Idempotency-Key': `scorecard-${interviewId}-${crypto.randomUUID()}` },
        body: JSON.stringify({ criteria: scorecard.criteria }),
      });
      return data.data;
    }
    await wait();
    const scorecards = readScorecards();
    scorecards[interviewId] = { ...scorecard, savedAt: new Date().toISOString() };
    localStorage.setItem(storageKey, JSON.stringify(scorecards));
    clientEventBus.publish('scorecard.submitted', { interviewId, completeness: scorecard.completeness });
    return scorecards[interviewId];
  },

  async captureConsent(interviewId, consent) {
    if (useApi) {
      return (await apiRequest(`/api/interviews/${interviewId}/consent`, {
        method: 'POST',
        headers: { 'Idempotency-Key': `consent-${interviewId}-${crypto.randomUUID()}` },
        body: JSON.stringify(consent),
      })).data;
    }
    await wait(120);
    return clientEventBus.publish('consent.updated', { interviewId, ...consent, recordedAt: new Date().toISOString() });
  },

  async getOrganization() {
    if (useApi) return (await apiRequest('/api/organization/current')).data;
    return { id: 'org-northstar', name: 'Northstar Systems', tenantId: 'northstar' };
  },

  async getAuditLedger() {
    if (useApi) return (await apiRequest('/api/audit')).data;
    return clientEventBus.events;
  },

  async getFoundationSnapshot() {
    if (!useApi) return clone(foundationSnapshot);
    const [workflows, requisitions, jobs, schemas, quality, catalog, flags, slo, analytics, security, models, webhooks] = await Promise.all([
      apiRequest('/api/workflows'), apiRequest('/api/requisitions'), apiRequest('/api/jobs'), apiRequest('/api/data/schemas'),
      apiRequest('/api/data/quality'), apiRequest('/api/data/catalog'), apiRequest('/api/feature-flags'), apiRequest('/api/operations/slo'),
      apiRequest('/api/analytics/overview'), apiRequest('/api/security/policy'), apiRequest('/api/ai/models'), apiRequest('/api/webhooks'),
    ]);
    return { workflows: workflows.data, requisitions: requisitions.data, jobs: jobs.data, schemas: schemas.data, quality: quality.data, catalog: catalog.data, flags: flags.data, slo: slo.data, analytics: analytics.data, security: security.data, models: models.data, webhooks: webhooks.data };
  },

  async getCompletionOverview() {
    if (useApi) return (await apiRequest('/api/completion')).data;
    return clone(completionOverview);
  },

  async runCompletionAction(domain, action, payload = {}) {
    if (useApi) return (await apiRequest(`/api/completion/${domain}/${action}`, { method: 'POST', headers: { 'Idempotency-Key': `completion-${domain}-${action}-${crypto.randomUUID()}` }, body: JSON.stringify({ payload }) })).data;
    await wait(120);
    const feature = completionOverview.domains.find((item) => item.id === domain)?.features.find((item) => item.action === action);
    return { id: localId('action'), domain, action, featureId: feature?.id, featureTitle: feature?.title, status: 'completed_local_adapter', requiresHumanReview: domain === 'ai-advanced' || action === 'open-ai-appeal', result: { providerState: 'adapter-ready', action, payload, completedAt: new Date().toISOString() } };
  },

  async transitionInterview(interviewId, status) {
    if (useApi) return (await apiRequest(`/api/interviews/${interviewId}/transition`, { method: 'POST', headers: { 'Idempotency-Key': `transition-${interviewId}-${crypto.randomUUID()}` }, body: JSON.stringify({ status }) })).data;
    await wait(100); return { id: interviewId, status, lifecycle: [{ to: status, at: new Date().toISOString() }] };
  },

  async addArtifact(interviewId, artifact) {
    if (useApi) return (await apiRequest(`/api/interviews/${interviewId}/artifacts`, { method: 'POST', headers: { 'Idempotency-Key': `artifact-${interviewId}-${crypto.randomUUID()}` }, body: JSON.stringify(artifact) })).data;
    await wait(100); return { artifact: { id: localId('artifact'), interviewId, ...artifact, encrypted: true, status: 'ready' }, job: { id: localId('job'), kind: 'artifact.process', status: 'queued' } };
  },

  async suggestFollowUp(payload) {
    if (useApi) return (await apiRequest('/api/ai/follow-up', { method: 'POST', headers: { 'Idempotency-Key': `followup-${crypto.randomUUID()}` }, body: JSON.stringify(payload) })).data;
    await wait(100); return { question: 'How would you reconcile a local edit with a newer remote edit without silently losing intent?', competency: 'Systems thinking', rubricId: 'rubric-frontend-v6', sourceVersion: '6.0', confidence: .84, requiresHumanJudgment: true, evidence: ['approved rubric', 'current transcript'] };
  },

  async evaluateCode(payload) {
    if (useApi) return (await apiRequest('/api/ai/code-evaluation', { method: 'POST', headers: { 'Idempotency-Key': `code-eval-${crypto.randomUUID()}` }, body: JSON.stringify(payload) })).data;
    await wait(150); const passed = /function|=>/.test(payload.code) ? 3 : 1; return { language: payload.language, executionMode: 'static-heuristic-local-adapter', score: passed * 25, checks: [{ label: 'Defines a callable function', passed: passed > 1 }, { label: 'Addresses repeat-safe updates', passed: /map|set|idempot/i.test(payload.code) }, { label: 'Handles an edge case', passed: /if|\?\?/.test(payload.code) }, { label: 'Avoids debug output', passed: !/console\.log/.test(payload.code) }], notes: ['Candidate code is not executed in the local adapter.'] };
  },

  async generateDebrief(interviewId) {
    if (useApi) return (await apiRequest(`/api/interviews/${interviewId}/debrief`, { method: 'POST', headers: { 'Idempotency-Key': `debrief-${interviewId}-${crypto.randomUUID()}` }, body: JSON.stringify({}) })).data;
    await wait(120); return { debrief: { id: localId('debrief'), interviewId, candidate: 'Alex Morgan', coverage: 75, weightedAverage: 3.8, recommendation: 'Needs evidence', requiresHumanApproval: true, openCriteria: ['Accessibility mindset'] }, job: { id: localId('job'), kind: 'debrief.review', status: 'queued' } };
  },

  async setFeatureFlag(id, enabled) {
    if (useApi) return (await apiRequest(`/api/feature-flags/${id}`, { method: 'POST', headers: { 'Idempotency-Key': `flag-${id}-${crypto.randomUUID()}` }, body: JSON.stringify({ enabled }) })).data;
    await wait(80); return { id, enabled };
  },

  async requestReplay(topic) {
    if (useApi) return (await apiRequest('/api/data/replay', { method: 'POST', headers: { 'Idempotency-Key': `replay-${crypto.randomUUID()}` }, body: JSON.stringify({ topic }) })).data;
    await wait(80); return { id: localId('job'), kind: 'event.replay', status: 'queued', payload: { topic } };
  },

  async requestDeletion(interviewId) {
    if (useApi) return (await apiRequest('/api/data/deletion', { method: 'POST', headers: { 'Idempotency-Key': `deletion-${crypto.randomUUID()}` }, body: JSON.stringify({ interviewId }) })).data;
    await wait(80); return { id: localId('job'), kind: 'privacy.deletion-orchestration', status: 'queued', payload: { interviewId } };
  },

  async createIncident(payload) {
    if (useApi) return (await apiRequest('/api/operations/incidents', { method: 'POST', headers: { 'Idempotency-Key': `incident-${crypto.randomUUID()}` }, body: JSON.stringify(payload) })).data;
    await wait(80); return { id: localId('inc'), ...payload, status: 'investigating', createdAt: new Date().toISOString() };
  },

  async redactText(text) {
    if (useApi) return (await apiRequest('/api/privacy/redact', { method: 'POST', body: JSON.stringify({ text }) })).data;
    await wait(60); return { originalLength: text.length, redacted: text.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[REDACTED_EMAIL]').replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[REDACTED_PHONE]'), policy: 'demo-pii-redaction-v1' };
  },

  async createWebhook(payload) {
    if (useApi) return (await apiRequest('/api/webhooks', { method: 'POST', headers: { 'Idempotency-Key': `webhook-${crypto.randomUUID()}` }, body: JSON.stringify(payload) })).data;
    await wait(80); return { id: localId('wh'), ...payload, status: 'active', signing: 'HMAC-SHA256 reference', createdAt: new Date().toISOString() };
  },

  async postRoomAction(interviewId, action, metadata = {}) {
    await wait(100);
    return clientEventBus.publish(`interview.room.${action}`, { interviewId, ...metadata });
  },
};
