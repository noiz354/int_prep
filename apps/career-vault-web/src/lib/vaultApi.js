const useRemote = import.meta.env.VITE_USE_API === 'true' || import.meta.env.VITE_VAULT_API_MODE === 'remote';
const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));
const sessionKey = 'signalroom:api-session:v1';

export const isRemote = () => useRemote;

export function readSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
    if (!session?.accessToken || Date.now() >= session.expiresAt) return null;
    return session;
  } catch {
    return null;
  }
}

export async function loginDemo(email) {
  const response = await fetch('/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Demo login failed');
  const session = {
    accessToken: body.data.accessToken,
    principal: body.data.principal,
    expiresAt: Date.now() + (body.data.expiresInSeconds * 1000) - 30_000,
  };
  sessionStorage.setItem(sessionKey, JSON.stringify(session));
  return session;
}

function headers() {
  const session = readSession();
  return {
    'Content-Type': 'application/json',
    ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {
      'X-Tenant-Id': 'northstar',
      'X-Actor-Id': 'usr-alex',
      'X-Actor-Role': 'candidate',
    }),
    'Idempotency-Key': `cv-${crypto.randomUUID()}`,
  };
}

async function request(path, body, method = 'POST') {
  const response = await fetch(path, { method, headers: headers(), body: method === 'GET' ? undefined : JSON.stringify(body || {}) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Career Vault service is unavailable.');
  return payload.data;
}

export async function getDashboard() {
  if (useRemote) return request('/v1/dashboard', undefined, 'GET');
  await wait();
  return { opportunities: [], artifacts: [], timeline: [], actionInbox: [], opportunityCount: 0, artifactCount: 0, timelineCount: 0 };
}

export async function createOpportunity(payload) {
  if (useRemote) return request('/v1/opportunities', payload);
  await wait();
  return { id: `opp-${crypto.randomUUID().slice(0, 8)}`, ...payload, status: 'saved', verifiedSource: false };
}

export async function addArtifact(payload) {
  if (useRemote) return request('/v1/artifacts', payload);
  await wait();
  if (['audio', 'video'].includes(payload.kind) && !payload.consent?.recording) throw new Error('Recording consent and participant-rights confirmation are required before storing audio/video.');
  if (payload.kind === 'transcript' && !payload.consent?.transcript) throw new Error('Transcript consent is required before storing a transcript.');
  return { id: `art-${crypto.randomUUID().slice(0, 8)}`, ...payload, date: new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString() };
}

export async function excludeArtifact(artifactId) {
  if (useRemote) return request(`/v1/artifacts/${artifactId}/exclude`, {});
  await wait();
  return { id: artifactId, excludeFromRetrieval: true };
}

export async function askRag(payload) {
  if (useRemote) return request('/v1/rag/ask', payload);
  await wait(80);
  if (payload.sessionContext === 'live_assessment' || payload.session_context === 'live_assessment') {
    throw new Error('Career Vault and RAG planning tools are not available during a live hiring assessment.');
  }
  return { answer: null, abstention: true, reason: 'insufficient_permitted_evidence', message: 'There is not enough candidate-authorized evidence to answer that.', citations: [], suggestedNextAction: 'Add candidate-owned feedback/notes.', confidence: 0, provider: 'deterministic-fallback' };
}

export async function requestExport(payload) {
  if (useRemote) return request('/v1/data-export', payload);
  await wait();
  return { exportScope: 'candidate_owned_timeline_and_artifacts_only', queued: true };
}

export async function requestDeletion(payload) {
  if (useRemote) return request('/v1/data-deletion', payload);
  await wait();
  return { deletedEntities: 0, propagated: true };
}

export async function importEmail(payload) {
  if (useRemote) return request('/v1/email/import', payload);
  await wait();
  return { id: `import-${crypto.randomUUID().slice(0, 8)}`, ...payload, status: 'awaiting_review', parsed: { role: 'Imported role', company: 'Northwind Labs' }, reviewBeforeSave: true };
}

export async function reviewImport(payload) {
  if (useRemote) return request(`/v1/email/imports/${payload.importId}/review`, payload);
  await wait();
  return { id: payload.importId, status: payload.decision === 'reject' ? 'rejected' : 'approved' };
}

export async function registerConnector(payload) {
  if (useRemote) return request('/v1/connectors', payload);
  await wait();
  return { id: `connector-${crypto.randomUUID().slice(0, 8)}`, ...payload, status: 'candidate_approved_review_before_import' };
}

export async function createShare(payload) {
  if (useRemote) return request('/v1/shares', payload);
  await wait();
  return { id: `share-${crypto.randomUUID().slice(0, 8)}`, ...payload };
}

export async function listProviders() {
  if (useRemote) return request('/v1/providers', undefined, 'GET');
  await wait();
  return [
    { id: 'rag_coach', label: 'RAG Career Coach', capability: 'Cited answers over candidate-owned records', status: 'available', enabled: true, action: 'disable', reason: 'Local retrieval is active.' },
    { id: 'email', label: 'Email import', capability: 'Paste/review receipts. Gmail OAuth is blocked on decision.', status: 'available', enabled: false, action: 'connect', reason: 'Paste-import works locally. Gmail OAuth is not connected.' },
    { id: 'calendar', label: 'Calendar sync', capability: 'Calendar OAuth is blocked on decision.', status: 'blocked_on_provider_decision', enabled: false, action: 'blocked', reason: 'Requires Google/Microsoft OAuth.' },
  ];
}

export async function setProviderEnabled(providerId, enabled) {
  if (useRemote) return request(`/v1/providers/${providerId}`, { enabled });
  await wait();
  return { id: providerId, enabled, action: enabled ? 'disable' : 'connect' };
}
