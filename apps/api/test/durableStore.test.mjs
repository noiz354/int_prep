import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createPersistence } from '../src/durableStore.mjs';
import { attachRevocationStore, issueSession, loginDemo, revokeSession, verifySession } from '../src/auth.mjs';

test('file persistence keeps interviews after a store reload', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'sr-store-'));
  const filePath = join(dir, 'store.json');
  try {
    const first = createPersistence({ mode: 'file', filePath, seedInterviews: [] });
    await first.interviews.create({ id: 'int-persist-1', tenantId: 'northstar', candidateName: 'Jordan Lee', role: 'Backend', stage: 'Screen', status: 'scheduled' });
    const second = createPersistence({ mode: 'file', filePath });
    const found = await second.interviews.findById('int-persist-1', 'northstar');
    assert.equal(found.candidateName, 'Jordan Lee');
    const other = await second.interviews.findById('int-persist-1', 'other-tenant');
    assert.equal(other, null);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('demo login can be disabled and sessions can be revoked', async () => {
  const previous = process.env.ALLOW_DEMO_LOGIN;
  process.env.ALLOW_DEMO_LOGIN = 'false';
  try {
    const disabled = await loginDemo({ email: 'maya@northstar.example' });
    assert.equal(disabled.disabled, true);
  } finally {
    if (previous === undefined) delete process.env.ALLOW_DEMO_LOGIN;
    else process.env.ALLOW_DEMO_LOGIN = previous;
  }

  const revoked = new Set();
  attachRevocationStore({
    isRevoked: (jti) => revoked.has(jti),
    revoke: (jti) => revoked.add(jti),
  });
  const token = await issueSession({
    id: 'usr-maya', name: 'Maya Patel', email: 'maya@northstar.example', tenantId: 'northstar', organizationId: 'org-northstar', roles: ['talent_ops_lead'], attributes: {},
  });
  const live = await verifySession(token);
  assert.equal(live.email, 'maya@northstar.example');
  revokeSession(live.jti);
  await assert.rejects(() => verifySession(token), /revoked|Session/);
});
