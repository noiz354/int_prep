const sessionStorageKey = 'signalroom:api-session:v1';

export const isRemoteApiEnabled = () => import.meta.env.VITE_USE_API === 'true';

function readSession() {
  try {
    const raw = sessionStorage.getItem(sessionStorageKey);
    const session = raw ? JSON.parse(raw) : null;
    if (!session?.accessToken || Date.now() >= session.expiresAt) return null;
    return session;
  } catch {
    return null;
  }
}

export async function getDemoSession({ email = 'maya@northstar.example' } = {}) {
  if (!isRemoteApiEnabled()) return null;
  const existing = readSession();
  if (existing?.email === email) return existing;
  const response = await fetch('/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) throw new Error('Unable to create the local federated demo session');
  const { data } = await response.json();
  const session = {
    accessToken: data.accessToken,
    principal: data.principal,
    email,
    expiresAt: Date.now() + (data.expiresInSeconds * 1000) - 30_000,
  };
  sessionStorage.setItem(sessionStorageKey, JSON.stringify(session));
  return session;
}

export function clearDemoSession() {
  sessionStorage.removeItem(sessionStorageKey);
}
