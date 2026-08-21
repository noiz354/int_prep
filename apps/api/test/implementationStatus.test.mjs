import test from 'node:test';
import assert from 'node:assert/strict';
import { featureCatalog } from '../../../src/data/features.js';
import {
  capabilities,
  implementedFoundationIds,
  IMPLEMENTATION_STATES,
  summarizeByState,
} from '../../../src/data/capabilityRegistry.js';

const VALID_STATES = new Set(Object.keys(IMPLEMENTATION_STATES));

test('the implementation registry reports exactly 100 valid PRD foundations', () => {
  const validIds = new Set(featureCatalog.map((feature) => feature.id));
  assert.equal(implementedFoundationIds.length, 100);
  assert.equal(new Set(implementedFoundationIds).size, 100);
  assert.equal(implementedFoundationIds.every((id) => validIds.has(id)), true);
});

test('the capability registry covers PRD, CR, and CV IDs with valid states', () => {
  const interview = capabilities.filter((item) => item.product === 'interview');
  const readiness = capabilities.filter((item) => item.product === 'readiness');
  const vault = capabilities.filter((item) => item.product === 'vault');
  assert.equal(interview.length, 100);
  assert.equal(readiness.length, 48);
  assert.equal(vault.length, 20);
  assert.equal(new Set(capabilities.map((item) => item.id)).size, capabilities.length);
  assert.equal(capabilities.every((item) => VALID_STATES.has(item.state)), true);
  assert.equal(capabilities.every((item) => item.userCan && item.nextPhase), true);

  const interviewIds = new Set(featureCatalog.map((feature) => feature.id));
  assert.equal(interview.every((item) => interviewIds.has(item.id)), true);

  for (let index = 1; index <= 48; index += 1) {
    const id = `CR-${String(index).padStart(2, '0')}`;
    assert.equal(readiness.some((item) => item.id === id), true, `missing ${id}`);
  }
  for (let index = 1; index <= 20; index += 1) {
    const id = `CV-${String(index).padStart(2, '0')}`;
    assert.equal(vault.some((item) => item.id === id), true, `missing ${id}`);
  }
});

test('U0 claims no user-usable or production-deployed capabilities', () => {
  const all = summarizeByState();
  const interview = summarizeByState('interview');
  assert.equal(all.counts.production_deployed, 0);
  assert.equal(all.counts.staging_verified, 0);
  assert.equal(all.counts.provider_wired, 0);
  assert.equal(all.userUsable, 0);
  assert.equal(interview.counts.mocked, 11);
  assert.equal(interview.counts.local_only, 89);
  assert.equal(all.counts.mocked, 30);
  assert.equal(all.counts.local_only, 132);
  assert.equal(all.counts.blocked_on_decision, 6);
});
