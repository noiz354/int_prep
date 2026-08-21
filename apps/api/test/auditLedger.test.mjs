import test from 'node:test';
import assert from 'node:assert/strict';
import { AuditLedger } from '../src/auditLedger.mjs';

test('audit ledger maintains a separate verifiable hash chain per tenant', () => {
  const ledger = new AuditLedger();
  const first = ledger.append({ tenantId: 'northstar', actor: { id: 'u1', name: 'Maya' }, action: 'consent.recorded', target: { type: 'interview', id: 'int-1' } });
  const second = ledger.append({ tenantId: 'northstar', actor: { id: 'u1', name: 'Maya' }, action: 'scorecard.submitted', target: { type: 'interview', id: 'int-1' } });
  const otherTenant = ledger.append({ tenantId: 'other', actor: { id: 'u2', name: 'Sam' }, action: 'interview.created', target: { type: 'interview', id: 'int-2' } });

  assert.equal(second.previousHash, first.hash);
  assert.equal(otherTenant.previousHash, 'GENESIS');
  assert.deepEqual(ledger.verify({ tenantId: 'northstar' }).valid, true);
  assert.deepEqual(ledger.verify({ tenantId: 'other' }).valid, true);
  assert.equal(Object.isFrozen(ledger.list({ tenantId: 'northstar' })[0]), true);
});
