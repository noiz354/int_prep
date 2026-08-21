/**
 * OIDC authorization-code adapter for Keycloak (or any OIDC IdP).
 * Disabled until KEYCLOAK_URL / OIDC_ISSUER is configured. No secrets in source.
 */
const issuer = () => {
  if (process.env.OIDC_ISSUER) return process.env.OIDC_ISSUER.replace(/\/$/, '');
  if (process.env.KEYCLOAK_URL && process.env.KEYCLOAK_REALM) {
    return `${process.env.KEYCLOAK_URL.replace(/\/$/, '')}/realms/${process.env.KEYCLOAK_REALM}`;
  }
  return '';
};

export function oidcConfig() {
  const configuredIssuer = issuer();
  return {
    enabled: Boolean(configuredIssuer && process.env.OIDC_CLIENT_ID),
    issuer: configuredIssuer || null,
    clientId: process.env.OIDC_CLIENT_ID || process.env.KEYCLOAK_CLIENT_ID || 'signalroom-web',
    redirectUri: process.env.OIDC_REDIRECT_URI || '/api/auth/oidc/callback',
    realm: process.env.KEYCLOAK_REALM || null,
  };
}

export function oidcAuthorizationUrl({ state, nonce, redirectUri }) {
  const config = oidcConfig();
  if (!config.enabled) {
    const error = new Error('OIDC is not configured. Set KEYCLOAK_URL, KEYCLOAK_REALM, and OIDC_CLIENT_ID.');
    error.code = 'oidc_unconfigured';
    throw error;
  }
  const url = new URL(`${config.issuer}/protocol/openid-connect/auth`);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', redirectUri || config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid profile email');
  url.searchParams.set('state', state);
  if (nonce) url.searchParams.set('nonce', nonce);
  return url.toString();
}

function mapClaimsToPrincipal(payload) {
  const roles = payload.roles
    || payload.realm_access?.roles
    || (payload.role ? [payload.role] : ['candidate']);
  return {
    id: payload.sub,
    name: payload.name || payload.preferred_username || payload.email || 'OIDC user',
    email: payload.email || `${payload.sub}@oidc.local`,
    tenantId: payload.tenantId || payload.tenant || payload.organization || 'northstar',
    organizationId: payload.organizationId || 'org-northstar',
    roles: Array.isArray(roles) ? roles.filter((role) => typeof role === 'string') : ['candidate'],
    attributes: {
      region: payload.region || 'ap-southeast-1',
      idp: 'oidc',
    },
  };
}

export async function exchangeAuthorizationCode({ code, redirectUri }) {
  const config = oidcConfig();
  if (!config.enabled) {
    const error = new Error('OIDC is not configured');
    error.code = 'oidc_unconfigured';
    throw error;
  }
  const tokenUrl = `${config.issuer}/protocol/openid-connect/token`;
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: config.clientId,
    redirect_uri: redirectUri || config.redirectUri,
  });
  if (process.env.OIDC_CLIENT_SECRET) body.set('client_secret', process.env.OIDC_CLIENT_SECRET);

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) {
    const error = new Error(`OIDC token exchange failed (${response.status})`);
    error.code = 'oidc_exchange_failed';
    throw error;
  }
  const tokens = await response.json();
  const { decodeJwt } = await import('jose');
  const payload = decodeJwt(tokens.id_token || tokens.access_token);
  return { principal: mapClaimsToPrincipal(payload), idpTokens: { tokenType: tokens.token_type, expiresIn: tokens.expires_in } };
}
