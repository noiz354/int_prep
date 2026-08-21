import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRoomSignal, MAX_SIGNAL_BYTES } from '../src/realtimeSignal.mjs';

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
