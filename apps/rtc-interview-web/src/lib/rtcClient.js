/**
 * Browser RTC client for the interview room.
 *
 * - getUserMedia is user-triggered (AGENTS non-negotiable: no auto media access).
 * - Creates an RTCPeerConnection with a local loopback offer/answer so the room
 *   exercises real WebRTC negotiation, ICE candidates, and stats — without an SFU.
 * - Every ~2s samples getStats() (round-trip time, jitter, packet loss) and reports
 *   them to the control plane `/api/data/telemetry` (media.rtc.* metrics) and to the
 *   UI quality panel. All tracks are stopped on disconnect.
 *
 * Production: replace the local loopback with the approved SFU SDK (LiveKit/mediasoup).
 */

export const MEDIA_STATES = ['idle', 'requesting', 'ready', 'reconnecting', 'audio-only', 'ended', 'denied'];

export async function requestMediaTracks() {
  return navigator.mediaDevices.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true } });
}

export function createLoopbackPeer({ onConnectionState, onIceState, onStats }) {
  const pc = new RTCPeerConnection({ iceServers: [] });
  let localStream = null;
  let statsTimer = null;

  pc.onconnectionstatechange = () => onConnectionState?.(pc.connectionState);
  pc.oniceconnectionstatechange = () => onIceState?.(pc.iceConnectionState);

  async function start(stream) {
    localStream = stream;
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    const answer = await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: offer.sdp }));
    statsTimer = setInterval(async () => {
      try {
        const stats = await pc.getStats();
        let rtt = 0; let jitter = 0; let lost = 0; let total = 0;
        stats.forEach((report) => {
          if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.currentRoundTripTime != null) {
            rtt = Math.round(report.currentRoundTripTime * 1000);
          }
          if (report.type === 'inbound-rtp' || report.type === 'remote-inbound-rtp') {
            if (report.jitter != null) jitter = Math.round(report.jitter * 1000);
            if (report.packetsLost != null) lost += report.packetsLost;
            if (report.packetsReceived != null) total += report.packetsReceived;
          }
        });
        const packetLoss = total + lost > 0 ? Math.round((lost / (total + lost)) * 1000) / 10 : 0;
        const sample = { latencyMs: rtt, jitterMs: jitter, packetLoss };
        onStats?.(sample);
        reportTelemetry(sample);
      } catch { /* stats may be unavailable during reconnect */ }
    }, 2000);
    return answer;
  }

  function stop() {
    if (statsTimer) clearInterval(statsTimer);
    localStream?.getTracks().forEach((track) => track.stop());
    pc.close();
  }

  return { pc, start, stop };
}

async function reportTelemetry({ latencyMs, packetLoss, jitterMs }) {
  try {
    const session = await getSession();
    await fetch('/api/data/telemetry', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${session.accessToken}`, 'x-tenant-id': 'northstar', 'idempotency-key': `rtc-${crypto.randomUUID()}` },
      body: JSON.stringify({ interviewId: 'int-2048', latencyMs, packetLoss, jitterMs }),
    });
  } catch { /* telemetry is best-effort */ }
}

async function getSession() {
  try {
    const raw = sessionStorage.getItem('signalroom:api-session:v1');
    const session = raw ? JSON.parse(raw) : null;
    if (session?.accessToken) return session;
  } catch { /* ignore */ }
  throw new Error('Sign in on the main app first (no silent demo login).');
}

export function mediaStateLabel(state) {
  return ({ idle: 'Idle', requesting: 'Requesting devices…', ready: 'Live RTC', reconnecting: 'Reconnecting…', 'audio-only': 'Audio only', ended: 'Ended', denied: 'Camera or microphone denied' })[state] || state;
}
