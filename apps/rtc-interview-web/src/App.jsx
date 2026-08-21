import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { createLoopbackPeer, mediaStateLabel, requestMediaTracks } from './lib/rtcClient.js';

const QUALITY_LABEL = (sample) => {
  if (!sample) return 'Waiting for stats…';
  if (sample.packetLoss > 3 || sample.latencyMs > 500) return 'Poor';
  if (sample.packetLoss > 1 || sample.latencyMs > 200) return 'Fair';
  return 'Good';
};

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
    <p className="rtc-micro">Samples are sent to <code>/api/data/telemetry</code> every 2s → <code>media.rtc.latency_ms</code>, <code>media.rtc.packet_loss_percent</code>, <code>media.rtc.jitter_ms</code> in Prometheus/Grafana.</p>
  </section>;
}

export function App() {
  const [mediaState, setMediaState] = useState('idle');
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [connection, setConnection] = useState(null);
  const [iceState, setIceState] = useState(null);
  const [sample, setSample] = useState(null);
  const [presence, setPresence] = useState([]);
  const [roomStatus, setRoomStatus] = useState('disconnected');
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const peerRef = useRef(null);
  const socketRef = useRef(null);

  const stopEverything = () => {
    peerRef.current?.stop();
    peerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => () => { stopEverything(); socketRef.current?.disconnect(); }, []);

  const connectRoom = async () => {
    const socket = io({ path: '/socket.io', transports: ['websocket', 'polling'], reconnectionAttempts: 4, timeout: 7000 });
    socketRef.current = socket;
    socket.on('connect', () => {
      setRoomStatus('connected');
      socket.emit('room.join', { interviewId: 'int-2048' }, (result) => {
        if (result?.ok) setPresence(result.participants);
        else setRoomStatus(`join denied: ${result?.error || 'unknown'}`);
      });
    });
    socket.on('presence.updated', ({ participants }) => setPresence(participants));
    socket.on('disconnect', () => setRoomStatus('reconnecting'));
  };

  const startMedia = async () => {
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
      setMediaState('ready');
      await connectRoom();
    } catch {
      setMediaState('denied');
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    streamRef.current?.getAudioTracks().forEach((track) => { track.enabled = !next; });
    socketRef.current?.emit('room.action', { interviewId: 'int-2048', action: 'microphone.changed', value: next });
  };

  const toggleCamera = () => {
    const next = !cameraOn;
    setCameraOn(next);
    streamRef.current?.getVideoTracks().forEach((track) => { track.enabled = next; });
    socketRef.current?.emit('room.action', { interviewId: 'int-2048', action: 'camera.changed', value: next });
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
    <header className="rtc-topbar"><div><span className="rtc-eyebrow">SIGNALROOM RTC INTERVIEW</span><h1>Resilient WebRTC interview room</h1></div><span className={`rtc-badge room-${roomStatus}`}>{roomStatus}</span></header>
    <section className="rtc-stage">
      {mediaState === 'idle' ? (
        <div className="rtc-welcome">
          <h2>Device consent required</h2>
          <p>Starting media asks for camera and microphone access. Your tracks stop when you leave the room or disconnect.</p>
          <button className="rtc-btn primary" onClick={startMedia}>Start camera & microphone</button>
        </div>
      ) : mediaState === 'denied' ? (
        <div className="rtc-welcome"><h2>Permission denied</h2><p>Enable camera/microphone in your browser, then try again.</p><button className="rtc-btn primary" onClick={startMedia}>Try again</button></div>
      ) : (
        <div className="rtc-video-wrap">
          <video ref={videoRef} autoPlay playsInline muted className="rtc-video" aria-label="Local camera preview" />
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
