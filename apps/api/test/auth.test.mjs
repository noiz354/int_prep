import test from 'node:test';
import assert from 'node:assert/strict';
import { issueSession, loginDemo, verifySession } from '../src/auth.mjs';
import { hasPermission } from '../src/authorization.mjs';

test('issues and verifies a tenant-scoped signed session', async () => {
  const login = await loginDemo({ email: 'maya@northstar.example' });
  const session = await verifySession(login.accessToken);
  assert.equal(session.tenantId, 'northstar');
  assert.deepEqual(session.roles, ['talent_ops_lead']);
  assert.equal(session.email, 'maya@northstar.example');
});

test('authorization applies role and interview assignment boundaries', async () => {
  const candidateToken = await issueSession({
    id: 'candidate-1', name: 'Candidate', email: 'candidate@example.test', tenantId: 'northstar', organizationId: 'org-northstar', roles: ['candidate'], attributes: { assignedInterviews: ['int-2048'] },
  });
  const candidate = await verifySession(candidateToken);
  assert.equal(hasPermission(candidate, 'interview:read', { interviewId: 'int-2048' }), true);
  assert.equal(hasPermission(candidate, 'interview:read', { interviewId: 'int-9999' }), false);
  assert.equal(hasPermission(candidate, 'audit:read'), false);
});
