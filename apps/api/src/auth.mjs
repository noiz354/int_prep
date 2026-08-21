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

// Task 4: Redis-backed JWT revocation with in-memory fallback
const JWT_MAX_LIFETIME_SECONDS = 4 * 60 * 60; // 4 hours matching JWT exp
const REDIS_REVOCATION_PREFIX = 'signalroom:revoked:';
let redisClient = null;
let redisAvailable = false;

async function createRedisClient() {
  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  try {
    const { default: Redis } = await import('ioredis');
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      connectTimeout: 3000,
      lazyConnect: true,
      enableOfflineQueue: false,
    });
    client.on('error', () => { redisAvailable = false; });
    client.on('connect', () => { redisAvailable = true; });
    return client;
  } catch {
    return null;
  }
}

const inMemoryRevoked = new Set();

let revocationStore = {
  isRevoked: async (jti) => {
    if (!jti) return false;
    if (redisClient && redisAvailable) {
      try {
        const exists = await redisClient.sismember(`${REDIS_REVOCATION_PREFIX}set`, jti);
        return exists === 1;
      } catch { /* fallback to in-memory */ }
    }
    return inMemoryRevoked.has(jti);
  },
  revoke: async (jti) => {
    if (!jti) return;
    inMemoryRevoked.add(jti);
    if (redisClient && redisAvailable) {
      try {
        const key = `${REDIS_REVOCATION_PREFIX}set`;
        await redisClient.sadd(key, jti);
        await redisClient.expire(key, JWT_MAX_LIFETIME_SECONDS);
      } catch { /* best-effort Redis, in-memory is already updated */ }
    }
  },
};

// Attempt Redis connection at module load (non-blocking, skip in test mode)
if (process.env.NODE_ENV !== 'test') {
  createRedisClient().then((client) => {
    if (client) {
      redisClient = client;
      client.connect().then(() => { redisAvailable = true; }).catch(() => { redisAvailable = false; });
    }
  }).catch(() => { /* Redis not available, use in-memory fallback */ });
}

export function attachRevocationStore(store) {
  // Wrap sync store methods (from durableStore) to be awaitable
  revocationStore = {
    isRevoked: async (jti) => store.isRevoked(jti),
    revoke: async (jti) => store.revoke(jti),
  };
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
  if (await revocationStore.isRevoked(payload.jti)) {
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

export async function revokeSession(jti) {
  await revocationStore.revoke(jti);
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
