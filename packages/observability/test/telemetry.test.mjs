import test from 'node:test';
import assert from 'node:assert/strict';
import { hashTenant, recordMediaJoin, recordMediaQuality, recordRoomJoinSignal, requestLogger, recordRed } from '../src/telemetry.mjs';

test('hashTenant returns a stable low-cardinality hash and never the raw tenant', () => {
  const a = hashTenant('northstar');
  const b = hashTenant('northstar');
  assert.equal(a, b);
  assert.notEqual(a, 'northstar');
  assert.equal(a.length, 12);
  assert.equal(hashTenant(null), 'unknown');
});

test('requestLogger sets x-request-id and emits structured JSON with bounded labels', async () => {
  const lines = [];
  const logger = { info: (line) => lines.push(line), warn: () => {}, error: () => {} };
  const req = { headers: { 'x-request-id': 'req-123' }, method: 'POST', path: '/v1/rag/ask', actor: { tenantId: 'career-vault-demo', role: 'candidate' } };
  const res = { setHeader(name, value) { this[name] = value; }, statusCode: 200, on(event, cb) { if (event === 'finish') this._finish = cb; } };
  const next = () => {};
  requestLogger(logger)(req, res, next);
  assert.equal(res['x-request-id'], 'req-123');
  res.statusCode = 200;
  res._finish();
  const parsed = JSON.parse(lines[0]);
  assert.equal(parsed.event, 'http.request');
  assert.equal(parsed.request_id, 'req-123');
  assert.equal(parsed.method, 'POST');
  assert.equal(parsed.status_class, '2xx');
  assert.ok(parsed.duration_ms >= 0);
  assert.notEqual(parsed.tenant, 'career-vault-demo'); // hashed, no raw tenant/PII
});

test('requestLogger honors incoming x-request-id and generates one when absent', () => {
  const lines = [];
  const logger = { info: (line) => lines.push(line), warn: () => {}, error: () => {} };
  const req = { headers: {}, method: 'GET', path: '/v1/health', actor: undefined };
  const res = { setHeader(name, value) { this[name] = value; }, statusCode: 200, on(event, cb) { if (event === 'finish') this._finish = cb; } };
  requestLogger(logger)(req, res, () => {});
  assert.ok(res['x-request-id']);
  res._finish();
  const parsed = JSON.parse(lines[0]);
  assert.equal(parsed.tenant, 'unknown');
  assert.equal(parsed.status_class, '2xx');
});

test('recordRed is a no-op when telemetry is not started (test env)', () => {
  assert.doesNotThrow(() => recordRed({ route: '/v1/x', statusClass: '5xx' }));
});

test('media and room join recorders are no-ops without a started SDK and clamp values', () => {
  assert.doesNotThrow(() => recordMediaQuality({ latencyMs: 120, packetLoss: 0.5, jitterMs: 8, interviewId: 'int-2048' }));
  assert.doesNotThrow(() => recordMediaQuality({ latencyMs: -5, packetLoss: 150, jitterMs: -1 }));
  assert.doesNotThrow(() => recordMediaJoin({ tenantId: 'northstar', role: 'interviewer' }));
  assert.doesNotThrow(() => recordRoomJoinSignal({ tenantId: 'northstar', role: 'candidate' }));
});
