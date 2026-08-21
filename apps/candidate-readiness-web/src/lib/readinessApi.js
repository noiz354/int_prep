const useRemote = import.meta.env.VITE_USE_API === 'true' || import.meta.env.VITE_READINESS_API_MODE === 'remote';
const wait = (ms = 140) => new Promise((resolve) => setTimeout(resolve, ms));
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
    'Idempotency-Key': `cr-${crypto.randomUUID()}`,
  };
}

async function request(path, { method = 'GET', body } = {}) {
  const response = await fetch(path, {
    method,
    headers: headers(),
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Candidate readiness service is unavailable.');
  return payload.data;
}

export async function getDashboard() {
  if (useRemote) return request('/v1/dashboard');
  await wait();
  return { profile: null, plan: null, job: null, readiness: null, stories: [], sessions: [], opportunities: [], actionInbox: [], consent: null };
}

export async function listJobs() {
  if (useRemote) return request('/v1/job-descriptions');
  await wait();
  return [];
}

export async function createJobDescription(payload) {
  if (useRemote) return request('/v1/job-descriptions', { method: 'POST', body: payload });
  await wait();
  return { id: `cr-job-${crypto.randomUUID().slice(0, 8)}`, ...payload };
}

export async function createReadinessPlan(payload) {
  if (useRemote) return request('/v1/readiness-plans', { method: 'POST', body: payload });
  await wait();
  return { id: 'cr-plan-local', ...payload, boundary: 'preparation_only' };
}

export async function addStory(payload) {
  if (useRemote) return request('/v1/stories', { method: 'POST', body: payload });
  await wait();
  return { id: `cr-story-${crypto.randomUUID().slice(0, 8)}`, ...payload };
}

export async function submitPractice(payload) {
  if (useRemote) return request('/v1/practice-sessions', { method: 'POST', body: payload });
  await wait();
  if (payload.sessionContext === 'live_assessment') throw new Error('Candidate readiness tools are not available during a live hiring assessment.');
  const words = payload.answer?.trim().split(/\s+/).filter(Boolean).length || 0;
  const evidence = /result|impact|improved|reduced|increased|%/i.test(payload.answer || '');
  return {
    id: `practice-${crypto.randomUUID().slice(0, 8)}`,
    ...payload,
    feedback: {
      readinessSignal: Math.min(100, Math.round(words / 2 + (evidence ? 20 : 0))),
      guidance: [
        `Connect the answer explicitly to ${payload.competency}.`,
        evidence ? 'Keep your outcome concrete and truthful.' : 'Add a real outcome, metric, or observable impact.',
      ],
    },
    liveAssessmentAccess: false,
  };
}

export async function listCoaches() {
  if (useRemote) return request('/v1/coaches');
  await wait();
  return [];
}

export async function upsertCoach(payload) {
  if (useRemote) return request('/v1/coaches', { method: 'POST', body: payload });
  await wait();
  return { ...payload, verificationStatus: payload.verificationStatus || 'verified' };
}

export async function requestCoachBooking(payload) {
  if (useRemote) return request('/v1/coach-bookings', { method: 'POST', body: payload });
  await wait();
  return { id: `booking-${crypto.randomUUID().slice(0, 8)}`, ...payload, status: 'requested', sessionType: 'preparation_only' };
}

export async function createApplicationReview(payload) {
  if (useRemote) return request('/v1/applications', { method: 'POST', body: payload });
  await wait();
  return { id: `application-${crypto.randomUUID().slice(0, 8)}`, ...payload, status: 'review_required', autoSubmit: false };
}

export async function createOpportunity(payload) {
  if (useRemote) return request('/v1/opportunities', { method: 'POST', body: payload });
  await wait();
  return { id: `opp-${crypto.randomUUID().slice(0, 8)}`, ...payload, status: 'saved' };
}

export async function exportData() {
  if (useRemote) return request('/v1/data-export');
  await wait();
  return { exportScope: 'candidate_owned_readiness_data_only' };
}

export async function deleteData() {
  if (useRemote) return request('/v1/data-deletion', { method: 'POST', body: {} });
  await wait();
  return { deleted: true };
}
