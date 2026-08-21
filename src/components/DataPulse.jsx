import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';
import { platformApi } from '../lib/platformApi.js';
import { isRemoteApiEnabled } from '../lib/session.js';
import { ErrorNote } from './ErrorNote.jsx';

function stateTone(state) {
  if (state === 'up') return 'mint';
  if (state === 'sandbox_mock' || state === 'local_only') return 'amber';
  return 'coral';
}

export function DataPulse({ onToast }) {
  const apiMode = isRemoteApiEnabled();
  const [view, setView] = useState('stream');
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);
  const [events, setEvents] = useState([]);
  const [quality, setQuality] = useState([]);
  const [schemas, setSchemas] = useState([]);
  const [zones, setZones] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      platformApi.getOpsHealth(),
      platformApi.getEvents(),
      platformApi.getDataQuality(),
      platformApi.getSchemas(),
      platformApi.getLakehouseZones(),
    ]).then(([nextHealth, nextEvents, nextQuality, nextSchemas, nextZones]) => {
      if (!active) return;
      setHealth(nextHealth);
      setEvents(Array.isArray(nextEvents) ? nextEvents.slice(-20).reverse() : []);
      setQuality(Array.isArray(nextQuality) ? nextQuality : []);
      setSchemas(Array.isArray(nextSchemas) ? nextSchemas : []);
      setZones(nextZones);
    }).catch((reason) => { if (active) setError(reason); });
    return () => { active = false; };
  }, []);

  const bus = health?.providers?.find((item) => item.id === 'event-bus');
  const redpanda = health?.providers?.find((item) => item.id === 'redpanda');
  const registry = health?.providers?.find((item) => item.id === 'schema-registry');
  const visibleEvents = paused ? events : events;

  return (
    <main className="page data-page">
      <section className="data-header-card surface-card">
        <div>
          <span className="pill pill-sky"><Icon name="database" size={14} /> EVENT PLANE (HONEST)</span>
          <h2>Live health, <em>not a seeded 99.97%.</em></h2>
          <p>{apiMode ? `Adapter: ${health?.eventAdapter || '…'} · persistence ${health?.persistence || '…'}. KafkaProducerAdapter produces only when Redpanda answers.` : 'API mode is off. This screen will not invent Kafka throughput.'}</p>
        </div>
        <div className="stream-health">
          <div className="stream-rings"><i /><i /><i /><span><Icon name="activity" size={21} /></span></div>
          <div>
            <small>EVENT ADAPTER</small>
            <strong>{health?.eventAdapter || '…'}</strong>
            <p>{redpanda?.ok ? 'Redpanda reachable' : 'Redpanda not connected'}</p>
          </div>
        </div>
      </section>
      <ErrorNote error={error} />

      <section className="data-tabs" role="tablist">
        <button className={view === 'stream' ? 'is-active' : ''} onClick={() => setView('stream')} role="tab" aria-selected={view === 'stream'}><Icon name="activity" size={16} /> Live stream</button>
        <button className={view === 'quality' ? 'is-active' : ''} onClick={() => setView('quality')} role="tab" aria-selected={view === 'quality'}><Icon name="check" size={16} /> Data quality</button>
        <button className={view === 'lakehouse' ? 'is-active' : ''} onClick={() => setView('lakehouse')} role="tab" aria-selected={view === 'lakehouse'}><Icon name="layers" size={16} /> Lakehouse lineage</button>
      </section>

      {view === 'stream' && (
        <section className="data-grid">
          <article className="surface-card event-stream-card">
            <div className="surface-header">
              <div><span className="section-kicker">TENANT EVENT LOG</span><h2>{events.length ? `${events.length} events in this process` : 'No events yet'}</h2></div>
              <button className={`button button-secondary compact-button ${paused ? 'is-active' : ''}`} onClick={() => { setPaused((value) => !value); onToast(paused ? 'Event stream resumed.' : 'Event stream paused locally.'); }}><Icon name={paused ? 'play' : 'pause'} size={15} /> {paused ? 'Resume' : 'Pause'}</button>
            </div>
            <div className="event-feed">
              {visibleEvents.length === 0 && <p className="empty-schedule">Empty until something happens in this tenant (create an interview, consent, scorecard). Seeded Kafka explorer copy is gone.</p>}
              {visibleEvents.map((event) => (
                <div className="event-row" key={event.eventId || `${event.offset}-${event.type}`}>
                  <time>{event.occurredAt ? String(event.occurredAt).slice(11, 19) : '—'}</time>
                  <span className="event-node node-mint"><i /></span>
                  <div><code>{event.type}</code><p>offset {event.offset} · {event.payload?.interviewId || event.payload?.tenantId}</p></div>
                </div>
              ))}
            </div>
            <div className="event-footer">
              <span><Icon name="lock" size={14} /> {bus?.note || 'Memory log'}</span>
              <button onClick={() => platformApi.requestReplay('interview.lifecycle.v1').then((job) => onToast(`Replay job ${job.id} queued locally.`)).catch((reason) => onToast(reason.message))}>Replay range <Icon name="arrowUpRight" size={13} /></button>
            </div>
          </article>
          <aside className="surface-card topic-card">
            <div className="surface-header compact"><div><span className="section-kicker">CONTRACTS</span><h2>Schema registry</h2></div><span className={`status-chip status-${stateTone(registry?.state)}`}>{registry?.state || 'unknown'}</span></div>
            <div className="topic-list">
              {(schemas.length ? schemas : [{ name: 'none registered', owner: '—', version: '' }]).map((topic) => (
                <article key={topic.name}><span className={`topic-status ${registry?.ok ? 'healthy' : 'degraded'}`} /><div><code>{topic.name}</code><p>{topic.owner} · v{topic.version}</p></div><span className={registry?.ok ? 'lag-good' : 'lag-warn'}>{registry?.ok ? 'registered' : 'local map'}</span></article>
              ))}
            </div>
            <p className="microcopy">{registry?.note} Last error: {registry?.lastError || 'none'}.</p>
          </aside>
        </section>
      )}

      {view === 'quality' && (
        <section className="quality-grid">
          {(quality.length ? quality : [{ rule: 'No quality samples', status: 'n/a', value: '—', detail: 'Publish an event first.' }]).map((metric) => (
            <article className="surface-card quality-card" key={metric.rule || metric.name}>
              <div className="quality-top"><span><Icon name="check" size={17} /></span></div>
              <p>{metric.rule || metric.name}</p>
              <h2>{metric.value}</h2>
              <small>{metric.detail || metric.note}</small>
            </article>
          ))}
        </section>
      )}

      {view === 'lakehouse' && (
        <section className="lineage-layout">
          <article className="surface-card lineage-card">
            <div className="surface-header"><div><span className="section-kicker">MEDALLION COUNTS (THIS PROCESS)</span><h2>Not a warehouse catalog</h2></div></div>
            <div className="lineage-flow">
              <div><span className="lineage-icon raw"><Icon name="database" size={20} /></span><b>Bronze</b><small>{zones?.bronze?.count ?? 0} records</small></div>
              <i><Icon name="chevronRight" size={20} /></i>
              <div><span className="lineage-icon silver"><Icon name="refresh" size={20} /></span><b>Silver</b><small>{zones?.silver?.count ?? 0} records</small></div>
              <i><Icon name="chevronRight" size={20} /></i>
              <div><span className="lineage-icon gold"><Icon name="chart" size={20} /></span><b>Gold</b><small>{zones?.gold?.count ?? 0} records</small></div>
            </div>
            <div className="lineage-notice"><Icon name="shield" size={16} /> These are API objects, not Iceberg tables. Deletion jobs are queued locally.</div>
          </article>
        </section>
      )}
    </main>
  );
}
