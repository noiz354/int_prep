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
  if (!open) return null;
  return <div className="modal-layer" role="presentation" onMouseDown={onClose}><div className="composer-modal" role="dialog" aria-modal="true" aria-labelledby="composer-title" onMouseDown={(event) => event.stopPropagation()}><div className="modal-heading"><div><span className="section-kicker">NEW INTERVIEW</span><h2 id="composer-title">Create a structured session</h2></div><button className="icon-button" onClick={onClose} aria-label="Close interview composer"><Icon name="x" size={20} /></button></div><div className="composer-steps"><span className="is-current">1<span>Details</span></span><i /><span>2<span>Panel</span></span><i /><span>3<span>Review</span></span></div><label className="form-field"><span>Candidate</span><input defaultValue="New candidate" aria-label="Candidate name" /></label><label className="form-field"><span>Role</span><input defaultValue="Senior Frontend Engineer" aria-label="Role" /></label><label className="form-field"><span>Interview stage</span><select value={stage} onChange={(event) => setStage(event.target.value)} aria-label="Interview stage"><option>Technical deep dive</option><option>Systems design</option><option>Leadership conversation</option><option>Portfolio review</option></select></label><div className="composer-notice"><Icon name="sparkles" size={16} /><span>An approved rubric and privacy notice will be attached automatically based on the selected role.</span></div><div className="modal-actions"><button className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" onClick={() => { onComplete(stage); onClose(); }}><Icon name="calendar" size={17} /> Continue to panel</button></div></div></div>;
}

export default function App() {
  const [activeScreen, setActiveScreen] = useState('overview');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('signalroom:theme') === 'dark');
  const [menuOpen, setMenuOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [session, setSession] = useState(() => getSession());

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
  const saveScorecard = (scorecard) => platformApi.saveScorecard('int-2048', scorecard);
  const screen = useMemo(() => {
    const common = { onNavigate: navigate, onToast: notify };
    switch (activeScreen) {
      case 'interviews': return <Interviews {...common} />;
      case 'candidate': return <CandidatePortal onToast={notify} />;
      case 'studio': return <LiveStudio onToast={notify} onSaveScorecard={saveScorecard} />;
      case 'intelligence': return <Intelligence onToast={notify} />;
      case 'data': return <DataPulse onToast={notify} />;
      case 'trust': return <TrustCenter onToast={notify} />;
      case 'operations': return <Operations onToast={notify} />;
      case 'foundation': return <FoundationHub onToast={notify} />;
      case 'completion': return <CompletionHub onToast={notify} />;
      case 'integrations': return <Integrations onToast={notify} />;
      case 'features': return <FeatureCatalog onToast={notify} />;
      default: return <Dashboard {...common} principal={session?.principal} />;
    }
  }, [activeScreen, session]);

  if (isRemoteApiEnabled() && !session) {
    return <LoginGate onSignedIn={setSession} />;
  }

  const signOut = async () => {
    await logoutSession();
    setSession(null);
  };

  return <div className="app-shell"><Sidebar activeScreen={activeScreen} onNavigate={navigate} isOpen={menuOpen} onClose={() => setMenuOpen(false)} /><div className="app-content"><Topbar activeScreen={activeScreen} darkMode={darkMode} principal={session?.principal} onLogout={signOut} onToggleTheme={() => setDarkMode((value) => !value)} onOpenMenu={() => setMenuOpen(true)} onOpenCommand={() => setCommandOpen(true)} onCreateInterview={() => setComposerOpen(true)} />{screen}</div><CommandPalette open={commandOpen} onClose={() => setCommandOpen(false)} onNavigate={navigate} onCreate={() => setComposerOpen(true)} /><InterviewComposer open={composerOpen} onClose={() => setComposerOpen(false)} onComplete={(stage) => notify(`${stage} draft created. Add panelists to finish scheduling.`)} /><Toast message={toast} onDismiss={() => setToast('')} /></div>;
}
