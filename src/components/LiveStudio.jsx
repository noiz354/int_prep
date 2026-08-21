import { useEffect, useMemo, useRef, useState } from 'react';
import { Icon } from './Icon.jsx';
import { copilotSeed, intelligenceSignals, liveParticipants, scorecardCriteria, transcriptSeed } from '../data/platformData.js';
import { calculateScorecard, recommendationFor } from '../lib/scorecard.js';
import { connectInterviewRoom } from '../lib/realtimeClient.js';
import { applyMediaEnhancement, createWhiteboardSession, provisionMediaSession, updateMediaState } from '../lib/mediaClient.js';

function VideoTile({ participant, compact = false, active = false, cameraOn }) {
  return (
    <div className={`video-tile gradient-${participant.gradient} ${compact ? 'is-compact' : ''} ${active ? 'is-active-speaker' : ''}`}>
      <div className="video-grid-lines" />
      <div className="video-ambient orb-a" /><div className="video-ambient orb-b" />
      <span className="video-role-label">{participant.role}</span>
      <div className="video-person">
        <span className="video-person-shadow" />
        <span className="video-head"><i /></span>
        <span className="video-body" />
      </div>
      <span className="video-initials">{participant.initials}</span>
      <div className="video-footer"><span className="video-name">{participant.name}</span><span className="video-state">{participant.speaking ? <><i className="voice-bars"><b /><b /><b /></i> Speaking</> : participant.muted ? <><Icon name="micOff" size={13} /> Muted</> : cameraOn ? <><Icon name="mic" size={13} /> On mic</> : <><Icon name="videoOff" size={13} /> Camera off</>}</span></div>
    </div>
  );
}

function CopilotPanel({ onAction, queued }) {
  return <div className="room-panel-body copilot-panel">
    <div className="panel-intro"><span className="copilot-star"><Icon name="sparkles" size={16} /></span><div><strong>Private copilot</strong><p>Grounded in the approved rubric</p></div><span className="privacy-lock"><Icon name="lock" size={13} /> Private</span></div>
    <div className="signal-mini-grid">
      {intelligenceSignals.slice(0, 2).map((signal) => <div key={signal.label}><span>{signal.label}</span><strong>{signal.value}</strong><i><b style={{ width: `${signal.progress}%` }} /></i></div>)}
    </div>
    <div className="copilot-section-title"><span>LIVE GUIDANCE</span><button onClick={() => onAction('Generated a fresh, rubric-grounded prompt.')}>Refresh</button></div>
    <div className="copilot-cards">
      {copilotSeed.map((item) => <article className={`copilot-card copilot-${item.type}`} key={item.id}><span className="copilot-card-icon"><Icon name={item.type === 'coverage' ? 'target' : item.type === 'followup' ? 'sparkles' : 'check'} size={16} /></span><div><small>{item.title}</small><p>{item.text}</p><button onClick={() => onAction(`${item.action} for Alex Morgan.`)}>{item.action} <Icon name="arrowUpRight" size={13} /></button></div></article>)}
    </div>
    {queued.length > 0 && <div className="queued-prompt"><Icon name="check" size={15} /><span><b>{queued.length} prompt{queued.length > 1 ? 's' : ''} queued</b><small>Only you can see these notes.</small></span></div>}
    <div className="ai-disclosure"><Icon name="shield" size={15} /> AI suggestions require human judgment and are retained in the decision audit trail.</div>
  </div>;
}

function TranscriptPanel({ transcript, captions, onToggleCaptions }) {
  return <div className="room-panel-body transcript-panel">
    <div className="transcript-toolbar"><div><strong>Live transcript</strong><span><i className="tiny-live-dot" /> {captions ? 'Captions enabled' : 'Captions paused'}</span></div><button className={`toggle ${captions ? 'is-on' : ''}`} onClick={onToggleCaptions} aria-pressed={captions}><i /></button></div>
    <div className="transcript-search"><Icon name="search" size={16} /><input aria-label="Search transcript" placeholder="Search transcript" /></div>
    <div className="transcript-list">
      {transcript.map((segment) => <article className={`transcript-segment ${segment.tone}`} key={segment.id}><div><span>{segment.speaker}</span><time>{segment.time}</time></div><p>{segment.text}</p><button aria-label={`Save excerpt from ${segment.speaker}`}><Icon name="copy" size={13} /></button></article>)}
    </div>
    <button className="button button-secondary full"><Icon name="download" size={16} /> Export permitted transcript</button>
  </div>;
}

function ScorecardPanel({ criteria, onScore, onSubmit, submitting }) {
  const summary = useMemo(() => calculateScorecard(criteria), [criteria]);
  return <div className="room-panel-body scorecard-panel">
    <div className="scorecard-summary"><div><span className="section-kicker">INDEPENDENT SCORECARD</span><h3>Alex Morgan</h3><p>Locked from other panelists until you submit.</p></div><div className="score-ring"><b>{summary.completeness}%</b><span>complete</span></div></div>
    <div className="scorecard-criteria">
      {criteria.map((criterion) => <article key={criterion.id} className="criterion"><div className="criterion-top"><div><strong>{criterion.label}</strong><span>{criterion.weight}% weight</span></div><span className={Number.isFinite(criterion.score) ? 'criterion-score' : 'criterion-missing'}>{Number.isFinite(criterion.score) ? `${criterion.score}/5` : 'Required'}</span></div><div className="score-buttons" aria-label={`Score ${criterion.label}`}>{[1, 2, 3, 4, 5].map((score) => <button key={score} className={criterion.score === score ? 'is-selected' : ''} aria-label={`Score ${score} out of 5`} onClick={() => onScore(criterion.id, score)}>{score}</button>)}</div>{criterion.evidence && <p className="evidence-line"><Icon name="file" size={14} /> {criterion.evidence}</p>}</article>)}
    </div>
    <div className="scorecard-footer"><span><b>{recommendationFor(summary)}</b><small>Weighted average {summary.average || '—'} / 5</small></span><button className="button button-primary" disabled={submitting} onClick={() => onSubmit(summary)}>{submitting ? 'Saving…' : 'Submit scorecard'} <Icon name="arrowUpRight" size={16} /></button></div>
  </div>;
}

function WhiteboardPanel({ whiteboard, onOpen }) {
  return <div className="room-panel-body whiteboard-panel">
    <div className="panel-intro"><span className="copilot-star"><Icon name="monitor" size={16} /></span><div><strong>Collaborative whiteboard</strong><p>Screen share requires a user gesture; host controls annotations</p></div></div>
    {whiteboard ? (
      <div className="whiteboard-canvas" aria-label="Collaborative whiteboard canvas">
        <div className="whiteboard-empty-state"><Icon name="pen" size={22} /><p>Annotate or share your screen. Consent is required before screen sharing starts.</p><span>{whiteboard.annotations.length} annotation{whiteboard.annotations.length === 1 ? '' : 's'} · {whiteboard.status}</span></div>
      </div>
    ) : (
      <button className="button button-secondary full" onClick={onOpen}><Icon name="monitor" size={16} /> Open whiteboard</button>
    )}
  </div>;
}

export function LiveStudio({ onToast, onSaveScorecard }) {
  const [activePanel, setActivePanel] = useState('copilot');
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [shared, setShared] = useState(false);
  const [captions, setCaptions] = useState(true);
  const [transcript, setTranscript] = useState(transcriptSeed);
  const [criteria, setCriteria] = useState(scorecardCriteria);
  const [queued, setQueued] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [realtimeStatus, setRealtimeStatus] = useState({ state: 'local', label: 'Local event adapter' });
  const [remotePeers, setRemotePeers] = useState([]);
  const [mediaStatus, setMediaStatus] = useState({ state: 'provisioning', label: 'Provisioning media session' });
  const [enhancement, setEnhancement] = useState({ blur: false, noiseSuppression: false, echoCancellation: false });
  const [whiteboard, setWhiteboard] = useState(null);
  const mediaSessionRef = useRef(null);
  const realtimeRef = useRef(null);
  const [code, setCode] = useState(`function reconcileEdits(local, remote) {\n  const byId = new Map(remote.map(item => [item.id, item]));\n  for (const change of local) {\n    if (!byId.has(change.id) || change.updatedAt > byId.get(change.id).updatedAt) {\n      byId.set(change.id, change);\n    }\n  }\n  return [...byId.values()];\n}`);

  useEffect(() => {
    let disposed = false;
    connectInterviewRoom('int-2048', {
      onStatus: (status) => !disposed && setRealtimeStatus(status),
      onPresence: (participants) => !disposed && setRemotePeers(participants),
      onRoomAction: (event) => !disposed && onToast(`${event.name} updated ${event.action.replace('.changed', '')}.`),
    }).then((client) => {
      if (disposed) client.disconnect();
      else realtimeRef.current = client;
    }).catch(() => !disposed && setRealtimeStatus({ state: 'error', label: 'Realtime fallback active' }));
    return () => { disposed = true; realtimeRef.current?.disconnect(); realtimeRef.current = null; };
  }, [onToast]);

  // Phase 2 — provision a resilient media session behind the control-plane adapter.
  useEffect(() => {
    let disposed = false;
    provisionMediaSession('int-2048', { region: 'ap-southeast-1' }).then((session) => {
      if (disposed) return;
      mediaSessionRef.current = session;
      setMediaStatus({ state: 'ready', label: `Media ready · ${session.sfuCluster}` });
    }).catch(() => !disposed && setMediaStatus({ state: 'error', label: 'Media session unavailable' }));
    return () => { disposed = true; };
  }, []);

  const addTranscript = () => {
    const next = { id: Date.now(), speaker: 'Maya Patel', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }), text: 'Let’s make the conflict-resolution rule concrete. Which version wins when two edits have the same timestamp?', tone: 'interviewer' };
    setTranscript((items) => [...items, next]);
    setQueued((items) => [...items, 'Conflict resolution']);
    onToast('A neutral follow-up was added to the live transcript.');
  };

  const handleCopilotAction = (message) => {
    setQueued((items) => [...items, message]);
    onToast(message);
  };

  const handleEnhancement = async (feature) => {
    const next = { ...enhancement, [feature]: !enhancement[feature] };
    setEnhancement(next);
    const sessionId = mediaSessionRef.current?.id || `media-local-int-2048`;
    const result = await applyMediaEnhancement(sessionId, 'maya', next);
    onToast(result.fallback?.length ? `Enhancement applied with browser fallback: ${result.fallback.join(', ')}.` : `Enhancement ${feature} ${next[feature] ? 'enabled' : 'disabled'}.`);
  };

  const handleWhiteboard = async () => {
    const sessionId = mediaSessionRef.current?.id || `media-local-int-2048`;
    const board = await createWhiteboardSession(sessionId);
    setWhiteboard(board);
    onToast('Collaborative whiteboard opened. Annotating is consent-gated and host-controlled.');
  };

  const saveScorecard = async (summary) => {
    setSubmitting(true);
    try {
      await onSaveScorecard({ criteria, ...summary, recommendation: recommendationFor(summary) });
      onToast(summary.completeness === 100 ? 'Independent scorecard submitted and audit event recorded.' : 'Scorecard saved as a draft; required evidence remains.');
    } finally {
      setSubmitting(false);
    }
  };

  const panels = {
    copilot: <CopilotPanel queued={queued} onAction={handleCopilotAction} />,
    transcript: <TranscriptPanel transcript={transcript} captions={captions} onToggleCaptions={() => setCaptions((value) => { const next = !value; realtimeRef.current?.sendAction('caption.changed', next); return next; })} />,
    scorecard: <ScorecardPanel criteria={criteria} onScore={(id, score) => setCriteria((items) => items.map((criterion) => criterion.id === id ? { ...criterion, score } : criterion))} onSubmit={saveScorecard} submitting={submitting} />,
    whiteboard: <WhiteboardPanel whiteboard={whiteboard} onOpen={handleWhiteboard} />,
  };

  return (
    <main className="page studio-page">
      <section className="room-status-bar">
        <div className="room-breadcrumb"><span className="live-session-badge"><i className="pulse-dot" /> LIVE</span><span>Senior Frontend Engineer</span><Icon name="chevronRight" size={14} /><b>Technical deep dive</b></div>
        <div className="room-network"><span><i className="network-good" /><Icon name="wifi" size={15} /> Excellent · 34 ms</span><span className={`realtime-status realtime-${realtimeStatus.state}`}><i /><Icon name="activity" size={14} /> {realtimeStatus.label}{remotePeers.length ? ` · ${remotePeers.length} present` : ''}</span><span className={`realtime-status media-${mediaStatus.state}`}><i /><Icon name="video" size={14} /> {mediaStatus.label}</span><span><Icon name="lock" size={14} /> Encrypted</span><span><Icon name="clock" size={14} /> 32:14 remaining</span></div>
      </section>

      <section className="studio-layout">
        <div className="studio-main">
          <div className="video-stage">
            <VideoTile participant={liveParticipants[0]} active cameraOn />
            <VideoTile participant={liveParticipants[1]} cameraOn={cameraOn} />
            <div className="compact-video-grid"><VideoTile participant={liveParticipants[2]} compact cameraOn /></div>
            <div className="stage-label"><Icon name="sparkles" size={15} /> AI assist is private to interviewers</div>
          </div>
          <div className="room-controls" aria-label="Video interview controls">
            <button className={`room-control ${muted ? 'is-off' : ''}`} onClick={() => { const next = !muted; setMuted(next); realtimeRef.current?.sendAction('microphone.changed', next); onToast(muted ? 'Microphone enabled.' : 'Microphone muted.'); }} aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}><Icon name={muted ? 'micOff' : 'mic'} size={20} /><span>{muted ? 'Unmute' : 'Mute'}</span></button>
            <button className={`room-control ${!cameraOn ? 'is-off' : ''}`} onClick={() => { const next = !cameraOn; setCameraOn(next); realtimeRef.current?.sendAction('camera.changed', next); onToast(cameraOn ? 'Camera paused.' : 'Camera enabled.'); }} aria-label={cameraOn ? 'Turn camera off' : 'Turn camera on'}><Icon name={cameraOn ? 'video' : 'videoOff'} size={20} /><span>Camera</span></button>
            <button className={`room-control ${shared ? 'is-active' : ''}`} onClick={() => { const next = !shared; setShared(next); realtimeRef.current?.sendAction('screen-share.changed', next); onToast(shared ? 'Screen sharing stopped.' : 'Screen sharing is visible to the room.'); }}><Icon name="monitor" size={20} /><span>Share</span></button>
            <button className="room-control" onClick={() => setActivePanel('transcript')}><Icon name="file" size={20} /><span>Transcript</span></button>
            <button className={`room-control ${whiteboard ? 'is-active' : ''}`} onClick={handleWhiteboard}><Icon name="monitor" size={20} /><span>Whiteboard</span></button>
            <button className={`room-control ${enhancement.blur ? 'is-active' : ''}`} onClick={() => handleEnhancement('blur')} aria-pressed={enhancement.blur} aria-label="Toggle background blur"><Icon name="sparkles" size={20} /><span>Blur</span></button>
            <span className="control-divider" />
            <button className="room-control danger" onClick={() => onToast('Leave confirmation opened. The room stays available for the rest of the panel.')}><Icon name="phoneOff" size={20} /><span>Leave</span></button>
          </div>

          <section className="code-workspace surface-card">
            <div className="code-toolbar"><div className="code-tabs"><button className="code-tab is-active"><Icon name="code" size={16} /> reconcile.js <span>●</span></button><button className="code-tab"><Icon name="plus" size={15} /> Add file</button></div><div><span className="sync-state"><i /> Synced with Alex</span><button className="icon-button tiny" onClick={() => onToast('A fresh hidden test run has been queued.')} aria-label="Run private tests"><Icon name="play" size={16} /></button></div></div>
            <div className="code-editor-shell"><div className="line-numbers">1<br />2<br />3<br />4<br />5<br />6<br />7<br />8<br />9</div><textarea value={code} onChange={(event) => setCode(event.target.value)} aria-label="Collaborative code editor" spellCheck="false" /></div>
            <div className="code-footer"><span><Icon name="check" size={15} /> 12 hidden checks ready</span><span>JavaScript · UTF-8 · Collaborative cursor enabled</span><button onClick={addTranscript}>Ask about this implementation <Icon name="arrowUpRight" size={14} /></button></div>
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
