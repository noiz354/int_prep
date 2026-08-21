/**
 * Phase 4 — Cloud recording service.
 * Manages recording lifecycle: start → chunks → stop → metadata.
 * Uploads go through presigned URLs (S3/MinIO compatible).
 */
import { randomUUID } from 'node:crypto';
import { createEvent } from '../../../services/event-gateway/src/eventBus.mjs';

const now = () => new Date().toISOString();
const uuid = () => randomUUID().slice(0, 8);

export function createRecordingServices({ events, tenantId = 'northstar' }) {
  const recordings = new Map();

  function publish(type, payload) {
    if (!events) return;
    events.publish(createEvent(type, { tenantId, ...payload }));
  }

  /** Start a recording session. Returns presigned upload URL + recording metadata. */
  function startRecording({ interviewId, startedBy }) {
    const recordingId = `rec-${uuid()}`;
    const presignedUrl = `/api/media/recordings/${recordingId}/upload`;
    const recording = {
      id: recordingId,
      interviewId,
      startedBy,
      tenantId,
      status: 'recording',
      startedAt: now(),
      stoppedAt: null,
      duration: null,
      totalBytes: 0,
      chunkCount: 0,
      s3Key: `recordings/${tenantId}/${interviewId}/${recordingId}`,
      downloadUrl: null,
      contentType: 'video/webm',
    };
    recordings.set(recordingId, recording);
    publish('recording.started', { interviewId, recordingId, startedBy });
    return { recording, presignedUrl };
  }

  /** Record a chunk upload (called after client uploads via presigned URL). */
  function recordChunk({ recordingId, chunkIndex, size }) {
    const rec = recordings.get(recordingId);
    if (!rec || rec.status !== 'recording') return null;
    rec.chunkCount++;
    rec.totalBytes += size || 0;
    return { recordingId, chunkIndex, totalChunks: rec.chunkCount, totalBytes: rec.totalBytes };
  }

  /** Stop a recording. Returns final metadata and download URL. */
  function stopRecording({ recordingId, duration }) {
    const rec = recordings.get(recordingId);
    if (!rec) return null;
    rec.status = 'completed';
    rec.stoppedAt = now();
    rec.duration = duration || 0;
    rec.downloadUrl = `/api/media/recordings/${recordingId}/download`;
    publish('recording.completed', { interviewId: rec.interviewId, recordingId, duration: rec.duration, size: rec.totalBytes });
    return rec;
  }

  function getRecording(recordingId) {
    return recordings.get(recordingId) || null;
  }

  function listRecordings(interviewId) {
    return [...recordings.values()].filter((r) => r.interviewId === interviewId);
  }

  return { startRecording, recordChunk, stopRecording, getRecording, listRecordings };
}
