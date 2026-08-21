import { useMemo, useState } from 'react';
import { addArtifact, askRag, createOpportunity, demoData, importEmail, listProviders, registerConnector, requestExport, reviewImport, setProviderEnabled } from './lib/vaultApi.js';
import { CapabilityStatus } from './CapabilityStatus.jsx';

const navItems = [
  ['timeline', 'Timeline', '◔'],
  ['vault', 'Artifact vault', '◈'],
  ['coach', 'Career coach', '✦'],
  ['trust', 'Trust & data', '◉'],
];

function Badge({ children, tone = 'mint' }) {
  return <span className={`vault-badge vault-badge-${tone}`}>{children}</span>;
}

function SectionTitle({ eyebrow, title, action }) {
  return <div className="vault-section-title"><div><span className="vault-eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action}</div>;
}

function EmptyState({ icon, children }) {
  return <div className="vault-empty"><span>{icon}</span><p>{children}</p></div>;
}

export function App() {
  const [active, setActive] = useState('timeline');
  const [opportunities, setOpportunities] = useState(demoData.demoOpportunities);
  const [artifacts, setArtifacts] = useState(demoData.demoArtifacts);
  const [timeline, setTimeline] = useState(demoData.demoTimeline);
  const [imports, setImports] = useState([]);
  const [providers, setProviders] = useState([]);
  const [consent, setConsent] = useState({ recording: false, transcript: false, emailImport: false, calendarImport: false });
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState('');

  useMemo(() => {
    listProviders().then(setProviders).catch(() => setProviders([]));
  }, []);

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(window.__vaultToast);
    window.__vaultToast = window.setTimeout(() => setToast(''), 4500);
  };

  const saveOpportunity = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading('opp');
    try {
      const created = await createOpportunity({ title: form.get('title'), company: form.get('company'), source: 'candidate_added', sourceReference: 'candidate-entered', requirements: form.get('requirements') ? form.get('requirements').split(',').map((s) => s.trim()).filter(Boolean) : [] });
      setOpportunities((items) => [created, ...items]);
      notify('Opportunity saved to your private timeline. You control who sees it.');
    } catch (error) { notify(error.message); }
    finally { setLoading(''); }
  };

  const saveArtifact = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading('art');
    try {
      const created = await addArtifact({ kind: form.get('kind'), title: form.get('title'), content: form.get('content'), competency: form.get('competency'), consent: { recording: consent.recording, transcript: consent.transcript, rightsConfirmed: true } });
      setArtifacts((items) => [created, ...items]);
      notify('Artifact stored privately by default. Nothing is shared without your consent.');
    } catch (error) { notify(error.message); }
    finally { setLoading(''); }
  };

  const toggleConsent = (key) => setConsent((current) => ({ ...current, [key]: !current[key] }));

  const toggleProvider = async (provider) => {
    const next = !provider.enabled;
    setLoading(`provider-${provider.id}`);
    try {
      const updated = await setProviderEnabled(provider.id, next);
      setProviders((items) => items.map((item) => item.id === provider.id ? { ...item, ...updated } : item));
      notify(next ? `${provider.label} connected.` : `${provider.label} disabled.`);
    } catch (error) { notify(error.message); }
    finally { setLoading(''); }
  };

  const runEmailImport = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setLoading('import');
    try {
      if (!consent.emailImport) {
        const connector = await registerConnector({ provider: 'gmail', scopeLabel: 'Application receipts and recruiter messages', candidateApprovedAt: new Date().toISOString(), candidateSelectedFolders: ['Receipts', 'Recruiters'] });
        toggleConsent('emailImport');
        notify('Gmail connector registered with minimal scopes. Choose eligible folders before import.');
        return;
      }
      const imported = await importEmail({ connectorId: 'connector-gmail-demo', subject: form.get('subject'), from: form.get('from') || 'recruiter@company.com', receivedAt: new Date().toISOString(), body: form.get('body'), eligibleFolder: true, scopeLabel: 'Application receipts and recruiter messages', candidateConsentedFolder: consent.emailImport });
      setImports((items) => [imported, ...items]);
      notify('Email received and held for your review. Nothing enters your timeline until you approve.');
    } catch (error) { notify(error.message); }
    finally { setLoading(''); }
  };

  const decideImport = async (imported, decision) => {
    setLoading(`import-${imported.id}`);
    try {
      const reviewed = await reviewImport({ importId: imported.id, decision, candidateApprovedAt: new Date().toISOString() });
      setImports((items) => items.map((item) => item.id === imported.id ? { ...item, status: reviewed.status === 'rejected' ? 'rejected' : 'approved' } : item));
      notify(decision === 'reject' ? 'Import rejected. Nothing was created.' : 'Import approved and added to your timeline.');
    } catch (error) { notify(error.message); }
    finally { setLoading(''); }
  };

  const content = {
    timeline: <Timeline opportunities={opportunities} timeline={timeline} saveOpportunity={saveOpportunity} loading={loading} />,
    vault: <Vault artifacts={artifacts} consent={consent} toggleConsent={toggleConsent} saveArtifact={saveArtifact} loading={loading} imports={imports} runEmailImport={runEmailImport} decideImport={decideImport} />,
    coach: <CareerCoach artifacts={artifacts} notify={notify} />,
    trust: <Trust consent={consent} toggleConsent={toggleConsent} notify={notify} artifacts={artifacts} opportunities={opportunities} timeline={timeline} providers={providers} toggleProvider={toggleProvider} loading={loading} />,
  };

  return <div className="vault-shell">
    <aside className="vault-sidebar" aria-label="Vault navigation">
      <a className="vault-brand" href="#timeline"><span>C</span><b>signalroom <em>compass vault</em></b></a>
      <div className="vault-mini"><span>AM</span><div><b>Alex Morgan</b><small>Candidate-owned career vault</small></div></div>
      <nav>{navItems.map(([id, label, icon]) => <button key={id} className={active === id ? 'is-active' : ''} onClick={() => setActive(id)} aria-current={active === id ? 'page' : undefined}><span>{icon}</span>{label}</button>)}</nav>
      <div className="vault-sidebar-bottom"><span className="vault-boundary-dot"/> <p><b>Private by default</b><small>No employer or coach sees this unless you share.</small></p></div>
    </aside>
    <main className="vault-main">
      <header className="vault-topbar"><div><span className="vault-eyebrow">SIGNALROOM COMPASS VAULT</span><h1>{navItems.find((item) => item[0] === active)?.[1]}</h1></div><div className="vault-topbar-status"><Badge tone="mint">Candidate private</Badge><button onClick={() => notify('Your data controls, sources, and sharing choices are available in Trust & data.')}>Privacy</button><span>AM</span></div></header>
      <section className="vault-boundary"><span>Career planning only</span><p>This space helps you track and prepare. It cannot answer during a live interview or access employer-private evaluation data.</p><button onClick={() => setActive('trust')}>Review boundary</button></section>
      {content[active]}
    </main>
    {toast && <div className="vault-toast" role="status"><span>✓</span><p>{toast}</p><button onClick={() => setToast('')} aria-label="Dismiss notification">×</button></div>}
  </div>;
}

function Timeline({ opportunities, timeline, saveOpportunity, loading }) {
  return <section className="vault-grid timeline-grid">
    <article className="vault-card timeline-hero"><div><span className="vault-eyebrow">YOUR CAREER TIMELINE</span><h2>Track every opportunity.<br/><em>Keep every decision.</em></h2><p>One private, time-ordered record of applications, interviews, feedback, notes, and next actions. The system of record for your career journey.</p></div><div className="vault-hero-stats"><strong>{opportunities.length}</strong><span>tracked roles</span><strong>{timeline.length}</strong><span>timeline events</span></div></article>
    <article className="vault-card add-opp-card"><SectionTitle eyebrow="ADD OPPORTUNITY" title="Capture a role" /><form onSubmit={saveOpportunity} className="vault-form"><label><span>Role title</span><input name="title" required minLength={2} placeholder="Senior Frontend Engineer" /></label><label><span>Company</span><input name="company" required minLength={2} placeholder="Target company" /></label><label><span>Requirements (comma separated)</span><input name="requirements" placeholder="React, Accessibility" /></label><button className="vault-primary full" disabled={loading === 'opp'}>{loading === 'opp' ? 'Saving…' : 'Save to my timeline'}</button><p className="vault-micro">Stored privately with source and date. Duplicate detection prevents double entries.</p></form></article>
    <article className="vault-card opp-list-card"><SectionTitle eyebrow="OPPORTUNITIES" title="Why each role is tracked" />{opportunities.length ? opportunities.map((opp) => <article className="vault-row" key={opp.id}><div><b>{opp.title}</b><small>{opp.company} · {opp.source.replaceAll('_', ' ')}</small><em>{opp.deadline || 'No deadline set'}</em></div><Badge tone={opp.status === 'review_required' ? 'amber' : 'mint'}>{opp.status.replaceAll('_', ' ')}</Badge></article>) : <EmptyState icon="↗">Save your first opportunity to build your timeline.</EmptyState>}</article>
    <article className="vault-card timeline-list-card"><SectionTitle eyebrow="TIMELINE" title="Your private history" />{timeline.length ? timeline.map((event) => <article className="vault-row" key={event.id}><div><b>{event.title}</b><small>{event.kind.replaceAll('_', ' ')} · {event.source.replaceAll('_', ' ')}</small></div><span className="vault-date">{String(event.occurredAt || '').slice(0, 10)}</span></article>) : <EmptyState icon="◔">Timeline events appear here as you capture them.</EmptyState>}</article>
  </section>;
}

function Vault({ artifacts, consent, toggleConsent, saveArtifact, loading, imports, runEmailImport, decideImport }) {
  const pending = imports.filter((item) => item.status === 'awaiting_review');
  return <section className="vault-grid vault-grid">
    <article className="vault-card vault-hero"><div><span className="vault-eyebrow">ARTIFACT VAULT</span><h2>Your evidence.<br/><em>Your control.</em></h2><p>Notes, feedback, recordings, and transcripts stay private by default. Every artifact carries consent, retention, and provenance metadata.</p></div><Badge tone="mint">Private by default</Badge></article>
    <article className="vault-card add-artifact-card"><SectionTitle eyebrow="CAPTURE EVIDENCE" title="Add a note or feedback" /><form onSubmit={saveArtifact} className="vault-form"><label><span>Kind</span><select name="kind" defaultValue="note"><option value="note">Note</option><option value="feedback">Feedback</option><option value="practice_session">Practice session</option><option value="transcript">Transcript</option><option value="document">Document</option></select></label><label><span>Title</span><input name="title" required minLength={2} placeholder="Mock interview feedback" /></label><label><span>Competency</span><input name="competency" placeholder="communication" /></label><label><span>Content</span><textarea name="content" rows={3} placeholder="Add a measurable outcome and concrete evidence." /></label><div className="vault-consent-row"><label className="vault-check"><input type="checkbox" checked={consent.recording} onChange={() => toggleConsent('recording')} /> Recording consent</label><label className="vault-check"><input type="checkbox" checked={consent.transcript} onChange={() => toggleConsent('transcript')} /> Transcript consent</label></div><button className="vault-primary full" disabled={loading === 'art'}>{loading === 'art' ? 'Storing…' : 'Store privately'}</button></form></article>
    <article className="vault-card email-import-card"><SectionTitle eyebrow="EMAIL IMPORT" title="Import a receipt with review-before-save" /><p className="vault-micro">Minimal scopes only. You choose which folders are eligible; nothing enters your timeline until you approve each message.</p><form onSubmit={runEmailImport} className="vault-form"><label><span>Email subject</span><input name="subject" required minLength={2} placeholder="Interview invitation: Senior Frontend Engineer" /></label><label><span>Message body (optional)</span><textarea name="body" rows={2} placeholder="Thanks for applying at Northwind Labs." /></label><button className="vault-primary full" disabled={loading === 'import'}>{loading === 'import' ? 'Processing…' : consent.emailImport ? 'Import for review' : 'Connect Gmail (minimal scopes)'}</button></form>{pending.length ? <div className="vault-pending"><b>Pending your review</b>{pending.map((item) => <article key={item.id}><div><b>{item.parsed?.role || item.subject}</b><small>{item.parsed?.company} · {item.subject}</small></div><div className="vault-pending-actions"><button className="vault-secondary" onClick={() => decideImport(item, 'approve')}>Approve</button><button className="vault-secondary danger" onClick={() => decideImport(item, 'reject')}>Reject</button></div></article>)}</div> : null}</article>
    <article className="vault-card artifact-list-card"><SectionTitle eyebrow="YOUR ARTIFACTS" title="Candidate-owned records" />{artifacts.length ? artifacts.map((art) => <article className="vault-row" key={art.id}><div><b>{art.title}</b><small>{art.kind.replaceAll('_', ' ') || 'note'} · {art.competency || 'general'} · {art.date}</small><em>{art.content.slice(0, 120)}</em></div><Badge tone={art.excludeFromRetrieval ? 'grey' : 'mint'}>{art.excludeFromRetrieval ? 'Excluded' : 'Private'}</Badge></article>) : <EmptyState icon="◈">Your private artifacts appear here.</EmptyState>}</article>
  </section>;
}

function CareerCoach({ artifacts, notify }) {
  const [question, setQuestion] = useState('What feedback patterns about structure and evidence repeat?');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const result = await askRag({ tenant_id: 'career-vault-demo', candidate_id: 'candidate-alex', session_context: 'career_planning', question, evidence: artifacts.map((a) => ({ artifact_id: a.id, title: a.title, kind: a.kind, content: a.content, source: 'candidate_entered', date: a.date, tenant_id: 'career-vault-demo', candidate_id: 'candidate-alex', competency: a.competency || '' })) });
      setAnswer(result);
    } catch (error) { notify(error.message); }
    finally { setLoading(false); }
  };

  return <section className="vault-grid coach-grid">
    <article className="vault-card coach-hero"><div><span className="vault-eyebrow">RAG CAREER COACH</span><h2>Ask your own history.<br/><em>Get cited answers.</em></h2><p>Retrieval over your candidate-authorized timeline and artifacts. Every answer cites its sources, shows confidence, or abstains when evidence is insufficient.</p></div><Badge tone="mint">No live-assessment assistance</Badge></article>
    <article className="vault-card ask-card"><SectionTitle eyebrow="ASK" title="Ground a question in your records" /><label><span>Your question</span><textarea rows={3} value={question} onChange={(event) => setQuestion(event.target.value)} /></label><button className="vault-primary full" disabled={loading || question.trim().length < 3} onClick={run}>{loading ? 'Retrieving…' : 'Ask my career coach'}</button></article>
    <article className="vault-card answer-card"><SectionTitle eyebrow="ANSWER" title="Cited, grounded, or abstained" />{answer ? (answer.abstention ? <div className="vault-abstain"><span>◌</span><b>Not enough permitted evidence</b><p>{answer.message}</p><em>Suggested next action: {answer.suggestedNextAction}</em></div> : <><div className="vault-answer"><b>Answer</b><p>{answer.answer}</p></div><div className="vault-citations"><b>Citations</b>{answer.citations.map((c) => <article key={c.artifact_id}><div><b>{c.title}</b><small>{c.date}</small></div><em>{c.excerpt}</em></article>)}</div><div className="vault-confidence">Confidence: {Math.round(answer.confidence * 100)}% · AI inference over candidate-authorized evidence only.</div></>) : <EmptyState icon="✦">Ask a question to retrieve cited evidence from your vault.</EmptyState>}</article>
    <article className="vault-card rules-card"><SectionTitle eyebrow="ANSWER RULES" title="How answers stay honest" /><div className="vault-rule-list"><span>✓ Cites candidate-owned sources and timestamps</span><span>✓ Separates fact, reflection, and inference</span><span>✓ Shows confidence and missing evidence</span><span>✓ Abstains when evidence is insufficient</span><span>✓ Never hidden employer reasoning or hiring predictions</span></div></article>
  </section>;
}

function Trust({ consent, toggleConsent, notify, artifacts, opportunities, timeline, providers, toggleProvider, loading }) {
  const exportData = async () => {
    notify('Queued a candidate-owned export of your timeline, artifacts, and metadata for review.');
    await requestExport({ include: ['timeline', 'artifacts', 'metadata', 'audit'], candidateApprovedAt: new Date().toISOString() }).catch(() => {});
  };
  return <section className="vault-grid trust-grid">
    <article className="vault-card trust-hero"><div><span className="vault-eyebrow">TRUST & DATA</span><h2>Private by default.<br/><em>Shared by choice.</em></h2><p>Your career vault is candidate-owned. Nothing is shared with employers, recruiters, or coaches without explicit, granular, audited consent.</p></div><Badge tone="mint">Candidate private</Badge></article>
    <article className="vault-card consent-card"><SectionTitle eyebrow="CONSENT" title="What may be processed" />{[['recording', 'Practice recording', 'Recordings are stored only with your consent and participant rights.'], ['transcript', 'Transcript', 'Transcripts are stored only with your consent and separate retention.'], ['emailImport', 'Email import', 'Application receipts and recruiter messages — review before import.'], ['calendarImport', 'Calendar import', 'Interview, coach, and deadline events — review before import.']].map(([key, label, detail]) => <label key={key} className="vault-consent-toggle"><span><b>{label}</b><small>{detail}</small></span><button className={`vault-toggle ${consent[key] ? 'is-on' : ''}`} onClick={() => toggleConsent(key)} aria-pressed={consent[key]}><i /></button></label>)}</article>
    <article className="vault-card providers-card"><SectionTitle eyebrow="PROVIDER CONNECTIONS" title="Disable now · Connect when available" /><div className="vault-provider-list">{providers.map((provider) => <article className="vault-provider" key={provider.id}><div><b>{provider.label}</b><small>{provider.capability}</small><em>{provider.reason}</em></div>{provider.action === 'blocked' ? <Badge tone="grey">Blocked</Badge> : <button className={`vault-provider-btn ${provider.enabled ? 'is-enabled' : ''}`} disabled={loading === `provider-${provider.id}`} onClick={() => toggleProvider(provider)}>{provider.enabled ? 'Disable' : 'Connect'}</button>}</article>)}</div></article>
    <article className="vault-card data-card"><SectionTitle eyebrow="DATA RIGHTS" title="Export, delete, and control" /><p>Your timeline ({timeline.length} events), artifacts ({artifacts.length}), and opportunities ({opportunities.length}) are candidate-owned. Export includes only candidate-authorized data; deletion propagates through artifacts, transcripts, index, and derived plans.</p><div className="vault-data-actions"><button className="vault-secondary" onClick={exportData}>Request data export</button><button className="vault-secondary danger" onClick={() => notify('A deletion request would start a confirmed, auditable workflow.')}>Request deletion</button></div></article>
    <article className="vault-card boundary-card"><SectionTitle eyebrow="BOUNDARY" title="Preparation and career planning only" /><div className="vault-rule-list"><span>✓ Real-assessment lockout for coaching assistance</span><span>✓ No employer scorecards or confidential hiring deliberation</span><span>✓ No scraping of personal inboxes or social accounts</span><span>✓ Audit log for import, retrieval, share, export, delete</span></div></article>
    <CapabilityStatus product="vault" />
  </section>;
}
