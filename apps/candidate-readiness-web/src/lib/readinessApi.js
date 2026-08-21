// Candidate Readiness API seam. In demo mode the UI remains local and explicitly
// labelled as a preparation prototype. Remote mode uses a deployed relative API
// proxy with signed identity in the production implementation.
const useRemote = import.meta.env.VITE_READINESS_API_MODE === 'remote';
const wait = (ms = 140) => new Promise((resolve) => setTimeout(resolve, ms));

function headers() {
  return {
    'Content-Type': 'application/json',
    'X-Tenant-Id': 'candidate-program-demo',
    'X-Actor-Id': 'candidate-alex',
    'X-Actor-Role': 'candidate',
    'Idempotency-Key': `cr-${crypto.randomUUID()}`,
  };
}

async function request(path, body) {
  const response = await fetch(path, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Candidate readiness service is unavailable.');
  }
  return (await response.json()).data;
}

export async function createReadinessPlan(payload) {
  if (useRemote) return request('/v1/readiness-plans', payload);
  await wait();
  return { id: 'cr-plan-demo', ...payload, boundary: 'preparation_only' };
}

export async function submitPractice(payload) {
  if (useRemote) return request('/v1/practice-sessions', payload);
  await wait();
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
        'Name a constraint, trade-off, and how you validated the result.',
      ],
    },
    liveAssessmentAccess: false,
  };
}

export async function requestCoachBooking(payload) {
  if (useRemote) return request('/v1/coach-bookings', payload);
  await wait();
  return { id: `booking-${crypto.randomUUID().slice(0, 8)}`, ...payload, status: 'requested', sessionType: 'preparation_only' };
}

export async function createApplicationReview(payload) {
  if (useRemote) return request('/v1/applications', payload);
  await wait();
  return { id: `application-${crypto.randomUUID().slice(0, 8)}`, ...payload, status: 'review_required', autoSubmit: false };
}
