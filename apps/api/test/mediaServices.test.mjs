import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEventBus } from '../../../services/event-gateway/src/eventBus.mjs';
import { createMediaServices } from '../src/mediaServices.mjs';

const tenantId = 'northstar';

function makeHarness() {
  const events = new MemoryEventBus();
  const services = createMediaServices({ events, tenantId });
  return { events, services };
}

test('BE-07 provisions a region-aware media session with policy and TURN contract', () => {
  const { services } = makeHarness();
  const session = services.provisionSession({ interviewId: 'int-2048', region: 'ap-southeast-1', policy: { participantLimit: 8, recording: 'tenant-default' } });
  assert.equal(session.region, 'ap-southeast-1');
  assert.equal(session.sfuCluster, 'sg-1');
  assert.equal(session.status, 'provisioning');
  assert.equal(session.policy.participantLimit, 8);
  assert.equal(session.policy.turn.region, 'sg');
  assert.equal(session.policy.turn.credentialMode, 'ephemeral');
  assert.equal(session.providerState, 'blocked-on-provider-decision');
  // Unsupported region rejected.
  assert.throws(() => services.provisionSession({ interviewId: 'int-2048', region: 'mars-1' }), /Unsupported media region/);
});

test('BE-07 admission control is host-gated and ends after session close', () => {
  const { services } = makeHarness();
  const session = services.provisionSession({ interviewId: 'int-2048' });
  // Candidate without host admission → waiting room.
  const waiting = services.evaluateAdmission({ sessionId: session.id, userId: 'cand-1', roles: ['candidate'] });
  assert.equal(waiting.decision, 'waiting-room');
  // Host admission → admit.
  const admitted = services.evaluateAdmission({ sessionId: session.id, userId: 'cand-1', roles: ['candidate'], hostAdmitted: true });
  assert.equal(admitted.decision, 'admit');
  // Interviewer admitted immediately.
  const panel = services.evaluateAdmission({ sessionId: session.id, userId: 'panel-1', roles: ['interviewer'] });
  assert.equal(panel.decision, 'admit');
  // Ended session denies.
  services.endSession(session.id);
  const denied = services.evaluateAdmission({ sessionId: session.id, userId: 'cand-2', roles: ['candidate'], hostAdmitted: true });
  assert.equal(denied.decision, 'deny');
  assert.equal(denied.reason, 'session-ended');
});

test('FE-01 resilient room: reconnect, ICE restart, adaptive bitrate, audio-only fallback', () => {
  const { services, events } = makeHarness();
  const session = services.provisionSession({ interviewId: 'int-2048' });
  const ready = services.updateConnectionState(session.id, { state: 'ready' });
  assert.equal(ready.adaptiveBitrate, true);
  const audioOnly = services.updateConnectionState(session.id, { state: 'audio-only', detail: 'network degraded' });
  assert.equal(audioOnly.audioOnlyFallback, true);
  assert.equal(audioOnly.adaptiveBitrate, false);
  const ice = services.iceRestart(session.id);
  assert.equal(ice.state, 'negotiating');
  // Invalid state rejected.
  assert.throws(() => services.updateConnectionState(session.id, { state: 'bogus' }), /Invalid media state/);
  const types = events.list({ tenantId }).map((e) => e.type);
  assert.ok(types.includes('media.session.audio-only'));
  assert.ok(types.includes('media.session.ice-restart'));
});

test('FE-07 whiteboard enforces host control and consent-gated screen share', () => {
  const { services } = makeHarness();
  const session = services.provisionSession({ interviewId: 'int-2048' });
  const board = services.createWhiteboard({ sessionId: session.id, hostId: 'host-1' });
  assert.equal(board.screenShare, 'user-gesture-required');
  assert.ok(board.permissions.includes('host-control'));
  // Participant annotation allowed.
  const entry = services.whiteboardAction(board.id, { actorId: 'panel-1', action: 'annotate', payload: { x: 10, y: 20 } });
  assert.equal(entry.action, 'annotate');
  // Host-only stop.
  const deniedStop = services.stopWhiteboard(board.id, { actorId: 'panel-1' });
  assert.equal(deniedStop.denied, true);
  const stop = services.stopWhiteboard(board.id, { actorId: 'host-1' });
  assert.equal(stop.status, 'ended');
});

test('FE-10 AV enhancement applies browser-capable features with fallback', () => {
  const { services } = makeHarness();
  const session = services.provisionSession({ interviewId: 'int-2048' });
  const applied = services.applyEnhancement({ sessionId: session.id, userId: 'cand-1', preferences: { blur: true, noiseSuppression: true, echoCancellation: false } });
  assert.equal(applied.blur, true);
  assert.equal(applied.noiseSuppression, true);
  assert.equal(applied.echoCancellation, false);
  assert.ok(Array.isArray(applied.fallback));
  assert.equal(applied.sessionId, session.id);
});

test('Phase 2 media lifecycle ends sessions and verifies track cleanup', () => {
  const { services, events } = makeHarness();
  const session = services.provisionSession({ interviewId: 'int-2048' });
  services.endSession(session.id);
  assert.equal(services.sessionStatus(session.id).status, 'ended');
  const cleanup = services.cleanup(session.id);
  assert.equal(cleanup.tracksStopped, true);
  assert.equal(cleanup.resourcesReleased, true);
  const types = events.list({ tenantId }).map((e) => e.type);
  assert.ok(types.includes('media.session.ended'));
});
