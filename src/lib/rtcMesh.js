/** Mesh WebRTC for two (or a few) local browsers. Not an SFU. */

export function shouldOffer(selfId, remoteId) {
  return String(selfId) < String(remoteId);
}

/** Connection recovery state machine for ICE restart. */
export const CONNECTION_STATES = ['connected', 'reconnecting', 'failed'];

export const MAX_ICE_RESTARTS = 3;
export const ICE_RESTART_DELAY_MS = 2000;

export function createConnectionRecovery({ onStateChange, maxRestarts = MAX_ICE_RESTARTS }) {
  let restartCount = 0;
  let state = 'connected';
  let restartTimer = null;

  function setState(next) {
    if (state === next) return;
    state = next;
    onStateChange?.(next, restartCount);
  }

  function scheduleRestart(pc) {
    if (restartCount >= maxRestarts) {
      setState('failed');
      return;
    }
    setState('reconnecting');
    restartTimer = setTimeout(async () => {
      restartCount++;
      try {
        await pc.setLocalDescription(await pc.createOffer({ iceRestart: true }));
      } catch { /* ICE restart failed — will retry on next statechange */ }
    }, ICE_RESTART_DELAY_MS);
  }

  function reset() {
    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = null;
    restartCount = 0;
    setState('connected');
  }

  function cancel() {
    if (restartTimer) clearTimeout(restartTimer);
    restartTimer = null;
  }

  return { scheduleRestart, reset, cancel, get state() { return state; }, get restartCount() { return restartCount; } };
}

let cachedIceServers = null;
let iceServersExpiry = 0;

export async function fetchTurnCredentials() {
  if (cachedIceServers && Date.now() < iceServersExpiry) return cachedIceServers;
  try {
    const session = (() => { try { const raw = sessionStorage.getItem('signalroom:api-session:v1'); return raw ? JSON.parse(raw) : null; } catch { return null; } })();
    const headers = { 'content-type': 'application/json' };
    if (session?.accessToken) headers.authorization = `Bearer ${session.accessToken}`;
    const res = await fetch('/api/media/turn-credentials', { headers });
    if (!res.ok) return [];
    const { data } = await res.json();
    if (!data?.urls?.length) return [];
    cachedIceServers = [{ urls: data.urls, username: data.username || undefined, credential: data.credential || undefined }];
    iceServersExpiry = Date.now() + 55 * 60 * 1000; // refresh before 1h TTL
    return cachedIceServers;
  } catch { return []; }
}

export function createMeshController({
  selfId,
  sendSignal,
  onRemoteStream,
  onRemoteGone,
  onConnectionState,
  onRecoveryStateChange,
}) {
  const peers = new Map();
  let localStream = null;

  async function ensurePeer(remoteId) {
    if (peers.has(remoteId)) return peers.get(remoteId);
    const iceServers = await fetchTurnCredentials();
    const pc = new RTCPeerConnection({ iceServers });
    const recovery = createConnectionRecovery({
      onStateChange: (recoveryState, count) => onRecoveryStateChange?.(recoveryState, count, remoteId),
    });
    const entry = { pc, remoteId, recovery };
    if (localStream) {
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));
    }
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal('webrtc.ice', { to: remoteId, candidate: event.candidate.toJSON?.() || event.candidate });
      }
    };
    pc.ontrack = (event) => {
      const stream = event.streams[0] || new MediaStream([event.track]);
      onRemoteStream?.(remoteId, stream);
    };
    pc.onconnectionstatechange = () => {
      const cs = pc.connectionState;
      onConnectionState?.(cs, remoteId);
      if (cs === 'failed' || cs === 'disconnected') {
        entry.recovery.scheduleRestart(pc);
      } else if (cs === 'connected') {
        entry.recovery.reset();
      }
    };
    peers.set(remoteId, entry);
    return entry;
  }

  async function negotiate(remoteId) {
    if (!shouldOffer(selfId, remoteId)) return;
    const entry = ensurePeer(remoteId);
    const offer = await entry.pc.createOffer();
    await entry.pc.setLocalDescription(offer);
    sendSignal('webrtc.offer', { to: remoteId, sdp: entry.pc.localDescription });
  }

  async function handleSignal(kind, payload, fromUserId) {
    const remoteId = payload?.from || fromUserId;
    if (!remoteId || remoteId === selfId) return;
    if (payload?.to && payload.to !== selfId) return;
    const entry = ensurePeer(remoteId);
    if (kind === 'webrtc.offer' && payload.sdp) {
      await entry.pc.setRemoteDescription(payload.sdp);
      const answer = await entry.pc.createAnswer();
      await entry.pc.setLocalDescription(answer);
      sendSignal('webrtc.answer', { to: remoteId, sdp: entry.pc.localDescription });
    } else if (kind === 'webrtc.answer' && payload.sdp) {
      if (entry.pc.signalingState !== 'stable') {
        await entry.pc.setRemoteDescription(payload.sdp);
      }
    } else if (kind === 'webrtc.ice' && payload.candidate) {
      try {
        await entry.pc.addIceCandidate(payload.candidate);
      } catch {
        /* candidate may arrive before remote description */
      }
    }
  }

  function syncPresence(participants) {
    const ids = new Set((participants || []).map((item) => item.userId).filter((id) => id && id !== selfId));
    for (const id of ids) {
      ensurePeer(id);
      negotiate(id).catch(() => {});
    }
    for (const id of [...peers.keys()]) {
      if (!ids.has(id)) {
        peers.get(id).pc.close();
        peers.delete(id);
        onRemoteGone?.(id);
      }
    }
  }

  function setLocalStream(stream) {
    localStream = stream;
    if (!stream) return;
    for (const { pc } of peers.values()) {
      const senders = pc.getSenders();
      stream.getTracks().forEach((track) => {
        const sender = senders.find((item) => item.track?.kind === track.kind);
        if (sender) sender.replaceTrack(track);
        else pc.addTrack(track, stream);
      });
    }
  }

  function replaceVideoTrack(track) {
    for (const { pc } of peers.values()) {
      const sender = pc.getSenders().find((item) => item.track?.kind === 'video');
      sender?.replaceTrack(track);
    }
  }

  function stop() {
    for (const { pc } of peers.values()) pc.close();
    peers.clear();
  }

  return { handleSignal, syncPresence, setLocalStream, replaceVideoTrack, stop };
}
