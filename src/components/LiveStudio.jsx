import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';
import { copilotSeed, intelligenceSignals, scorecardCriteria, transcriptSeed } from '../data/platformData.js';
import { calculateScorecard, recommendationFor } from '../lib/scorecard.js';
import { connectInterviewRoom } from '../lib/realtimeClient.js';
import { applyMediaEnhancement, applyTrackConstraints, createWhiteboardSession, provisionMediaSession, requestDeviceTracks, requestDisplayMedia, stopDeviceTracks } from '../lib/mediaClient.js';
import { createMeshController } from '../lib/rtcMesh.js';
import { getSession, isRemoteApiEnabled } from '../lib/session.js';

function PlaceholderTile({ name, role, compact = false }) {
  return (
    <div className={`video-tile gradient-indigo ${compact ? 'is-compact' : ''}`}>
      <div className="video-grid-lines" />
      <span className="video-role-label">{role}</span>
      <div className="video-person"><span className="video-person-shadow" /><span className="video-head"><i /></span><span className="video-body" /></div>
      <div className="video-footer"><span className="video-name">{name}</span><span className="video-state">Waiting for camera</span></div>
    </div>
  );
}

function LiveTile({ stream, label, muted, blur, compact }) {
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream || null;
  }, [stream]);
  return (
    <div className={`video-tile is-rtc-preview ${compact ? 'is-compact' : ''}`}>
      <video ref={ref} autoPlay playsInline muted={muted} style={blur ? { filter: 'blur(12px)' } : undefined} aria-label={label} />
      <span className="video-role-label">{label}</span>
    </div>
  );
}

function CopilotPanel({ onAction, queued }) {
  return <div className="room-panel-body copilot-panel">
    <div className="panel-intro"><span className="copilot-star"><Icon name="sparkles" size={16} /></span><div><strong>Private copilot</strong><p>Seeded until Phase U4 wires a model</p></div><span className="privacy-lock"><Icon name="lock" size={13} /> Private</span></div>
    <div className="signal-mini-grid">
      {intelligenceSignals.slice(0, 2).map((signal) => <div key={signal.label}><span>{signal.label}</span><strong>{signal.value}</strong><i><b style={{ width: `${signal.progress}%` }} /></i></div>)}
    </div>
    <div className="copilot-section-title"><span>LIVE GUIDANCE</span><button onClick={() => onAction('Generated a fresh, rubric-grounded prompt.')}>Refresh</button></div>
    <div className="copilot-cards">
      {copilotSeed.map((item) => <article className={`copilot-card copilot-${item.type}`} key={item.id}><span className="copilot-card-icon"><Icon name={item.type === 'coverage' ? 'target' : item.type === 'followup' ? 'sparkles' : 'check'} size={16} /></span><div><small>{item.title}</small><p>{item.text}</p><button onClick={() => onAction(`${item.action}.`)}>{item.action} <Icon name="arrowUpRight" size={13} /></button></div></article>)}
    </div>
    {queued.length > 0 && <div className="queued-prompt"><Icon name="check" size={15} /><span><b>{queued.length} prompt{queued.length > 1 ? 's' : ''} queued</b><small>Only you can see these notes.</small></span></div>}
    <div className="ai-disclosure"><Icon name="shield" size={15} /> AI suggestions require human judgment and are retained in the decision audit trail.</div>
  </div>;
}

function TranscriptPanel({ transcript, captions, onToggleCaptions }) {
  return <div className="room-panel-body transcript-panel">
    <div className="transcript-toolbar"><div><strong>Live transcript</strong><span><i className="tiny-live-dot" /> {captions ? 'Captions enabled' : 'Captions paused'} · seeded until ASR</span></div><button className={`toggle ${captions ? 'is-on' : ''}`} onClick={onToggleCaptions} aria-pressed={captions}><i /></button></div>
    <div className="transcript-search"><Icon name="search" size={16} /><input aria-label="Search transcript" placeholder="Search transcript" /></div>
    <div className="transcript-list">
      {transcript.map((segment) => <article className={`transcript-segment ${segment.tone}`} key={segment.id}><div><span>{segment.speaker}</span><time>{segment.time}</time></div><p>{segment.text}</p><button aria-label={`Save excerpt from ${segment.speaker}`}><Icon name="copy" size={13} /></button></article>)}
    </div>
    <button className="button button-secondary full"><Icon name="download" size={16} /> Export permitted transcript</button>
  </div>;
}

function ScorecardPanel({ criteria, candidateName, onScore, onSubmit, submitting }) {
  const summary = useMemo(() => calculateScorecard(criteria), [criteria]);
  return <div className="room-panel-body scorecard-panel">
    <div className="scorecard-summary"><div><span className="section-kicker">INDEPENDENT SCORECARD</span><h3>{candidateName}</h3><p>Locked from other panelists until you submit.</p></div><div className="score-ring"><b>{summary.completeness}%</b><span>complete</span></div></div>
    <div className="scorecard-criteria">
      {criteria.map((criterion) => <article key={criterion.id} className="criterion"><div className="criterion-top"><div><strong>{criterion.label}</strong><span>{criterion.weight}% weight</span></div><span className={Number.isFinite(criterion.score) ? 'criterion-score' : 'criterion-missing'}>{Number.isFinite(criterion.score) ? `${criterion.score}/5` : 'Required'}</span></div><div className="score-buttons" aria-label={`Score ${criterion.label}`}>{[1, 2, 3, 4, 5].map((score) => <button key={score} className={criterion.score === score ? 'is-selected' : ''} aria-label={`Score ${score} out of 5`} onClick={() => onScore(criterion.id, score)}>{score}</button>)}</div>{criterion.evidence && <p className="evidence-line"><Icon name="file" size={14} /> {criterion.evidence}</p>}</article>)}
    </div>
    <div className="scorecard-footer"><span><b>{recommendationFor(summary)}</b><small>Weighted average {summary.average || '—'} / 5</small></span><button className="button button-primary" disabled={submitting} onClick={() => onSubmit(summary)}>{submitting ? 'Saving…' : 'Submit scorecard'} <Icon name="arrowUpRight" size={16} /></button></div>
  </div>;
}

function WhiteboardPanel({ strokes, onStroke, onClear }) {
  const canvasRef = useRef(null);
  const drawing = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f7f8fc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#4f42cb';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    for (const stroke of strokes) {
      ctx.beginPath();
      ctx.moveTo(stroke.x1 * canvas.width, stroke.y1 * canvas.height);
      ctx.lineTo(stroke.x2 * canvas.width, stroke.y2 * canvas.height);
      ctx.stroke();
    }
  }, [strokes]);

  const point = (event) => {
    const canvas = canvasRef.current;
    const box = canvas.getBoundingClientRect();
    return { x: (event.clientX - box.left) / box.width, y: (event.clientY - box.top) / box.height };
  };

  return <div className="room-panel-body whiteboard-panel">
    <div className="panel-intro"><span className="copilot-star"><Icon name="monitor" size={16} /></span><div><strong>Collaborative whiteboard</strong><p>Local canvas; strokes sync over Socket.IO. Not a CRDT.</p></div></div>
    <canvas
      ref={canvasRef}
      width={640}
      height={360}
      className="whiteboard-draw-canvas"
      aria-label="Collaborative whiteboard canvas"
      onPointerDown={(event) => { drawing.current = point(event); event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={(event) => {
        if (!drawing.current) return;
        const next = point(event);
        onStroke({ x1: drawing.current.x, y1: drawing.current.y, x2: next.x, y2: next.y });
        drawing.current = next;
      }}
      onPointerUp={() => { drawing.current = false; }}
    />
    <button className="button button-secondary full" onClick={onClear}>Clear local board</button>
  </div>;
}

export function LiveStudio({ onToast, onSaveScorecard, interviewId, invitationToken, interviewLabel }) {
  const apiMode = isRemoteApiEnabled();
  const session = getSession();
  const roomId = interviewId || (!apiMode ? 'int-2048' : '');
  const [activePanel, setActivePanel] = useState('copilot');
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [captions, setCaptions] = useState(true);
  const [transcript, setTranscript] = useState(transcriptSeed);
  const [criteria, setCriteria] = useState(scorecardCriteria);
  const [queued, setQueued] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState({ state: 'local', label: 'Local event adapter' });
  const [remotePeers, setRemotePeers] = useState([]);
  const [remoteStreams, setRemoteStreams] = useState({});
  const [mediaStatus, setMediaStatus] = useState({ state: 'idle', label: 'Camera off until you enable it' });
  const [enhancement, setEnhancement] = useState({ blur: false, noiseSuppression: true, echoCancellation: true });
  const [shareError, setShareError] = useState('');
  const [sharing, setSharing] = useState(false);
  const [strokes, setStrokes] = useState([]);
  const [rtcStream, setRtcStream] = useState(null);
  const rtcStreamRef = useRef(null);
  const [left, setLeft] = useState(false);
  const mediaSessionRef = useRef(null);
  const realtimeRef = useRef(null);
  const meshRef = useRef(null);
  const displayStreamRef = useRef(null);
  const [code, setCode] = useState(`function reconcileEdits(local, remote) {\n  const byId = new Map(remote.map(item => [item.id, item]));\n  for (const change of local) {\n    if (!byId.has(change.id) || change.updatedAt > byId.get(change.id).updatedAt) {\n      byId.set(change.id, change);\n    }\n  }\n  return [...byId.values()];\n}`);

  const stopAllMedia = () => {
    stopDeviceTracks(rtcStreamRef.current);
    stopDeviceTracks(displayStreamRef.current);
    displayStreamRef.current = null;
    rtcStreamRef.current = null;
    setRtcStream(null);
    meshRef.current?.stop();
    meshRef.current = null;
  };

  useEffect(() => {
    if (!roomId || left) return undefined;
    let disposed = false;
    connectInterviewRoom(roomId, {
      onStatus: (status) => !disposed && setRealtimeStatus(status),
      onPresence: (participants) => {
        if (disposed) return;
        setRemotePeers(participants || []);
        meshRef.current?.syncPresence(participants || []);
      },
      onRoomAction: (event) => !disposed && onToast(`${event.name} updated ${event.action.replace('.changed', '')}.`),
      onSignal: (event) => {
        if (event.kind === 'whiteboard.stroke' && event.payload) {
          setStrokes((items) => [...items.slice(-400), event.payload]);
          return;
        }
        meshRef.current?.handleSignal(event.kind, event.payload, event.userId);
      },
    }, { invitationToken }).then((client) => {
      if (disposed) {
        client.disconnect();
        return;
      }
      realtimeRef.current = client;
      meshRef.current = createMeshController({
        selfId: client.selfId || session?.principal?.id || 'local',
        sendSignal: (kind, payload) => client.sendSignal(kind, payload),
        onRemoteStream: (userId, stream) => setRemoteStreams((current) => ({ ...current, [userId]: stream })),
        onRemoteGone: (userId) => setRemoteStreams((current) => {
          const next = { ...current };
          delete next[userId];
          return next;
        }),
        onConnectionState: (state) => setMediaStatus((current) => ({ ...current, ice: state })),
      });
    }).catch(() => !disposed && setRealtimeStatus({ state: 'error', label: 'Realtime fallback active' }));
    return () => { disposed = true; realtimeRef.current?.disconnect(); realtimeRef.current = null; };
  }, [roomId, invitationToken, left, onToast, session?.principal?.id]);

  useEffect(() => {
    if (!roomId || left) return undefined;
    let disposed = false;
    provisionMediaSession(roomId, { region: 'ap-southeast-1' }).then((sessionRecord) => {
      if (disposed) return;
      mediaSessionRef.current = sessionRecord;
    }).catch(() => {});
    return () => { disposed = true; };
  }, [roomId, left]);

  useEffect(() => () => { stopAllMedia(); }, []);

  const enableRealCamera = async () => {
    try {
      const stream = await requestDeviceTracks();
      rtcStreamRef.current = stream;
      setRtcStream(stream);
      meshRef.current?.setLocalStream(stream);
      setMediaStatus({ state: 'ready', label: 'Camera on · peer-to-peer mesh (not LiveKit)' });
      onToast('Camera enabled. Tracks stop when you leave the room.');
    } catch {
      setMediaStatus({ state: 'error', label: 'Camera or microphone denied' });
      onToast('Camera or microphone access was denied. You can stay in the waiting room without media.');
    }
  };

  const disableRealCamera = () => {
    stopDeviceTracks(rtcStream);
    setRtcStream(null);
    setMediaStatus({ state: 'idle', label: 'Camera off until you enable it' });
  };

  const handleShare = async () => {
    setShareError('');
    if (sharing) {
      stopDeviceTracks(displayStreamRef.current);
      displayStreamRef.current = null;
      const cameraTrack = rtcStream?.getVideoTracks()[0] || null;
      meshRef.current?.replaceVideoTrack(cameraTrack);
      setSharing(false);
      realtimeRef.current?.sendAction('screen-share.changed', false);
      onToast('Screen sharing stopped.');
      return;
    }
    try {
      const display = await requestDisplayMedia();
      displayStreamRef.current = display;
      const track = display.getVideoTracks()[0];
      meshRef.current?.replaceVideoTrack(track);
      track.addEventListener('ended', () => {
        meshRef.current?.replaceVideoTrack(rtcStream?.getVideoTracks()[0] || null);
        setSharing(false);
      });
      setSharing(true);
      realtimeRef.current?.sendAction('screen-share.changed', true);
      onToast('Screen sharing started with a real display track.');
    } catch (error) {
      const reason = error?.code === 'display-unsupported' ? 'This browser cannot share a screen (getDisplayMedia missing).' : 'Screen share was cancelled or blocked.';
      setShareError(reason);
      onToast(reason);
    }
  };

  const handleEnhancement = async (feature) => {
    const next = { ...enhancement, [feature]: !enhancement[feature] };
    setEnhancement(next);
    if (feature !== 'blur' && rtcStream) {
      const applied = await applyTrackConstraints(rtcStream, next);
      if (applied.fallback?.length) onToast('This browser could not apply audio constraints. Toggle is local-only.');
    }
    const sessionId = mediaSessionRef.current?.id || `media-local-${roomId}`;
    await applyMediaEnhancement(sessionId, session?.principal?.id || 'local', next);
    if (feature === 'blur') onToast('Blur is a local CSS preview, not SFU background replacement.');
  };

  const handleWhiteboardStroke = (stroke) => {
    setStrokes((items) => [...items.slice(-400), stroke]);
    realtimeRef.current?.sendSignal('whiteboard.stroke', stroke);
  };

  const saveScorecard = async (summary) => {
    if (!roomId) return;
    setSubmitting(true);
    try {
      await onSaveScorecard(roomId, { criteria, ...summary, recommendation: recommendationFor(summary) });
      onToast(summary.completeness === 100 ? 'Independent scorecard submitted and audit event recorded.' : 'Scorecard saved as a draft; required evidence remains.');
    } finally {
      setSubmitting(false);
    }
  };

  const leaveRoom = () => {
    stopAllMedia();
    realtimeRef.current?.disconnect();
    setLeft(true);
    setMediaStatus({ state: 'ended', label: 'You left the room. Tracks stopped.' });
    onToast('You left the room. Media tracks were stopped.');
  };

  const addTranscript = () => {
    const next = { id: Date.now(), speaker: session?.principal?.name || 'You', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), text: 'Let’s make the conflict-resolution rule concrete. Which version wins when two edits have the same timestamp?', tone: 'interviewer' };
    setTranscript((items) => [...items, next]);
    setQueued((items) => [...items, 'Conflict resolution']);
    onToast('A local note was added. Live ASR is not wired (Phase U4).');
  };

  const remoteEntries = Object.entries(remoteStreams);
  const panels = {
    copilot: <CopilotPanel queued={queued} onAction={(message) => { setQueued((items) => [...items, message]); onToast(message); }} />,
    transcript: <TranscriptPanel transcript={transcript} captions={captions} onToggleCaptions={() => setCaptions((value) => { const next = !value; realtimeRef.current?.sendAction('caption.changed', next); return next; })} />,
    scorecard: <ScorecardPanel candidateName={interviewLabel || 'Candidate'} criteria={criteria} onScore={(id, score) => setCriteria((items) => items.map((criterion) => criterion.id === id ? { ...criterion, score } : criterion))} onSubmit={saveScorecard} submitting={submitting} />,
    whiteboard: <WhiteboardPanel strokes={strokes} onStroke={handleWhiteboardStroke} onClear={() => setStrokes([])} />,
  };

  if (!roomId) {
    return <main className="page studio-page"><section className="surface-card consent-card"><span className="pill pill-amber">NO ROOM</span><h2>Select an interview or open an invitation</h2><p className="candidate-card-intro">Live Studio joins a real interview id. Create one as a recruiter, or enter from the candidate portal.</p></section></main>;
  }

  if (left) {
    return <main className="page studio-page"><section className="surface-card consent-card"><h2>You left the room</h2><p className="candidate-card-intro">Camera and microphone tracks were stopped. Re-open the interview to join again.</p></section></main>;
  }

  return (
    <main className="page studio-page">
      <p className="sfu-honesty-banner" role="status">Media path: <b>browser peer-to-peer WebRTC</b>. LiveKit/mediasoup is <b>not</b> connected. Same-machine two-browser join works; remote NAT may need TURN later.</p>
      <section className="room-status-bar">
        <div className="room-breadcrumb"><span className="live-session-badge"><i className="pulse-dot" /> LIVE</span><span>{interviewLabel || 'Interview'}</span><Icon name="chevronRight" size={14} /><b>{roomId}</b></div>
        <div className="room-network"><span className={`realtime-status realtime-${realtimeStatus.state}`}><i /><Icon name="activity" size={14} /> {realtimeStatus.label}{remotePeers.length ? ` · ${remotePeers.length} present` : ''}</span><span className={`realtime-status media-${mediaStatus.state}`}><i /><Icon name="video" size={14} /> {mediaStatus.label}</span></div>
      </section>

      <section className="studio-layout">
        <div className="studio-main">
          <div className="video-stage">
            {rtcStream ? <LiveTile stream={rtcStream} label="You · local camera" muted blur={enhancement.blur} /> : <PlaceholderTile name={session?.principal?.name || 'You'} role="Enable camera to publish" />}
            {remoteEntries[0] ? <LiveTile stream={remoteEntries[0][1]} label="Remote participant" /> : <PlaceholderTile name="Waiting for peer" role="Second browser joins the same interview id" />}
            {remoteEntries[1] ? <div className="compact-video-grid"><LiveTile stream={remoteEntries[1][1]} label="Peer" compact /></div> : null}
            <div className="stage-label"><Icon name="sparkles" size={15} /> AI assist is private to interviewers · copilot still seeded</div>
          </div>
          <div className="room-controls" aria-label="Video interview controls">
            <button className={`room-control ${muted ? 'is-off' : ''}`} onClick={() => { const next = !muted; setMuted(next); rtcStream?.getAudioTracks().forEach((track) => { track.enabled = !next; }); realtimeRef.current?.sendAction('microphone.changed', next); }} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}><Icon name={muted ? 'micOff' : 'mic'} size={20} /><span>{muted ? 'Unmute' : 'Mute'}</span></button>
            <button className={`room-control ${!cameraOn ? 'is-off' : ''}`} onClick={() => { const next = !cameraOn; setCameraOn(next); rtcStream?.getVideoTracks().forEach((track) => { track.enabled = next; }); realtimeRef.current?.sendAction('camera.changed', next); }} aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'}><Icon name={cameraOn ? 'video' : 'videoOff'} size={20} /><span>Camera</span></button>
            <button className={`room-control ${sharing ? 'is-active' : ''}`} onClick={handleShare} aria-pressed={sharing}><Icon name="monitor" size={20} /><span>Share</span></button>
            <button className={`room-control ${rtcStream ? 'is-active' : ''}`} onClick={rtcStream ? disableRealCamera : enableRealCamera} aria-pressed={Boolean(rtcStream)} aria-label="Toggle real camera"><Icon name="video" size={20} /><span>{rtcStream ? 'Stop camera' : 'Enable camera'}</span></button>
            <button className="room-control" onClick={() => setActivePanel('transcript')}><Icon name="file" size={20} /><span>Transcript</span></button>
            <button className={`room-control ${activePanel === 'whiteboard' ? 'is-active' : ''}`} onClick={() => { setActivePanel('whiteboard'); createWhiteboardSession(mediaSessionRef.current?.id || `media-local-${roomId}`); }}><Icon name="monitor" size={20} /><span>Whiteboard</span></button>
            <button className={`room-control ${enhancement.blur ? 'is-active' : ''}`} onClick={() => handleEnhancement('blur')} aria-pressed={enhancement.blur} aria-label="Toggle background blur"><Icon name="sparkles" size={20} /><span>Blur</span></button>
            <span className="control-divider" />
            <button className="room-control danger" onClick={leaveRoom}><Icon name="phoneOff" size={20} /><span>Leave</span></button>
          </div>
          {shareError && <p className="microcopy" role="status">{shareError}</p>}

          <section className="code-workspace surface-card">
            <div className="code-toolbar"><div className="code-tabs"><button className="code-tab is-active"><Icon name="code" size={16} /> reconcile.js <span>●</span></button></div><div><span className="sync-state"><i /> Local textarea — not Monaco/CRDT</span></div></div>
            <div className="code-editor-shell"><div className="line-numbers">1<br />2<br />3<br />4<br />5<br />6<br />7<br />8<br />9</div><textarea value={code} onChange={(event) => setCode(event.target.value)} aria-label="Collaborative code editor" spellCheck="false" /></div>
            <div className="code-footer"><span><Icon name="check" size={15} /> Hidden tests are not an isolated sandbox</span><span>JavaScript · UTF-8</span><button onClick={addTranscript}>Ask about this implementation <Icon name="arrowUpRight" size={14} /></button></div>
          </section>
        </div>

        <aside className="studio-panel surface-card">
          <div className="room-panel-tabs" role="tablist" aria-label="Interview tools">
            <button role="tab" aria-selected={activePanel === 'copilot'} className={activePanel === 'copilot' ? 'is-active' : ''} onClick={() => setActivePanel('copilot')}><Icon name="sparkles" size={16} /> Copilot</button>
            <button role="tab" aria-selected={activePanel === 'transcript'} className={activePanel === 'transcript' ? 'is-active' : ''} onClick={() => setActivePanel('transcript')}><Icon name="file" size={16} /> Transcript</button>
            <button role="tab" aria-selected={activePanel === 'scorecard'} className={activePanel === 'scorecard' ? 'is-active' : ''} onClick={() => setActivePanel('scorecard')}><Icon name="target" size={16} /> Scorecard</button>
            <button role="tab" aria-selected={activePanel === 'whiteboard'} className={activePanel === 'whiteboard' ? 'is-active' : ''} onClick={() => setActivePanel('whiteboard')}><Icon name="monitor" size={16} /> Whiteboard</button>
          </div>
          {panels[activePanel]}
        </aside>
      </section>
    </main>
  );
}
