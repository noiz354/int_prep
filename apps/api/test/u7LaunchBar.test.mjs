import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { summarizeByState } from '../../../src/data/capabilityRegistry.js';

test('U7 launch bar: no capability is staging_verified or production_deployed', () => {
  const all = summarizeByState();
  assert.equal(all.counts.staging_verified, 0);
  assert.equal(all.counts.production_deployed, 0);
  assert.equal(all.counts.provider_wired, 0);
  assert.equal(all.userUsable, 0);
});

test('U7 README and start:usable tell a new engineer the honest path', () => {
  const readme = readFileSync(new URL('../../../README.md', import.meta.url), 'utf8');
  const starter = readFileSync(new URL('../../../scripts/start-usable.mjs', import.meta.url), 'utf8');
  assert.match(readme, /What is runnable now/i);
  assert.match(readme, /npm run start:usable/);
  assert.match(readme, /NOT production|not production|Nothing is `staging_verified`/i);
  assert.doesNotMatch(readme.toLowerCase(), /100\/100 production/);
  assert.match(starter, /START_READY_VAULT/);
  assert.match(starter, /candidate-readiness-api/);
  assert.match(starter, /career-vault-api/);
  assert.match(starter, /VITE_USE_API/);
});
