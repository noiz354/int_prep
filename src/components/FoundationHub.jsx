import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';
import { platformApi } from '../lib/platformApi.js';
import { summarizeByState } from '../data/capabilityRegistry.js';
import { CapabilityTruthBar } from './CapabilityTruthBar.jsx';

const tabs = [
  { id: 'workflow', label: 'Workflow', icon: 'briefcase' },
  { id: 'automation', label: 'Automation', icon: 'layers' },
  { id: 'data', label: 'Data controls', icon: 'database' },
  { id: 'operations', label: 'Release & SRE', icon: 'activity' },
  { id: 'governance', label: 'Governance', icon: 'shield' },
];

const lifecycleOptions = ['checked_in', 'live', 'interrupted', 'completed', 'debrief', 'decision', 'archived'];

function Metric({ label, value, note, tone = 'violet' }) {
  return <article className={`hub-metric hub-metric-${tone}`}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

function EmptyState() {
  return <div className="hub-loading"><Icon name="refresh" size={21} /><span>Loading foundation controls…</span></div>;
}

export function FoundationHub({ onToast }) {
  const [activeTab, setActiveTab] = useState('workflow');
  const [snapshot, setSnapshot] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [transition, setTransition] = useState('checked_in');
  const [artifactReference, setArtifactReference] = useState('vault://northstar/int-2051/recording-segment-01');
  const [redactionInput, setRedactionInput] = useState('Alex Morgan can be contacted at alex.morgan@example.test or +62 812 5555 1000.');
  const [redactionResult, setRedactionResult] = useState('');
  const [incidents, setIncidents] = useState([]);
  const [webhooks, setWebhooks] = useState([]);
  const [debrief, setDebrief] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [selectedInterviewId, setSelectedInterviewId] = useState('');

  const load = async () => {
    setError('');
    try {
      const data = await platformApi.getFoundationSnapshot();
      setSnapshot(data);
      setWebhooks(data.webhooks || []);
      try {
        const list = await platformApi.getInterviews();
        setInterviews(Array.isArray(list) ? list : []);
        if (list?.[0]?.id) setSelectedInterviewId((current) => current || list[0].id);
      } catch {
        setInterviews([]);
      }
    } catch (reason) {
      setError(reason.message || 'Unable to load control-plane data.');
    }
  };

  useEffect(() => { load(); }, []);

  const run = async (key, action, success) => {
    setBusy(key);
    try {
      const result = await action();
      success?.(result);
      onToast('Control-plane action completed and was routed through the local audit/event boundary.');
    } catch (reason) {
      onToast(reason.message || 'The action could not be completed.');
    } finally { setBusy(''); }
  };

  const interviewSummary = summarizeByState('interview');
  if (!snapshot) return <main className="page foundation-page"><EmptyState /></main>;

  const toggleFlag = (flag) => run(`flag-${flag.id}`, () => platformApi.setFeatureFlag(flag.id, !flag.enabled), (updated) => setSnapshot((current) => ({ ...current, flags: current.flags.map((item) => item.id === updated.id ? { ...item, ...updated } : item) })));

  return <main className="page foundation-page">
    <section className="foundation-hero surface-card">
      <div><span className="pill pill-amber"><Icon name="layers" size={14} /> DELIVERY CONTROL CENTER</span><h2>Local control plane. <em>Not production.</em></h2><p>Operate in-memory workflows, jobs, contracts, flags, and privacy previews. Persistence, SSO, and providers are still Phase U1+.</p><div className="foundation-hero-meta"><span><Icon name="alert" size={15} /> {interviewSummary.userUsable} / {interviewSummary.total} user-usable · {interviewSummary.counts.local_only} local only</span><span><Icon name="shield" size={15} /> Tenant-scoped and audit-aware actions</span></div></div>
      <div className="foundation-orbit" aria-hidden="true"><i className="foundation-ring one"/><i className="foundation-ring two"/><span><Icon name="layers" size={31} /></span><b>U0</b></div>
    </section>

    <CapabilityTruthBar product="interview" />

    <section className="hub-metrics-grid"><Metric label="User-usable" value={String(interviewSummary.userUsable)} note="of 100 PRD capabilities"/><Metric label="Active workflows" value={snapshot.workflows.length} note="approved interview loops" tone="mint"/><Metric label="Registered contracts" value={snapshot.schemas.length} note="versioned event schemas" tone="sky"/><Metric label="Release flags" value={snapshot.flags.length} note="tenant/role scoped" tone="amber"/></section>

    <section className="hub-tabs" role="tablist" aria-label="Foundation control areas">{tabs.map((tab) => <button key={tab.id} role="tab" aria-selected={activeTab === tab.id} className={activeTab === tab.id ? 'is-active' : ''} onClick={() => setActiveTab(tab.id)}><Icon name={tab.icon} size={16} /> {tab.label}</button>)}</section>
    {error && <div className="hub-error"><Icon name="alert" size={17} /> {error}<button onClick={load}>Retry</button></div>}

    {activeTab === 'workflow' && <section className="hub-grid workflow-grid">
      <article className="surface-card hub-card requisition-card"><div className="surface-header"><div><span className="section-kicker">EO-01 · BE-14</span><h2>Requisitions & approved loops</h2></div><span className="status-chip status-mint">Active</span></div><div className="requisition-list">{snapshot.requisitions.map((item) => <article key={item.id}><span className="requisition-mark"><Icon name="briefcase" size={17}/></span><div><b>{item.title}</b><small>{item.department} · {item.openings} opening{item.openings > 1 ? 's' : ''}</small><code>{item.workflowId}</code></div><span className="status-chip status-violet">{item.status}</span></article>)}</div><div className="workflow-rail">{snapshot.workflows.map((workflow) => <div key={workflow.id}><b>{workflow.name}</b><span>{workflow.stages.map((stage) => <i key={stage}>{stage}</i>)}</span><small>Evidence gate: {workflow.requiredEvidence.join(' + ')}</small></div>)}</div></article>
      <aside className="surface-card hub-card lifecycle-card"><span className="section-kicker">BE-02 · LIFECYCLE STATE MACHINE</span><h2>Move a scheduled interview safely</h2><p>Transitions are validated by the server, idempotent, evented, and audit logged.</p><label className="hub-field"><span>Interview</span><select value={selectedInterviewId} onChange={(event) => setSelectedInterviewId(event.target.value)}>{interviews.length ? interviews.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.candidateName || item.candidate}</option>) : <option value="">No interviews in store</option>}</select></label><label className="hub-field"><span>Next state</span><select value={transition} onChange={(event) => setTransition(event.target.value)}>{lifecycleOptions.map((item) => <option key={item}>{item}</option>)}</select></label><button className="button button-primary full" disabled={Boolean(busy) || !selectedInterviewId} onClick={() => run('transition', () => platformApi.transitionInterview(selectedInterviewId, transition), (updated) => onToast(`Interview ${selectedInterviewId} transitioned to ${updated.status}.`))}><Icon name="refresh" size={16}/> {busy === 'transition' ? 'Transitioning…' : 'Validate & transition'}</button></aside>
    </section>}

    {activeTab === 'automation' && <section className="hub-grid automation-grid">
      <article className="surface-card hub-card jobs-card"><div className="surface-header"><div><span className="section-kicker">BE-08 · BE-10</span><h2>Artifacts & durable jobs</h2></div><button className="text-button" onClick={load}>Refresh <Icon name="refresh" size={14}/></button></div><div className="job-list">{snapshot.jobs.slice(0, 5).map((job) => <article key={job.id}><span className="job-icon"><Icon name={job.kind.includes('artifact') ? 'file' : job.kind.includes('debrief') ? 'sparkles' : 'layers'} size={15}/></span><div><b>{job.kind}</b><small>{job.id} · {job.priority || 'normal'} priority</small></div><span className="status-chip status-amber">{job.status}</span></article>)}</div><div className="artifact-form"><label className="hub-field"><span>Controlled artifact reference</span><input value={artifactReference} onChange={(event) => setArtifactReference(event.target.value)} /></label><button className="button button-secondary" disabled={Boolean(busy) || !selectedInterviewId} onClick={() => run('artifact', () => platformApi.addArtifact(selectedInterviewId, { type: 'recording', reference: artifactReference, retentionClass: 'candidate-standard-90d' }), (result) => setSnapshot((current) => ({ ...current, jobs: [result.job, ...current.jobs] })))}><Icon name="file" size={16}/> {busy === 'artifact' ? 'Queuing…' : 'Attach controlled artifact'}</button></div></article>
      <aside className="surface-card hub-card webhook-card-hub"><span className="section-kicker">BE-11 · VERSIONED API & WEBHOOKS</span><h2>Integration delivery contract</h2><p>Webhook endpoints are registered with event allowlists and signing references. Delivery itself remains a provider-backed production step.</p><div className="webhook-mini-list">{webhooks.length ? webhooks.map((item) => <span key={item.id}><Icon name="plug" size={14}/>{item.url}</span>) : <span><Icon name="lock" size={14}/> No external endpoint registered</span>}</div><button className="button button-primary full" disabled={Boolean(busy)} onClick={() => run('webhook', () => platformApi.createWebhook({ url: 'https://example.test/signalroom-events', eventTypes: ['interview.lifecycle.transitioned', 'scorecard.submitted'], owner: 'Talent Operations' }), (item) => setWebhooks((current) => [item, ...current]))}><Icon name="plus" size={16}/> {busy === 'webhook' ? 'Registering…' : 'Register test endpoint'}</button></aside>
    </section>}

    {activeTab === 'data' && <section className="hub-grid data-hub-grid">
      <article className="surface-card hub-card schema-card"><div className="surface-header"><div><span className="section-kicker">DE-01 · DE-02 · DE-03</span><h2>Event contracts & idempotent flow</h2></div><span className="status-chip status-mint">Compatible</span></div><div className="schema-list">{snapshot.schemas.map((schema) => <article key={schema.name}><span><Icon name="database" size={15}/></span><div><code>{schema.name}</code><small>{schema.owner} · v{schema.version} · {schema.compatibility} compatibility</small></div><b>{schema.required.length} fields</b></article>)}</div></article>
      <article className="surface-card hub-card quality-card-hub"><div className="surface-header"><div><span className="section-kicker">DE-05 · DE-09 · DE-12</span><h2>Telemetry, quality & lineage</h2></div><button className="text-button" onClick={load}>Refresh</button></div><div className="quality-rule-list">{snapshot.quality.map((rule) => <article key={rule.rule}><span><Icon name="check" size={14}/></span><div><b>{rule.rule}</b><small>{rule.detail}</small></div><strong>{rule.value}</strong></article>)}</div><p className="catalog-line"><Icon name="layers" size={14}/> {snapshot.catalog.datasets.length} cataloged datasets · lineage {snapshot.catalog.lineageVersion}</p></article>
      <aside className="surface-card hub-card replay-card"><span className="section-kicker">DE-10 · DE-13</span><h2>Governed replay & deletion</h2><p>Both operations enter an auditable job queue; no data is silently changed by the UI.</p><button className="button button-secondary full" disabled={Boolean(busy)} onClick={() => run('replay', () => platformApi.requestReplay('interview.lifecycle.v1'), (job) => setSnapshot((current) => ({ ...current, jobs: [job, ...current.jobs] })))}><Icon name="refresh" size={16}/> {busy === 'replay' ? 'Queueing…' : 'Queue safe replay'}</button><button className="button button-secondary full" disabled={Boolean(busy)} onClick={() => run('deletion', () => platformApi.requestDeletion('int-2051'), (job) => setSnapshot((current) => ({ ...current, jobs: [job, ...current.jobs] })))}><Icon name="alert" size={16}/> {busy === 'deletion' ? 'Queueing…' : 'Request deletion workflow'}</button></aside>
    </section>}

    {activeTab === 'operations' && <section className="hub-grid operations-hub-grid">
      <article className="surface-card hub-card flags-card"><div className="surface-header"><div><span className="section-kicker">DO-05</span><h2>Progressive delivery flags</h2></div><span className="status-chip status-violet">Tenant scoped</span></div><div className="flag-list">{snapshot.flags.map((flag) => <label key={flag.id}><span><b>{flag.id}</b><small>{flag.owner} · {flag.scope}</small></span><button className={`toggle ${flag.enabled ? 'is-on' : ''}`} disabled={Boolean(busy)} onClick={() => toggleFlag(flag)} aria-pressed={flag.enabled}><i /></button></label>)}</div></article>
      <article className="surface-card hub-card slo-card-hub"><div className="surface-header"><div><span className="section-kicker">DO-08</span><h2>SLO & error budget view</h2></div><span className="status-chip status-mint">On target</span></div><div className="slo-list-hub">{snapshot.slo.map((item) => <article key={item.name}><div><b>{item.name}</b><small>{item.owner}</small></div><span><strong>{item.current}</strong><small>objective {item.objective}</small></span></article>)}</div></article>
      <aside className="surface-card hub-card incident-card-hub"><span className="section-kicker">DO-14</span><h2>Incident command drill</h2><p>Create a controlled incident record with an owner-facing communication trail.</p><button className="button button-primary full" disabled={Boolean(busy)} onClick={() => run('incident', () => platformApi.createIncident({ title: 'Transcript freshness drill', severity: 'sev3', summary: 'Controlled non-production latency drill for APAC AI pipeline.' }), (incident) => setIncidents((items) => [incident, ...items]))}><Icon name="alert" size={16}/> {busy === 'incident' ? 'Creating…' : 'Open controlled incident'}</button>{incidents.map((incident) => <p className="incident-result" key={incident.id}><Icon name="check" size={14}/> {incident.id} · {incident.status}</p>)}</aside>
    </section>}

    {activeTab === 'governance' && <section className="hub-grid governance-hub-grid">
      <article className="surface-card hub-card security-card-hub"><div className="surface-header"><div><span className="section-kicker">SC-04 · SC-06 · SC-08 · SC-11</span><h2>Privacy & security control plane</h2></div><span className="status-chip status-mint">Protected</span></div><div className="security-policy-list"><p><Icon name="globe" size={15}/><span><b>Residency</b>{snapshot.security.residency.mediaProcessingRegion} · {snapshot.security.residency.allowedRegions.join(', ')}</span></p><p><Icon name="lock" size={15}/><span><b>Envelope encryption</b>{snapshot.security.envelopeEncryption.algorithm} · reference-only artifacts</span></p><p><Icon name="shield" size={15}/><span><b>API protection</b>{snapshot.security.apiProtection.rateLimit}</span></p></div><label className="hub-field"><span>PII redaction preview</span><textarea value={redactionInput} onChange={(event) => setRedactionInput(event.target.value)} /></label><button className="button button-secondary full" disabled={Boolean(busy)} onClick={() => run('redact', () => platformApi.redactText(redactionInput), (result) => setRedactionResult(result.redacted))}><Icon name="lock" size={16}/> {busy === 'redact' ? 'Redacting…' : 'Preview policy redaction'}</button>{redactionResult && <pre className="redaction-result">{redactionResult}</pre>}</article>
      <article className="surface-card hub-card analytics-card-hub"><div className="surface-header"><div><span className="section-kicker">EO-03 · EO-09 · AI-14</span><h2>Debrief & workforce signals</h2></div><button className="text-button" onClick={() => run('debrief', () => platformApi.generateDebrief('int-2048'), (result) => setDebrief(result.debrief))}>Generate debrief <Icon name="sparkles" size={14}/></button></div><div className="analytics-values"><Metric label="Candidate NPS" value={snapshot.analytics.candidateExperienceNps} note="last 30 days" tone="mint"/><Metric label="Calibration" value={`${Math.round(snapshot.analytics.interviewerCalibration * 100)}%`} note="review agreement" tone="sky"/><Metric label="Feedback" value={`${snapshot.analytics.timeToFeedbackHours}h`} note="median completion" tone="amber"/></div><div className="funnel-mini">{snapshot.analytics.funnel.map((item) => <span key={item.label}><i style={{ height: `${Math.round((item.value / 48) * 100)}%` }}/><b>{item.value}</b><small>{item.label}</small></span>)}</div>{debrief && <div className="debrief-result"><Icon name="sparkles" size={16}/><span><b>{debrief.recommendation}</b><small>{debrief.coverage}% evidence coverage · human approval required</small></span></div>}</article>
      <aside className="surface-card hub-card model-card-hub"><span className="section-kicker">AI-01 · AI-03 · AI-04 · AI-06 · AI-07 · AI-10 · AI-15</span><h2>Assistive intelligence controls</h2><div className="model-list-hub">{snapshot.models.map((model) => <article key={model.id}><span className={`status-chip ${model.status === 'active' ? 'status-mint' : 'status-amber'}`}>{model.status}</span><b>{model.name} v{model.version}</b><small>{model.promptSet} · {model.retrievalCollection}</small></article>)}</div><button className="button button-secondary full" disabled={Boolean(busy)} onClick={() => run('followup', () => platformApi.suggestFollowUp({ interviewId: 'int-2048', transcript: 'The candidate described an offline synchronization queue.', uncovered: ['Accessibility mindset'] }), (result) => onToast(`Grounded follow-up ready: ${result.competency}.`))}><Icon name="sparkles" size={16}/> Generate grounded follow-up</button></aside>
    </section>}
  </main>;
}
