import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { createLoopbackPeer, mediaStateLabel, requestMediaTracks } from './lib/rtcClient.js';
import { createMeshController } from '../../../src/lib/rtcMesh.js';

const QUALITY_LABEL = (sample) => {
  if (!sample) return 'Waiting for stats…';
  if (sample.packetLoss > 3 || sample.latencyMs > 500) return 'Poor';
  if (sample.packetLoss > 1 || sample.latencyMs > 200) return 'Fair';
  return 'Good';
};

function readSession() {
  try {
    const raw = sessionStorage.getItem('signalroom:api-session:v1');
    const session = raw ? JSON.parse(raw) : null;
    if (session?.accessToken) return session;
  } catch { /* ignore */ }
  return null;
}

function QualityPanel({ sample, connection, iceState, onRestartIce }) {
  return <section className="rtc-panel quality-panel">
    <h2>Media quality telemetry</h2>
    <div className="rtc-quality-grid">
      <article><span>RTT</span><strong>{sample?.latencyMs != null ? `${sample.latencyMs} ms` : '—'}</strong></article>
      <article><span>Jitter</span><strong>{sample?.jitterMs != null ? `${sample.jitterMs} ms` : '—'}</strong></article>
      <article><span>Packet loss</span><strong>{sample?.packetLoss != null ? `${sample.packetLoss}%` : '—'}</strong></article>
      <article><span>Overall</span><strong className={`quality-${QUALITY_LABEL(sample).toLowerCase()}`}>{QUALITY_LABEL(sample)}</strong></article>
    </div>
    <div className="rtc-state-row"><span>Peer connection: <b>{connection || 'new'}</b></span><span>ICE: <b>{iceState || 'new'}</b></span></div>
    <button className="rtc-btn" onClick={onRestartIce}>Restart ICE (reconnect test)</button>
    <p className="rtc-micro">Samples are sent to <code>/api/data/telemetry</code> every 2s. This room is <b>peer-to-peer</b>, not LiveKit.</p>
  </section>;
}

export function App() {
  const params = new URLSearchParams(window.location.search);
  const interviewId = params.get('interview') || 'int-2048';
  const invitationToken = params.get('invite') || undefined;
  const [mediaState, setMediaState] = useState('idle');
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [connection, setConnection] = useState(null);
  const [iceState, setIceState] = useState(null);
  const [sample, setSample] = useState(null);
  const [presence, setPresence] = useState([]);
  const [roomStatus, setRoomStatus] = useState('disconnected');
  const [remoteStream, setRemoteStream] = useState(null);
  const videoRef = useRef(null);
  const remoteRef = useRef(null);
  const streamRef = useRef(null);
  const peerRef = useRef(null);
  const socketRef = useRef(null);
  const meshRef = useRef(null);

  const stopEverything = () => {
    meshRef.current?.stop();
    meshRef.current = null;
    peerRef.current?.stop();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (remoteRef.current) remoteRef.current.srcObject = null;
    setRemoteStream(null);
  };

  useEffect(() => () => { stopEverything(); socketRef.current?.disconnect(); }, []);

  useEffect(() => {
    if (remoteRef.current) remoteRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  const connectRoom = async (session) => {
    const socket = io({
      path: '/socket.io',
      auth: { token: session.accessToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 4,
      timeout: 7000,
    });
    socketRef.current = socket;
    meshRef.current = createMeshController({
      selfId: session.principal?.id,
      sendSignal: (kind, payload) => socket.emit('room.signal', { interviewId, kind, payload }),
      onRemoteStream: (_id, stream) => setRemoteStream(stream),
      onConnectionState: (state) => setConnection(state),
    });
    socket.on('connect', () => {
      setRoomStatus('connected');
      socket.emit('room.join', { interviewId, invitationToken }, (result) => {
        if (result?.ok) {
          setPresence(result.participants);
          meshRef.current?.syncPresence(result.participants);
        } else setRoomStatus(`join denied: ${result?.error || 'unknown'}`);
      });
    });
    socket.on('presence.updated', ({ participants }) => {
      setPresence(participants);
      meshRef.current?.syncPresence(participants);
    });
    socket.on('room.signal', (event) => meshRef.current?.handleSignal(event.kind, event.payload, event.userId));
    socket.on('disconnect', () => setRoomStatus('reconnecting'));
  };

  const startMedia = async () => {
    const session = readSession();
    if (!session?.accessToken) {
      setRoomStatus('sign in on the main app first');
      setMediaState('denied');
      return;
    }
    setMediaState('requesting');
    try {
      const stream = await requestMediaTracks();
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      const peer = createLoopbackPeer({
        onConnectionState: (state) => setConnection(state),
        onIceState: (state) => setIceState(state),
        onStats: setSample,
      });
      peerRef.current = peer;
      await peer.start(stream);
      await connectRoom(session);
      meshRef.current?.setLocalStream(stream);
      setMediaState('ready');
    } catch {
      setMediaState('denied');
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    socketRef.current?.emit('room.action', { interviewId, action: 'microphone.changed', value: next });
  };

  const toggleCamera = () => {
    const next = !cameraOn;
    setCameraOn(next);
    streamRef.current?.getVideoTracks().forEach((track) => { track.enabled = next; });
    socketRef.current?.emit('room.action', { interviewId, action: 'camera.changed', value: next });
  };

  const restartIce = async () => {
    try {
      const pc = peerRef.current?.pc;
      if (!pc) return;
      setConnection('restarting');
      await pc.setLocalDescription(await pc.createOffer({ iceRestart: true }));
    } catch { /* ignore */ }
  };

  return <main className="rtc-shell">
    <header className="rtc-topbar"><div><span className="rtc-eyebrow">SIGNALROOM RTC INTERVIEW</span><h1>Peer-to-peer WebRTC room</h1></div><span className={`rtc-badge room-${roomStatus}`}>{roomStatus}</span></header>
    <p className="rtc-honesty">Not an SFU. LiveKit is not connected. Join the same <code>interview</code> id from Live Studio. Current room: <b>{interviewId}</b></p>
    <section className="rtc-stage">
      {mediaState === 'idle' ? (
        <div className="rtc-welcome">
          <h2>Device consent required</h2>
          <p>Starting media asks for camera and microphone access. Sign in on the main app first so Socket.IO can use your session JWT. Tracks stop when you leave.</p>
          <button className="rtc-btn primary" onClick={startMedia}>Start camera & microphone</button>
        </div>
      ) : mediaState === 'denied' ? (
        <div className="rtc-welcome"><h2>Permission or session missing</h2><p>Enable camera/microphone, and sign in on the main interview app, then try again.</p><button className="rtc-btn primary" onClick={startMedia}>Try again</button></div>
      ) : (
        <div className="rtc-video-wrap">
          <video ref={videoRef} autoPlay playsInline muted className="rtc-video" aria-label="Local camera preview" />
          {remoteStream && <video ref={remoteRef} autoPlay playsInline className="rtc-video rtc-remote" aria-label="Remote participant" />}
          <div className="rtc-local-label"><i /> You · {mediaStateLabel(mediaState)}</div>
          <div className="rtc-controls">
            <button className={`rtc-btn ${muted ? 'is-off' : ''}`} onClick={toggleMute}>{muted ? 'Unmute' : 'Mute'}</button>
            <button className={`rtc-btn ${cameraOn ? '' : 'is-off'}`} onClick={toggleCamera}>{cameraOn ? 'Camera on' : 'Camera off'}</button>
            <button className="rtc-btn danger" onClick={() => { stopEverything(); setMediaState('idle'); }}>Leave room</button>
          </div>
        </div>
      )}
      {mediaState === 'ready' && <QualityPanel sample={sample} connection={connection} iceState={iceState} onRestartIce={restartIce} />}
    </section>
    <section className="rtc-presence"><b>Room presence ({presence.length})</b>{presence.map((p) => <span key={p.userId}>{p.name} · {p.roles.join(', ')}</span>)}</section>
  </main>;
}
