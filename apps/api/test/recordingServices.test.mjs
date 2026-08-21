import test from 'node:test';
import assert from 'node:assert/strict';
import { createRecordingServices } from '../src/recordingServices.mjs';
import { MemoryEventBus } from '../../../services/event-gateway/src/eventBus.mjs';

function makeHarness() {
  const events = new MemoryEventBus();
  const services = createRecordingServices({ events, tenantId: 'northstar' });
  return { events, services };
}

test('recording lifecycle: start → chunk → stop returns metadata', () => {
  const { services } = makeHarness();
  const { recording, presignedUrl } = services.startRecording({ interviewId: 'int-2048', startedBy: 'host-1' });
  assert.equal(recording.status, 'recording');
  assert.equal(recording.interviewId, 'int-2048');
  assert.equal(recording.startedBy, 'host-1');
  assert.ok(presignedUrl.includes(recording.id));
  // Record chunks
  services.recordChunk({ recordingId: recording.id, chunkIndex: 0, size: 1024 });
  services.recordChunk({ recordingId: recording.id, chunkIndex: 1, size: 2048 });
  const updated = services.getRecording(recording.id);
  assert.equal(updated.chunkCount, 2);
  assert.equal(updated.totalBytes, 3072);
  // Stop
  const completed = services.stopRecording({ recordingId: recording.id, duration: 45 });
  assert.equal(completed.status, 'completed');
  assert.equal(completed.duration, 45);
  assert.ok(completed.downloadUrl.includes(recording.id));
});

test('recording: chunk on non-existent recording returns null', () => {
  const { services } = makeHarness();
  const result = services.recordChunk({ recordingId: 'rec-fake', chunkIndex: 0, size: 100 });
  assert.equal(result, null);
});

test('recording: stop on non-existent recording returns null', () => {
  const { services } = makeHarness();
  const result = services.stopRecording({ recordingId: 'rec-fake', duration: 0 });
  assert.equal(result, null);
});

test('recording: list recordings filters by interviewId', () => {
  const { services } = makeHarness();
  services.startRecording({ interviewId: 'int-2048', startedBy: 'host-1' });
  services.startRecording({ interviewId: 'int-2051', startedBy: 'host-2' });
  const list2048 = services.listRecordings('int-2048');
  assert.equal(list2048.length, 1);
  assert.equal(list2048[0].interviewId, 'int-2048');
});

test('recording: events published on start and stop', () => {
  const { services, events } = makeHarness();
  const { recording } = services.startRecording({ interviewId: 'int-2048', startedBy: 'host-1' });
  services.stopRecording({ recordingId: recording.id, duration: 30 });
  const types = events.list({ tenantId: 'northstar' }).map((e) => e.type);
  assert.ok(types.includes('recording.started'));
  assert.ok(types.includes('recording.completed'));
});
