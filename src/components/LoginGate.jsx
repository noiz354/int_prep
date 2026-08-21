import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';
import { completeOidcCallback, fetchAuthMethods, loginWithDemo, startOidcLogin } from '../lib/session.js';

export function LoginGate({ onSignedIn }) {
  const [methods, setMethods] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (code) {
      setBusy('oidc');
      completeOidcCallback({ code, state })
        .then((session) => {
          window.history.replaceState({}, '', window.location.pathname);
          onSignedIn(session);
        })
        .catch((reason) => setError(reason.message))
        .finally(() => setBusy(''));
      return;
    }
    fetchAuthMethods().then(setMethods).catch((reason) => setError(reason.message));
  }, [onSignedIn]);

  const demo = async (email) => {
    setBusy(email);
    setError('');
    try {
      onSignedIn(await loginWithDemo({ email }));
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <main className="login-gate">
      <section className="login-card surface-card">
        <span className="pill pill-amber"><Icon name="lock" size={14} /> SIGN IN REQUIRED</span>
        <h1>Sign in to SignalRoom</h1>
        <p>Demo identity is no longer applied automatically. Use OIDC when configured, or an explicit labelled demo identity for local development.</p>
        {error && <p className="login-error" role="alert">{error}</p>}
        <button className="button button-primary full" disabled={Boolean(busy) || !methods?.oidc?.enabled} onClick={() => startOidcLogin().catch((reason) => setError(reason.message))}>
          {busy === 'oidc' ? 'Opening identity provider…' : methods?.oidc?.enabled ? 'Continue with OIDC / Keycloak' : 'OIDC not configured in this environment'}
        </button>
        {methods?.demoLogin && (
          <div className="login-demo">
            <p>Development only — labelled demo identities</p>
            <button className="button button-secondary full" disabled={Boolean(busy)} onClick={() => demo('maya@northstar.example')}>
              {busy === 'maya@northstar.example' ? 'Signing in…' : 'Use demo identity · Maya Patel (talent ops)'}
            </button>
            <button className="button button-secondary full" disabled={Boolean(busy)} onClick={() => demo('alex.morgan@example.test')}>
              {busy === 'alex.morgan@example.test' ? 'Signing in…' : 'Use demo identity · Alex Morgan (candidate)'}
            </button>
          </div>
        )}
        <small>Persistence: {methods?.persistence || '…'} · Docker Keycloak is optional. Data survives API restart when persistence is file.</small>
      </section>
    </main>
  );
}
