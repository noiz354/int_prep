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

export function listDemoUsers() {
  return users.map(({ id, email, name, tenantId, organizationId, roles }) => ({ id, email, name, tenantId, organizationId, roles }));
}

export async function issueSession(principal) {
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
    .setIssuedAt()
    .setExpirationTime('4h')
    .sign(secret);
}

export async function verifySession(token) {
  const { payload } = await jwtVerify(token, secret, { issuer, audience });
  return {
    id: payload.sub,
    name: payload.name,
    email: payload.email,
    tenantId: payload.tenantId,
    organizationId: payload.organizationId,
    roles: Array.isArray(payload.roles) ? payload.roles : [],
    attributes: payload.attributes || {},
  };
}

export async function loginDemo(rawBody) {
  const { email } = demoLoginSchema.parse(rawBody);
  const principal = users.find((user) => user.email === email.toLowerCase());
  if (!principal) return null;
  return { principal, accessToken: await issueSession(principal), expiresInSeconds: 14_400 };
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
