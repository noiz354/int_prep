import test from 'node:test';
import assert from 'node:assert/strict';
import { createEvent, KafkaProducerAdapter, MemoryEventBus } from '../src/eventBus.mjs';
import { CompositeEventBus, createEventPlane, createSchemaRegistryClient, EVENT_JSON_SCHEMAS } from '../src/eventPlane.mjs';

test('KafkaProducerAdapter sends the contract envelope to a KafkaJS-shaped producer', async () => {
  const sent = [];
  const adapter = new KafkaProducerAdapter({
    send: async (batch) => { sent.push(batch); },
  });
  const event = createEvent('interview.created', { tenantId: 'northstar', interviewId: 'int-1' });
  await adapter.publish(event);
  assert.equal(sent[0].topic, 'interview-created');
  assert.equal(JSON.parse(sent[0].messages[0].value).payload.tenantId, 'northstar');
  assert.equal(sent[0].messages[0].headers['contract-version'], '1.0');
});

test('composite bus keeps the memory log when kafka produce fails', async () => {
  const memory = new MemoryEventBus();
  const lite = { last: () => ({ ok: true }) };
  const adapter = new KafkaProducerAdapter({
    send: async () => { throw new Error('broker down'); },
  });
  const bus = new CompositeEventBus(memory, adapter, lite);
  const event = createEvent('interview.created', { tenantId: 'northstar', interviewId: 'int-1' }, { idempotencyKey: 'k1' });
  const stored = bus.publish(event);
  assert.equal(stored.duplicate, false);
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(bus.list({ tenantId: 'northstar' }).length, 1);
  assert.equal(bus.lastKafka.ok, false);
});

test('schema registry client registers JSON contracts against a mock registry', async () => {
  const posts = [];
  const fetchImpl = async (url, options = {}) => {
    if (String(url).endsWith('/subjects')) return { ok: true, status: 200 };
    posts.push({ url, body: options.body });
    return { ok: true, status: 200 };
  };
  const client = createSchemaRegistryClient({ url: 'http://registry.test', fetchImpl });
  const result = await client.register(EVENT_JSON_SCHEMAS.slice(0, 2));
  assert.equal(result.ok, true);
  assert.equal(result.registered, 2);
  assert.equal(posts.length, 2);
});

test('event plane stays on the memory adapter when Redpanda is unconfigured', async () => {
  const plane = createEventPlane({ broker: '', schemaRegistry: '' });
  const event = createEvent('consent.updated', { tenantId: 'northstar', interviewId: 'int-1', consentId: 'c1' });
  plane.publish(event);
  const status = await plane.probe();
  assert.equal(status.adapter, 'memory');
  assert.equal(status.broker.configured, false);
  assert.equal(plane.list({ tenantId: 'northstar' }).length, 1);
});
