/**
 * Client-side cloud recording module.
 * Uses MediaRecorder API to capture WebRTC streams and upload chunks via presigned URLs.
 */

export function createRecordingClient({ interviewId, onError }) {
  let mediaRecorder = null;
  let recordingId = null;
  let chunks = [];
  let onChunkCallback = null;

  async function start() {
    const session = (() => { try { const raw = sessionStorage.getItem('signalroom:api-session:v1'); return raw ? JSON.parse(raw) : null; } catch { return null; } })();
    if (!session?.accessToken) throw new Error('Authentication required');

    const res = await fetch('/api/media/recordings/start', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${session.accessToken}`,
        'idempotency-key': `rec-start-${crypto.randomUUID()}`,
      },
      body: JSON.stringify({ interviewId }),
    });
    if (!res.ok) throw new Error('Failed to start recording');
    const { data } = await res.json();
    recordingId = data.recording.id;
    chunks = [];
    return { recordingId, presignedUrl: data.presignedUrl };
  }

  function attachStream(stream) {
    if (!stream) throw new Error('No stream to record');
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
      ? 'video/webm;codecs=vp9'
      : 'video/webm';
    mediaRecorder = new MediaRecorder(stream, { mimeType });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    mediaRecorder.onerror = (e) => onError?.(e.error);
  }

  function startCapture() {
    if (!mediaRecorder || mediaRecorder.state === 'recording') return;
    mediaRecorder.start(5000); // chunk every 5s
  }

  async function stop() {
    if (!mediaRecorder || mediaRecorder.state === 'inactive') return null;
    mediaRecorder.stop();
    const duration = mediaRecorder.duration || 0;

    // Upload final blob
    const blob = new Blob(chunks, { type: mediaRecorder.mimeType || 'video/webm' });
    await uploadBlob(blob);

    // Notify server recording stopped
    const session = (() => { try { const raw = sessionStorage.getItem('signalroom:api-session:v1'); return raw ? JSON.parse(raw) : null; } catch { return null; } })();
    if (recordingId && session?.accessToken) {
      const res = await fetch(`/api/media/recordings/${recordingId}/stop`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${session.accessToken}`,
          'idempotency-key': `rec-stop-${crypto.randomUUID()}`,
        },
        body: JSON.stringify({ interviewId, recordingId, duration: Math.round(duration) }),
      });
      if (res.ok) {
        const { data } = await res.json();
        return data;
      }
    }
    return null;
  }

  async function uploadBlob(blob) {
    if (!recordingId) return;
    const session = (() => { try { const raw = sessionStorage.getItem('signalroom:api-session:v1'); return raw ? JSON.parse(raw) : null; } catch { return null; } })();
    if (!session?.accessToken) return;
    // Upload chunk metadata
    await fetch(`/api/media/recordings/${recordingId}/chunk`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ chunkIndex: chunks.length - 1, size: blob.size }),
    });
  }

  function getState() {
    return mediaRecorder?.state || 'inactive';
  }

  return { start, attachStream, startCapture, stop, getState };
}
