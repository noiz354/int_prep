import { randomUUID } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { z } from 'zod';

const issuer = 'signalroom.local';
const audience = 'signalroom-web';
const secret = new TextEncoder().encode(process.env.AUTH_JWT_SECRET || 'signalroom-development-secret-change-me');

const users = [
  {
    id: 'usr-maya',
    email: 'maya@northstar.example',
    name: 'Maya Patel',
    tenantId: 'northstar',
    organizationId: 'org-northstar',
    roles: ['talent_ops_lead'],
    attributes: { department: 'talent', region: 'ap-southeast-1', employmentType: 'employee' },
  },
  {
    id: 'usr-alex',
    email: 'alex.morgan@example.test',
    name: 'Alex Morgan',
    tenantId: 'northstar',
    organizationId: 'org-northstar',
    roles: ['candidate'],
    attributes: { assignedInterviews: ['int-2048'], region: 'ap-southeast-1' },
  },
];

const demoLoginSchema = z.object({
  email: z.string().trim().email(),
});

let revocationStore = {
  isRevoked: () => false,
  revoke: () => {},
};

export function attachRevocationStore(store) {
  revocationStore = store;
}

export function demoLoginEnabled() {
  return process.env.ALLOW_DEMO_LOGIN !== 'false';
}

export function listDemoUsers() {
  return users.map(({ id, email, name, tenantId, organizationId, roles }) => ({ id, email, name, tenantId, organizationId, roles }));
}

export async function issueSession(principal) {
  const jti = randomUUID();
  return new SignJWT({
    name: principal.name,
    email: principal.email,
    tenantId: principal.tenantId,
    organizationId: principal.organizationId,
    roles: principal.roles,
    attributes: principal.attributes,
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(principal.id)
    .setJti(jti)
    .setIssuedAt()
    .setExpirationTime('4h')
    .sign(secret);
}

export async function verifySession(token) {
  const { payload } = await jwtVerify(token, secret, { issuer, audience });
  if (revocationStore.isRevoked(payload.jti)) {
    const error = new Error('Session revoked');
    error.code = 'revoked';
    throw error;
  }
  return {
    id: payload.sub,
    name: payload.name,
    email: payload.email,
    tenantId: payload.tenantId,
    organizationId: payload.organizationId,
    roles: Array.isArray(payload.roles) ? payload.roles : [],
    attributes: payload.attributes || {},
    jti: payload.jti,
  };
}

export async function loginDemo(rawBody) {
  if (!demoLoginEnabled()) return { disabled: true };
  const { email } = demoLoginSchema.parse(rawBody);
  const principal = users.find((user) => user.email === email.toLowerCase());
  if (!principal) return null;
  const accessToken = await issueSession(principal);
  return { principal, accessToken, expiresInSeconds: 14_400, method: 'demo' };
}

export async function issueForPrincipal(principal) {
  const accessToken = await issueSession(principal);
  return { principal, accessToken, expiresInSeconds: 14_400, method: 'oidc' };
}

export function revokeSession(jti) {
  revocationStore.revoke(jti);
}

export async function requireAuthentication(req, res, next) {
  const header = req.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Authentication is required' });
  try {
    req.principal = await verifySession(token);
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session' });
  }
}

/** Ready/Vault APIs: JWT first; optional development headers when ALLOW_DEV_HEADERS=true. */
export async function requireBearerOrDevHeaders(req, res, next) {
  const header = req.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      const principal = await verifySession(token);
      req.principal = principal;
      req.actor = { tenantId: principal.tenantId, actorId: principal.id, role: principal.roles[0] || 'candidate' };
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
  }
  if (process.env.ALLOW_DEV_HEADERS !== 'false') {
    const tenantId = req.get('x-tenant-id');
    const actorId = req.get('x-actor-id');
    const role = req.get('x-actor-role');
    if (!tenantId || !actorId || !role) return res.status(401).json({ error: 'Authentication is required' });
    req.actor = { tenantId, actorId, role };
    req.principal = { id: actorId, tenantId, roles: [role], name: actorId, email: `${actorId}@dev.local` };
    return next();
  }
  return res.status(401).json({ error: 'Authentication is required' });
}
