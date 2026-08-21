import test from 'node:test';
import assert from 'node:assert/strict';
import { createEvent, MemoryEventBus } from '../src/eventBus.mjs';

test('event contracts require a tenant and preserve an idempotency key', () => {
  assert.throws(() => createEvent('interview.created', {}), /tenantId/);
  const event = createEvent('interview.created', { tenantId: 'northstar', interviewId: 'int-1' }, { eventId: 'evt-1', idempotencyKey: 'same-key' });
  assert.equal(event.contractVersion, '1.0');
  assert.equal(event.idempotencyKey, 'same-key');
});

test('memory event bus deduplicates replayed messages', () => {
  const bus = new MemoryEventBus();
  const event = createEvent('scorecard.submitted', { tenantId: 'northstar', interviewId: 'int-1' }, { eventId: 'evt-2', idempotencyKey: 'scorecard-1' });
  const first = bus.publish(event);
  const replay = bus.publish(event);
  assert.equal(first.duplicate, false);
  assert.equal(replay.duplicate, true);
  assert.equal(bus.list({ tenantId: 'northstar' }).length, 1);
});
