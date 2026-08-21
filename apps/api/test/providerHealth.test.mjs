import test from 'node:test';
import assert from 'node:assert/strict';
import { createProviderHealth } from '../src/providerHealth.mjs';

test('U6 health never labels ATS as Connected to Greenhouse', async () => {
  const health = createProviderHealth({
    persistenceMode: 'file',
    env: { MOCK_OAUTH_URL: 'http://wiremock.test' },
    fetchImpl: async (url) => {
      if (String(url).includes('__admin')) return { ok: true, status: 200 };
      return { ok: false, status: 404 };
    },
    eventPlane: { probe: async () => ({ adapter: 'memory', broker: { configured: false, ok: false, error: 'unconfigured' }, schemaRegistry: { configured: false, ok: false, error: 'unconfigured' } }) },
  });
  const snap = await health.snapshot();
  const greenhouse = snap.integrations.find((item) => item.id === 'greenhouse');
  const workday = snap.integrations.find((item) => item.id === 'workday');
  const slack = snap.integrations.find((item) => item.id === 'slack');
  assert.equal(greenhouse.status, 'Sandbox mock');
  assert.equal(greenhouse.statusKind, 'sandbox_mock');
  assert.doesNotMatch(greenhouse.status, /connected/i);
  assert.equal(workday.statusKind, 'sandbox_mock');
  assert.equal(slack.status, 'Not connected');
  const wiremock = snap.providers.find((item) => item.id === 'wiremock');
  assert.equal(wiremock.state, 'sandbox_mock');
  assert.equal(snap.eventAdapter, 'memory');
});

test('U6 health reports down/unconfigured instead of fake success', async () => {
  const health = createProviderHealth({
    persistenceMode: 'memory',
    env: {},
    fetchImpl: async () => { throw new Error('unreachable'); },
    eventPlane: { probe: async () => ({ adapter: 'memory', broker: { configured: true, ok: false, error: 'ECONNREFUSED' }, schemaRegistry: { configured: true, ok: false, error: 'timeout' } }) },
  });
  const snap = await health.snapshot();
  const redpanda = snap.providers.find((item) => item.id === 'redpanda');
  const otlp = snap.providers.find((item) => item.id === 'otlp');
  assert.equal(redpanda.state, 'down');
  assert.equal(redpanda.lastError, 'ECONNREFUSED');
  assert.equal(otlp.state, 'unconfigured');
  assert.equal(snap.integrations[0].status, 'Not connected');
});
