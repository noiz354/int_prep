import { useEffect, useMemo, useState } from 'react';
import { Sidebar } from './components/Sidebar.jsx';
import { Topbar } from './components/Topbar.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { Interviews } from './components/Interviews.jsx';
import { CandidatePortal } from './components/CandidatePortal.jsx';
import { LiveStudio } from './components/LiveStudio.jsx';
import { Intelligence } from './components/Intelligence.jsx';
import { DataPulse } from './components/DataPulse.jsx';
import { TrustCenter } from './components/TrustCenter.jsx';
import { Operations } from './components/Operations.jsx';
import { FoundationHub } from './components/FoundationHub.jsx';
import { CompletionHub } from './components/CompletionHub.jsx';
import { Integrations } from './components/Integrations.jsx';
import { FeatureCatalog } from './components/FeatureCatalog.jsx';
import { Icon } from './components/Icon.jsx';
import { platformApi } from './lib/platformApi.js';
import { clientEventBus } from './lib/eventBus.js';
import { LoginGate } from './components/LoginGate.jsx';
import { getSession, isRemoteApiEnabled, logoutSession } from './lib/session.js';
import { localDateTimeToIso, localDateTimeValue } from './lib/interviewView.js';

const commandItems = [
  { id: 'overview', label: 'Go to overview', icon: 'grid', group: 'Navigate' },
  { id: 'interviews', label: 'Open interview calendar', icon: 'calendar', group: 'Navigate' },
  { id: 'candidate', label: 'Open candidate portal', icon: 'users', group: 'Navigate' },
  { id: 'studio', label: 'Enter live studio', icon: 'video', group: 'Navigate' },
  { id: 'intelligence', label: 'Open AI intelligence', icon: 'sparkles', group: 'Navigate' },
  { id: 'data', label: 'Inspect data pulse', icon: 'database', group: 'Navigate' },
  { id: 'trust', label: 'Review trust center', icon: 'shield', group: 'Navigate' },
  { id: 'operations', label: 'Check reliability', icon: 'activity', group: 'Navigate' },
  { id: 'foundation', label: 'Open control center', icon: 'layers', group: 'Navigate' },
  { id: 'completion', label: 'Open enterprise scale adapters', icon: 'target', group: 'Navigate' },
  { id: 'integrations', label: 'Manage integrations', icon: 'plug', group: 'Navigate' },
  { id: 'features', label: 'Browse feature catalog', icon: 'layers', group: 'Navigate' },
  { id: 'new', label: 'Schedule a new interview', icon: 'plus', group: 'Action' },
];

function Toast({ message, onDismiss }) {
  if (!message) return null;
  return <div className="toast" role="status"><span className="toast-icon"><Icon name="check" size={17} /></span><p>{message}</p><button onClick={onDismiss} aria-label="Dismiss notification"><Icon name="x" size={16} /></button></div>;
}

function CommandPalette({ open, onClose, onNavigate, onCreate }) {
  const [query, setQuery] = useState('');
  useEffect(() => { if (open) setQuery(''); }, [open]);
  if (!open) return null;
  const matches = commandItems.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()));
  const execute = (item) => { if (item.id === 'new') onCreate(); else onNavigate(item.id); onClose(); };
  return <div className="modal-layer command-layer" role="presentation" onMouseDown={onClose}><div className="command-palette" role="dialog" aria-modal="true" aria-label="Command menu" onMouseDown={(event) => event.stopPropagation()}><div className="command-input"><Icon name="search" size={19} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search workspaces and actions…" /><kbd>ESC</kbd></div><div className="command-results">{matches.map((item, index) => <button key={item.label} onClick={() => execute(item)}><span className="command-icon"><Icon name={item.icon} size={17} /></span><span><small>{item.group}</small><b>{item.label}</b></span>{index === 0 && <kbd>↵</kbd>}</button>)}{matches.length === 0 && <p className="command-empty">No matching workspace or action.</p>}</div><div className="command-footer"><span><kbd>↑↓</kbd> to navigate</span><span><kbd>↵</kbd> to select</span><span><kbd>ESC</kbd> to close</span></div></div></div>;
}

function InterviewComposer({ open, onClose, onComplete }) {
  const [stage, setStage] = useState('Technical deep dive');
  const [candidateName, setCandidateName] = useState('New candidate');
  const [role, setRole] = useState('Senior Frontend Engineer');
  const [when, setWhen] = useState(localDateTimeValue());
  const [inviteEmail, setInviteEmail] = useState('');
  const [busy, setBusy] = useState(false);
  if (!open) return null;
  const submit = async () => {
    setBusy(true);
    try {
      await onComplete({ candidateName, role, stage, scheduledAt: localDateTimeToIso(when), inviteEmail });
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return <div className="modal-layer" role="presentation" onMouseDown={onClose}><div className="composer-modal" role="dialog" aria-modal="true" aria-labelledby="composer-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="section-kicker">NEW INTERVIEW</span><h2 id="composer-title">Create a structured session</h2></div><button className="icon-button" onClick={onClose} aria-label="Close interview composer"><Icon name="x" size={20} /></button></div><label className="form-field"><span>Candidate</span><input value={candidateName} onChange={(event) => setCandidateName(event.target.value)} aria-label="Candidate name" /></label><label className="form-field"><span>Role</span><input value={role} onChange={(event) => setRole(event.target.value)} aria-label="Role" /></label><label className="form-field"><span>Interview stage</span><select value={stage} onChange={(event) => setStage(event.target.value)} aria-label="Interview stage"><option>Technical deep dive</option><option>Systems design</option><option>Leadership conversation</option><option>Portfolio review</option></select></label><label className="form-field"><span>Start</span><input type="datetime-local" value={when} onChange={(event) => setWhen(event.target.value)} aria-label="Interview start" /></label><label className="form-field"><span>Invitation email (optional)</span><input type="email" value={inviteEmail} onChange={(event) => setInviteEmail(event.target.value)} placeholder="candidate@example.test" aria-label="Invitation email" /></label><div className="composer-notice"><Icon name="sparkles" size={16} /><span>This writes your tenant store. Email delivery remains a labelled adapter until a mail provider is wired.</span></div><div className="modal-actions"><button className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" disabled={busy} onClick={submit}><Icon name="calendar" size={17} /> {busy ? 'Saving…' : 'Create & persist'}</button></div></div></div>;
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState('overview');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('signalroom:theme') === 'dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [session, setSession] = useState(() => getSession());
  const [interviewTick, setInterviewTick] = useState(0);
  const [inviteToken, setInviteToken] = useState('');
  const [activeInterviewId, setActiveInterviewId] = useState('');
  const [interviewLabel, setInterviewLabel] = useState('');

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(window.__signalroomToastTimer);
    window.__signalroomToastTimer = window.setTimeout(() => setToast(''), 4200);
  };

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? 'dark' : 'light';
    localStorage.setItem('signalroom:theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    const interview = params.get('interview');
    if (invite) {
      setInviteToken(invite);
      setActiveScreen('candidate');
    }
    if (interview) setActiveInterviewId(interview);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setCommandOpen(true); }
      if (event.key === 'Escape') { setCommandOpen(false); setComposerOpen(false); setMenuOpen(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    const unsubscribe = clientEventBus.subscribe((event) => {
      if (event.type === 'scorecard.submitted') notify('Scorecard event published to the local event adapter.');
    });
    return () => { window.removeEventListener('keydown', handleKeyDown); unsubscribe(); };
  }, []);

  const navigate = (screen) => { setActiveScreen(screen); setMenuOpen(false); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const saveScorecard = (interviewId, scorecard) => platformApi.saveScorecard(interviewId || activeInterviewId || 'int-2048', scorecard);
  const openRoom = ({ interviewId, invitationToken, label } = {}) => {
    if (interviewId) setActiveInterviewId(interviewId);
    if (invitationToken) setInviteToken(invitationToken);
    if (label) setInterviewLabel(label);
    navigate('studio');
  };
  const persistInterview = async (draft) => {
    try {
      const created = await platformApi.createInterview({
        candidateName: draft.candidateName,
        role: draft.role,
        stage: draft.stage,
        scheduledAt: draft.scheduledAt,
      });
      if (draft.scheduledAt) {
        try { await platformApi.createSchedule({ interviewId: created.id, start: draft.scheduledAt }); } catch { /* optional */ }
      }
      let inviteNote = '';
      if (draft.inviteEmail) {
        const invitation = await platformApi.createInvitation({
          interviewId: created.id,
          recipient: draft.inviteEmail,
          channel: 'email',
          locale: 'en',
        });
        const path = `/?invite=${encodeURIComponent(invitation.token)}`;
        inviteNote = ` Candidate link: ${path}`;
        try { await navigator.clipboard?.writeText(`${window.location.origin}${path}`); } catch { /* ignore */ }
      }
      setActiveInterviewId(created.id);
      setInterviewLabel(created.candidateName);
      setInterviewTick((value) => value + 1);
      notify(`Interview ${created.id} saved.${inviteNote}`);
    } catch (reason) {
      notify(reason.message);
    }
  };
  const screen = useMemo(() => {
    const common = { onNavigate: navigate, onToast: notify };
    switch (activeScreen) {
      case 'interviews': return <Interviews {...common} onCreate={() => setComposerOpen(true)} refreshTick={interviewTick} onOpenRoom={openRoom} />;
      case 'candidate': return <CandidatePortal onToast={notify} inviteToken={inviteToken} onEnterRoom={openRoom} />;
      case 'studio': return <LiveStudio onToast={notify} onSaveScorecard={saveScorecard} interviewId={activeInterviewId} invitationToken={inviteToken} interviewLabel={interviewLabel} />;
      case 'intelligence': return <Intelligence onToast={notify} />;
      case 'data': return <DataPulse onToast={notify} />;
      case 'trust': return <TrustCenter onToast={notify} />;
      case 'operations': return <Operations onToast={notify} />;
      case 'foundation': return <FoundationHub onToast={notify} />;
      case 'completion': return <CompletionHub onToast={notify} />;
      case 'integrations': return <Integrations onToast={notify} />;
      case 'features': return <FeatureCatalog onToast={notify} />;
      default: return <Dashboard {...common} principal={session?.principal} refreshTick={interviewTick} onCreate={() => setComposerOpen(true)} />;
    }
  }, [activeScreen, session, interviewTick, inviteToken, activeInterviewId, interviewLabel]);

  if (isRemoteApiEnabled() && !session) {
    return <LoginGate onSignedIn={setSession} />;
  }

  const signOut = async () => {
    await logoutSession();
    setSession(null);
  };

  return <div className="app-shell"><Sidebar activeScreen={activeScreen} onNavigate={navigate} isOpen={menuOpen} onClose={() => setMenuOpen(false)} /><div className="app-content"><Topbar activeScreen={activeScreen} darkMode={darkMode} principal={session?.principal} onLogout={signOut} onToggleTheme={() => setDarkMode((value) => !value)} onOpenMenu={() => setMenuOpen(true)} onOpenCommand={() => setCommandOpen(true)} onCreateInterview={() => setComposerOpen(true)} />{screen}</div><CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={navigate} onCreate={() => setComposerOpen(true)} /><InterviewComposer open={composerOpen} onClose={() => setComposerOpen(false)} onComplete={persistInterview} /><Toast message={toast} onDismiss={() => setToast('')} /></div>;
}
