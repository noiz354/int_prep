import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoomSignal, MAX_SIGNAL_BYTES, SIGNAL_KINDS } from '../src/realtimeSignal.mjs';

test('U3 room signals allow only WebRTC and whiteboard kinds with a size cap', () => {
  const ok = parseRoomSignal({
    interviewId: 'int-2048',
    kind: 'webrtc.offer',
    payload: { to: 'usr-alex', sdp: { type: 'offer', sdp: 'v=0' } },
  });
  assert.equal(ok.ok, true);
  const denied = parseRoomSignal({ interviewId: 'int-2048', kind: 'admin.broadcast', payload: {} });
  assert.equal(denied.ok, false);
  const oversized = parseRoomSignal({
    interviewId: 'int-2048',
    kind: 'whiteboard.stroke',
    payload: { path: 'x'.repeat(MAX_SIGNAL_BYTES) },
  });
  assert.equal(oversized.ok, false);
});

test('SIGNAL_KINDS includes all expected WebRTC and whiteboard signal types', () => {
  assert.ok(SIGNAL_KINDS.includes('webrtc.offer'));
  assert.ok(SIGNAL_KINDS.includes('webrtc.answer'));
  assert.ok(SIGNAL_KINDS.includes('webrtc.ice'));
  assert.ok(SIGNAL_KINDS.includes('whiteboard.stroke'));
  assert.equal(SIGNAL_KINDS.length, 4);
});

test('signal schema rejects empty/null payloads', () => {
  assert.equal(parseRoomSignal(null).ok, false);
  assert.equal(parseRoomSignal({}).ok, false);
  assert.equal(parseRoomSignal({ interviewId: 'int-2048' }).ok, false);
});

test('signal schema validates interviewId format', () => {
  const ok = parseRoomSignal({ interviewId: 'int-abc123', kind: 'webrtc.ice', payload: {} });
  assert.equal(ok.ok, true);
  const bad = parseRoomSignal({ interviewId: 'int;', kind: 'webrtc.ice', payload: {} });
  assert.equal(bad.ok, false);
});
