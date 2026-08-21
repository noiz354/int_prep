/** Mesh WebRTC for two (or a few) local browsers. Not an SFU. */

export function shouldOffer(selfId, remoteId) {
  return String(selfId) < String(remoteId);
}

export function createMeshController({
  selfId,
  sendSignal,
  onRemoteStream,
  onRemoteGone,
  onConnectionState,
}) {
  const peers = new Map();
  let localStream = null;

  function ensurePeer(remoteId) {
    if (peers.has(remoteId)) return peers.get(remoteId);
    const pc = new RTCPeerConnection({ iceServers: [] });
    const entry = { pc, remoteId };
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
    pc.onconnectionstatechange = () => onConnectionState?.(pc.connectionState, remoteId);
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
