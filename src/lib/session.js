const sessionStorageKey = 'signalroom:api-session:v1';

export const isRemoteApiEnabled = () => import.meta.env.VITE_USE_API === 'true';

export function readSession() {
  try {
    const raw = sessionStorage.getItem(sessionStorageKey);
    const session = raw ? JSON.parse(raw) : null;
    if (!session?.accessToken || Date.now() >= session.expiresAt) return null;
    return session;
  } catch {
    return null;
  }
}

function writeSession(session) {
  sessionStorage.setItem(sessionStorageKey, JSON.stringify(session));
  return session;
}

export function getSession() {
  return readSession();
}

export async function fetchAuthMethods() {
  const response = await fetch('/api/auth/methods');
  if (!response.ok) throw new Error('Unable to load authentication methods');
  return (await response.json()).data;
}

export async function loginWithDemo({ email }) {
  const response = await fetch('/api/auth/demo-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Demo login failed');
  const { data } = body;
  return writeSession({
    accessToken: data.accessToken,
    principal: data.principal,
    email: data.principal.email,
    method: 'demo',
    expiresAt: Date.now() + (data.expiresInSeconds * 1000) - 30_000,
  });
}

export async function startOidcLogin() {
  const redirectUri = `${window.location.origin}/`;
  const response = await fetch(`/api/auth/oidc/start?redirect_uri=${encodeURIComponent(redirectUri)}`);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'OIDC is not configured');
  sessionStorage.setItem('signalroom:oidc-state', body.data.state);
  window.location.assign(body.data.authorizationUrl);
}

export async function completeOidcCallback({ code, state }) {
  const expected = sessionStorage.getItem('signalroom:oidc-state');
  if (expected && state && expected !== state) throw new Error('OIDC state mismatch');
  const response = await fetch('/api/auth/oidc/callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, redirect_uri: `${window.location.origin}/` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'OIDC login failed');
  sessionStorage.removeItem('signalroom:oidc-state');
  const { data } = body;
  return writeSession({
    accessToken: data.accessToken,
    principal: data.principal,
    email: data.principal.email,
    method: 'oidc',
    expiresAt: Date.now() + (data.expiresInSeconds * 1000) - 30_000,
  });
}

export async function logoutSession() {
  const session = readSession();
  try {
    if (session?.accessToken) {
      await fetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${session.accessToken}` } });
    }
  } catch { /* still clear locally */ }
  sessionStorage.removeItem(sessionStorageKey);
}

/** @deprecated Use getSession(); auto demo-login was removed in Phase U1. */
export async function getDemoSession() {
  return getSession();
}

export function clearDemoSession() {
  sessionStorage.removeItem(sessionStorageKey);
}
