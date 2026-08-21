import { useState } from 'react';
import { Icon } from './Icon.jsx';
import { eventFeed } from '../data/platformData.js';

const topics = [
  { name: 'interview.lifecycle.v1', messages: '8.4k/min', lag: '0 ms', owner: 'Platform', healthy: true },
  { name: 'media.telemetry.v2', messages: '21.6k/min', lag: '84 ms', owner: 'Media SRE', healthy: true },
  { name: 'ai.recommendations.v1', messages: '1.2k/min', lag: '1.8 s', owner: 'AI Systems', healthy: false },
  { name: 'consent.policy.v1', messages: '186/min', lag: '0 ms', owner: 'Trust', healthy: true },
];

const quality = [
  { name: 'Transcript freshness', value: '99.8%', note: 'within 3 seconds', score: 99 },
  { name: 'Schema compatibility', value: '100%', note: 'no breaking changes', score: 100 },
  { name: 'Event completeness', value: '99.97%', note: 'last 24 hours', score: 99 },
  { name: 'Consent propagation', value: '100%', note: 'verified', score: 100 },
];

export function DataPulse({ onToast }) {
  const [view, setView] = useState('stream');
  const [paused, setPaused] = useState(false);
  return (
    <main className="page data-page">
      <section className="data-header-card surface-card">
        <div><span className="pill pill-sky"><Icon name="database" size={14} /> EVENT-NATIVE PLATFORM</span><h2>Every interview signal has a <em>governed path.</em></h2><p>Versioned contracts move consent-aware operational events into real-time experiences, analytics, and AI workflows.</p></div>
        <div className="stream-health"><div className="stream-rings"><i /><i /><i /><span><Icon name="activity" size={21} /></span></div><div><small>EVENT DELIVERY</small><strong>99.97%</strong><p><i className="tiny-live-dot" /> 32 active consumers</p></div></div>
      </section>

      <section className="data-tabs" role="tablist">
        <button className={view === 'stream' ? 'is-active' : ''} onClick={() => setView('stream')} role="tab" aria-selected={view === 'stream'}><Icon name="activity" size={16} /> Live stream</button>
        <button className={view === 'quality' ? 'is-active' : ''} onClick={() => setView('quality')} role="tab" aria-selected={view === 'quality'}><Icon name="check" size={16} /> Data quality</button>
        <button className={view === 'lakehouse' ? 'is-active' : ''} onClick={() => setView('lakehouse')} role="tab" aria-selected={view === 'lakehouse'}><Icon name="layers" size={16} /> Lakehouse lineage</button>
      </section>

      {view === 'stream' && <section className="data-grid">
        <article className="surface-card event-stream-card"><div className="surface-header"><div><span className="section-kicker">KAFKA EVENT EXPLORER</span><h2>Interview room · int-2048</h2></div><button className={`button button-secondary compact-button ${paused ? 'is-active' : ''}`} onClick={() => { setPaused((value) => !value); onToast(paused ? 'Event stream resumed.' : 'Event stream paused locally.'); }}><Icon name={paused ? 'play' : 'pause'} size={15} /> {paused ? 'Resume' : 'Pause'}</button></div><div className="event-feed">{eventFeed.map((event) => <div className="event-row" key={`${event.time}-${event.type}`}><time>{event.time}</time><span className={`event-node node-${event.tone}`}><i /></span><div><code>{event.type}</code><p>{event.label}</p></div><button className="icon-button tiny" aria-label={`Inspect ${event.type}`} onClick={() => onToast(`${event.type} conforms to contract v1.4.`)}><Icon name="chevronRight" size={16} /></button></div>)}</div><div className="event-footer"><span><Icon name="lock" size={14} /> Tenant key: northstar · Idempotent consumer enabled</span><button onClick={() => onToast('The replay form is available to authorized data operators only.')}>Replay range <Icon name="arrowUpRight" size={13} /></button></div></article>
        <aside className="surface-card topic-card"><div className="surface-header compact"><div><span className="section-kicker">TOPIC HEALTH</span><h2>Contracts & consumers</h2></div><span className="status-chip status-mint"><i className="tiny-live-dot" /> Healthy</span></div><div className="topic-list">{topics.map((topic) => <article key={topic.name}><span className={`topic-status ${topic.healthy ? 'healthy' : 'degraded'}`} /><div><code>{topic.name}</code><p>{topic.owner} · {topic.messages}</p></div><span className={topic.healthy ? 'lag-good' : 'lag-warn'}>{topic.lag}</span></article>)}</div><button className="button button-secondary full" onClick={() => onToast('Schema registry opens with compatibility history and owner details.')}><Icon name="file" size={16} /> Open schema registry</button></aside>
      </section>}

      {view === 'quality' && <section className="quality-grid">{quality.map((metric) => <article className="surface-card quality-card" key={metric.name}><div className="quality-top"><span><Icon name="check" size={17} /></span><button className="icon-button tiny" aria-label={`Inspect ${metric.name}`}><Icon name="arrowUpRight" size={16} /></button></div><p>{metric.name}</p><h2>{metric.value}</h2><small>{metric.note}</small><div className="quality-meter"><span style={{ width: `${metric.score}%` }} /></div></article>)}<article className="surface-card anomaly-card"><span className="section-kicker">ANOMALY WATCH</span><h2>1 item needs a human look</h2><p>AI recommendation freshness is above its 1-second objective in the Jakarta region. No candidate-impacting action is required.</p><button className="button button-primary" onClick={() => onToast('A data-quality incident has been acknowledged and routed to AI Systems.')}>Acknowledge signal <Icon name="arrowUpRight" size={16} /></button></article></section>}

      {view === 'lakehouse' && <section className="lineage-layout"><article className="surface-card lineage-card"><div className="surface-header"><div><span className="section-kicker">MEDALLION LINEAGE</span><h2>From event to fair-use insight</h2></div><button className="text-button" onClick={() => onToast('Lineage export prepared for data governance review.')}>Export lineage <Icon name="download" size={15} /></button></div><div className="lineage-flow"><div><span className="lineage-icon raw"><Icon name="database" size={20} /></span><b>Raw</b><small>Immutable event + media references</small></div><i><Icon name="chevronRight" size={20} /></i><div><span className="lineage-icon silver"><Icon name="refresh" size={20} /></span><b>Silver</b><small>Validated, consent-aware entities</small></div><i><Icon name="chevronRight" size={20} /></i><div><span className="lineage-icon gold"><Icon name="chart" size={20} /></span><b>Gold</b><small>Governed hiring metrics</small></div><i><Icon name="chevronRight" size={20} /></i><div><span className="lineage-icon feature"><Icon name="sparkles" size={20} /></span><b>Features</b><small>Versioned AI inputs</small></div></div><div className="lineage-notice"><Icon name="shield" size={16} /> Consent changes and deletion requests flow downstream through every derived dataset.</div></article><article className="surface-card retention-card"><span className="section-kicker">RETENTION POLICY</span><h2>Candidate data controls</h2><div className="retention-rule"><span>Recordings</span><b>90 days</b></div><div className="retention-rule"><span>Transcripts</span><b>180 days</b></div><div className="retention-rule"><span>Aggregated metrics</span><b>24 months</b></div><button className="button button-secondary full" onClick={() => onToast('A deletion orchestration preview was generated for this tenant.')}>Preview deletion workflow</button></article></section>}
    </main>
  );
}
