import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon.jsx';
import { platformApi } from '../lib/platformApi.js';
import { implementedFoundationIds } from '../data/implementationStatus.js';

function readable(action) {
  return action.replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function ResultPreview({ record }) {
  if (!record) return <div className="completion-empty"><Icon name="sparkles" size={24}/><h3>Choose a capability to exercise its local adapter</h3><p>Actions validate and record a provider-ready foundation without calling an external vendor.</p></div>;
  return <div className="completion-result"><div className="completion-result-head"><span className="status-chip status-mint">{record.status.replaceAll('_', ' ')}</span>{record.requiresHumanReview && <span className="status-chip status-amber">Human review required</span>}</div><h3>{record.featureId} · {record.featureTitle}</h3><pre>{JSON.stringify(record.result, null, 2)}</pre><p><Icon name="shield" size={14}/> Action record is tenant-scoped, audited, and safe for local/provider-adapter validation.</p></div>;
}

export function CompletionHub({ onToast }) {
  const [overview, setOverview] = useState(null);
  const [activeDomainId, setActiveDomainId] = useState('ai-advanced');
  const [activeRecord, setActiveRecord] = useState(null);
  const [activity, setActivity] = useState([]);
  const [busyAction, setBusyAction] = useState('');
  const [contextText, setContextText] = useState('Candidate described a collaborative offline-editing strategy and asked about accessibility expectations.');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await platformApi.getCompletionOverview();
      setOverview(data);
      setActivity(data.activity || []);
    } catch (reason) { setError(reason.message || 'Unable to load completion controls.'); }
  };
  useEffect(() => { load(); }, []);

  const activeDomain = useMemo(() => overview?.domains.find((domain) => domain.id === activeDomainId) || overview?.domains[0], [overview, activeDomainId]);
  const execute = async (feature) => {
    if (!activeDomain) return;
    const key = `${activeDomain.id}:${feature.action}`;
    setBusyAction(key);
    try {
      const record = await platformApi.runCompletionAction(activeDomain.id, feature.action, { text: contextText, transcript: contextText, provider: 'Configured provider adapter', query: 'Alex Morgan', brand: 'Northstar Systems', region: 'ap-southeast-1' });
      setActiveRecord(record);
      setActivity((items) => [record, ...items].slice(0, 12));
      onToast(`${feature.id} local adapter completed. Provider configuration remains explicit.`);
    } catch (reason) { onToast(reason.message || 'The local foundation action could not be completed.'); }
    finally { setBusyAction(''); }
  };

  if (!overview) return <main className="page completion-page"><div className="hub-loading"><Icon name="refresh" size={21}/><span>Loading full capability control plane…</span></div></main>;

  return <main className="page completion-page">
    <section className="completion-hero surface-card"><div><span className="pill pill-mint"><Icon name="check" size={14}/> 100 / 100 PRD FOUNDATIONS</span><h2>Every capability now has a <em>safe delivery path.</em></h2><p>Use this enterprise control plane to exercise the remaining provider-ready adapters for AI, data, media, scheduling, trust, delivery, and ecosystem integration.</p><div className="completion-hero-meta"><span><Icon name="layers" size={15}/> {implementedFoundationIds.length} canonical feature IDs</span><span><Icon name="lock" size={15}/> No real provider credentials embedded</span><span><Icon name="users" size={15}/> Human review retained for high-impact actions</span></div></div><div className="completion-mark" aria-hidden="true"><i/><i/><span>100<small>%</small></span><b><Icon name="check" size={19}/></b></div></section>
    {error && <div className="hub-error"><Icon name="alert" size={17}/>{error}<button onClick={load}>Retry</button></div>}
    <section className="completion-domain-grid">{overview.domains.map((domain) => <button key={domain.id} className={`completion-domain-card ${domain.id === activeDomain?.id ? 'is-active' : ''}`} onClick={() => { setActiveDomainId(domain.id); setActiveRecord(null); }}><span><Icon name={domain.icon} size={18}/></span><b>{domain.label}</b><small>{domain.features.length} adapter foundations</small><i/></button>)}</section>
    <section className="completion-layout">
      <article className="surface-card completion-actions-card"><div className="surface-header"><div><span className="section-kicker">{activeDomain?.label.toUpperCase()}</span><h2>{activeDomain?.features.length} remaining capabilities</h2></div><span className="status-chip status-violet">Provider-ready</span></div><label className="completion-context"><span>Safe local test context</span><textarea value={contextText} onChange={(event) => setContextText(event.target.value)} /></label><div className="completion-feature-list">{activeDomain?.features.map((feature) => { const key = `${activeDomain.id}:${feature.action}`; return <article key={feature.id}><span className="completion-feature-id">{feature.id}</span><div><b>{feature.title}</b><small>{feature.status} · no external provider call</small></div><button className="button button-secondary compact-button" disabled={Boolean(busyAction)} onClick={() => execute(feature)}>{busyAction === key ? 'Running…' : readable(feature.action)} <Icon name="arrowUpRight" size={14}/></button></article>; })}</div></article>
      <aside className="completion-side-stack"><article className="surface-card completion-result-card"><span className="section-kicker">ADAPTER RESULT</span><ResultPreview record={activeRecord}/></article><article className="surface-card completion-activity-card"><div className="surface-header compact"><div><span className="section-kicker">RECENT COMPLETION ACTIVITY</span><h2>Auditable local runs</h2></div><button className="text-button" onClick={() => setActivity([])}>Clear</button></div><div className="completion-activity-list">{activity.length ? activity.map((item) => <article key={item.id}><span><Icon name={item.requiresHumanReview ? 'shield' : 'check'} size={14}/></span><div><b>{item.featureId} · {item.featureTitle}</b><small>{item.status.replaceAll('_', ' ')} · {item.requiresHumanReview ? 'review boundary applied' : 'adapter complete'}</small></div></article>) : <p>No local action has been run in this session.</p>}</div></article></aside>
    </section>
  </main>;
}
