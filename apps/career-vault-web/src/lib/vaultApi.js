// Career Vault API seam. Demo mode keeps the UI local and explicitly labelled as a
// candidate-private prototype. Remote mode uses a deployed relative API proxy with
// signed identity in the production implementation.
const useRemote = import.meta.env.VITE_VAULT_API_MODE === 'remote';
const wait = (ms = 120) => new Promise((resolve) => setTimeout(resolve, ms));

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-Tenant-Id': 'career-vault-demo',
    'X-Actor-Id': 'candidate-alex',
    'X-Actor-Role': 'candidate',
    'Idempotency-Key': `cv-${crypto.randomUUID()}`,
  };
}

async function request(path, body, method = 'POST') {
  const response = await fetch(path, { method, headers: headers(), body: JSON.stringify(body) });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Career Vault service is unavailable.');
  }
  return (await response.json()).data;
}

const demoOpportunities = [
  { id: 'opp-1', title: 'Senior Frontend Engineer', company: 'Target company', source: 'candidate_added', status: 'review_required', deadline: 'In 5 days', verifiedSource: true },
  { id: 'opp-2', title: 'Staff UI Engineer', company: 'Product company', source: 'email_receipt', status: 'saved', deadline: 'In 9 days', verifiedSource: true },
];

const demoArtifacts = [
  { id: 'art-1', kind: 'feedback', title: 'Mock interview feedback', content: 'Improve structure and evidence. Add a measurable outcome.', competency: 'communication', date: '2026-08-01' },
  { id: 'art-2', kind: 'note', title: 'Accessibility reflection', content: 'Practice keyboard-first flows and semantic structure before the next mock.', competency: 'accessibility', date: '2026-08-10' },
  { id: 'art-3', kind: 'practice_session', title: 'System design mock', content: 'Explained trade-offs for offline sync; validated with metrics.', competency: 'systems', date: '2026-08-14' },
];

const demoTimeline = [
  { id: 'ev-1', kind: 'application', title: 'Applied via career page', occurredAt: '2026-08-15', source: 'candidate_entered', opportunityId: 'opp-1' },
  { id: 'ev-2', kind: 'interview', title: 'Recruiter screen scheduled', occurredAt: '2026-08-20', source: 'email_import', opportunityId: 'opp-1' },
  { id: 'ev-3', kind: 'next_action', title: 'Follow up after recruiter screen', occurredAt: '2026-08-22', source: 'candidate_entered' },
];

export async function createOpportunity(payload) {
  if (useRemote) return request('/v1/opportunities', payload);
  await wait();
  return { id: `opp-${crypto.randomUUID().slice(0, 8)}`, ...payload, status: 'saved', verifiedSource: false };
}

export async function addArtifact(payload) {
  if (useRemote) return request('/v1/artifacts', payload);
  await wait();
  return { id: `art-${crypto.randomUUID().slice(0, 8)}`, ...payload, date: new Date().toISOString().slice(0, 10) };
}

export async function askRag(payload) {
  if (useRemote) return request('/v1/rag/ask', payload);
  await wait(160);
  // Deterministic demo RAG over the seeded demo evidence (citation + abstention rules).
  const text = `${payload.question} ${demoArtifacts.map((a) => `${a.title} ${a.content}`).join(' ')}`.toLowerCase();
  const relevant = demoArtifacts.filter((a) => text.includes(a.competency.toLowerCase()) || text.includes(a.title.toLowerCase().split(' ')[0]));
  if (!relevant.length) {
    return { answer: null, abstention: true, reason: 'insufficient_permitted_evidence', message: 'There is not enough candidate-authorized evidence to answer that. Add notes, feedback, or practice records.', citations: [], suggestedNextAction: 'Add candidate-owned feedback/notes or request human coaching.', confidence: 0 };
  }
  return {
    answer: `Based on your candidate-owned records, the most relevant evidence is '${relevant[0].title}' (${relevant[0].date}).`,
    abstention: false,
    citations: relevant.slice(0, 3).map((a) => ({ artifact_id: a.id, title: a.title, date: a.date, excerpt: a.content.slice(0, 80), reason: 'demo retrieval' })),
    confidence: 0.82,
    factVsReflection: { fact: relevant[0].content, reflection: 'Verify before acting.', inference: 'AI inference over candidate-authorized evidence only.' },
    modelVersion: 'career-vault-rag-v0.1-demo',
    requiresHumanJudgment: true,
  };
}

export async function requestExport(payload) {
  if (useRemote) return request('/v1/data-export', payload);
  await wait();
  return { exportScope: 'candidate_owned_timeline_and_artifacts_only', queued: true };
}

export async function importEmail(payload) {
  if (useRemote) return request('/v1/email/import', payload);
  await wait();
  return { id: `import-${crypto.randomUUID().slice(0, 8)}`, ...payload, status: 'awaiting_review', parsed: { role: payload.subject.replace(/^(interview|application|offer|invitation|recruiter|assessment)[\s:\-]+/i, '').slice(0, 180), company: 'Northwind Labs' }, reviewBeforeSave: true, trainingUse: false, forwardedToEmployer: false };
}

export async function reviewImport(payload) {
  if (useRemote) return request(`/v1/email/imports/${payload.importId}/review`, payload);
  await wait();
  return { id: payload.importId, status: payload.decision === 'reject' ? 'rejected' : 'approved', parsed: payload.decision === 'correct' ? { role: payload.titleOverride, company: payload.companyOverride } : undefined };
}

export async function registerConnector(payload) {
  if (useRemote) return request('/v1/connectors', payload);
  await wait();
  return { id: `connector-${crypto.randomUUID().slice(0, 8)}`, ...payload, status: 'candidate_approved_review_before_import' };
}

export async function listProviders() {
  if (useRemote) {
    const response = await fetch('/v1/providers', { headers: headers() });
    if (!response.ok) throw new Error('Unable to load provider connections.');
    return (await response.json()).data;
  }
  await wait();
  return [
    { id: 'rag_coach', label: 'RAG Career Coach', capability: 'Cited answers and seven-day plans over candidate-owned records', provider: 'Local scaffold', status: 'available', enabled: true, action: 'disable', reason: 'This connection is active for candidate-owned data only.' },
    { id: 'email', label: 'Email import', capability: 'Import application receipts with review-before-save', provider: 'Gmail / Microsoft OAuth', status: 'available', enabled: false, action: 'connect', reason: 'Not connected. Enable it to allow this capability to process candidate-authorized data.' },
    { id: 'calendar', label: 'Calendar sync', capability: 'Import interview, coach, and deadline events', provider: 'Google / Microsoft Calendar', status: 'available', enabled: false, action: 'connect', reason: 'Not connected. Enable it to allow this capability to process candidate-authorized data.' },
    { id: 'notifications', label: 'Reminders & follow-ups', capability: 'Candidate-consented reminders for deadlines', provider: 'Email / in-app', status: 'available', enabled: false, action: 'connect', reason: 'Not connected. Enable it to allow this capability to process candidate-authorized data.' },
    { id: 'object_storage', label: 'Encrypted artifact storage', capability: 'Store candidate-owned artifacts at rest', provider: 'S3 / MinIO / GCS', status: 'blocked_on_provider_decision', enabled: false, action: 'blocked', reason: 'Requires storage account + KMS key + retention policy. Select a provider before this connection can be enabled.' },
    { id: 'vector_index', label: 'Vector retrieval index', capability: 'Embedding-based retrieval for the RAG Career Coach', provider: 'Qdrant / Pinecone / Weaviate', status: 'blocked_on_provider_decision', enabled: false, action: 'blocked', reason: 'Requires vector provider + embedding model + tenant isolation policy. Select a provider before this connection can be enabled.' },
    { id: 'model_gateway', label: 'AI model gateway', capability: 'Grounded RAG answers with approved model + evaluation', provider: 'Azure OpenAI / Anthropic / Ollama', status: 'blocked_on_provider_decision', enabled: false, action: 'blocked', reason: 'Requires model provider + prompt/rubric versioning + red-team evaluation. Select a provider before this connection can be enabled.' },
  ];
}

export async function setProviderEnabled(providerId, enabled) {
  if (useRemote) return request(`/v1/providers/${providerId}`, { enabled });
  await wait();
  const providers = await listProviders();
  const target = providers.find((p) => p.id === providerId);
  return { ...target, enabled, action: enabled ? 'disable' : 'connect' };
}

export const demoData = { demoOpportunities, demoArtifacts, demoTimeline };
