import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';
import { platformApi } from '../lib/platformApi.js';
import { ErrorNote } from './ErrorNote.jsx';

function toneFor(state) {
  if (state === 'up' || state === 'on_target') return 'mint';
  if (state === 'sandbox_mock' || state === 'local_only' || state === 'watch') return 'amber';
  return 'amber';
}

export function Operations({ onToast }) {
  const [drillRunning, setDrillRunning] = useState(false);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);
  const [slo, setSlo] = useState([]);
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.all([platformApi.getOpsHealth(), platformApi.getSlo(), platformApi.getIncidents()]).then(([nextHealth, nextSlo, nextIncidents]) => {
      if (!active) return;
      setHealth(nextHealth);
      setSlo(Array.isArray(nextSlo) ? nextSlo : []);
      setIncidents(Array.isArray(nextIncidents) ? nextIncidents : []);
    }).catch((reason) => { if (active) setError(reason); });
    return () => { active = false; };
  }, []);

  const providers = health?.providers || [];
  const process = health?.process || {};
  const otlp = providers.find((item) => item.id === 'otlp');

  return (
    <main className="page operations-page">
      <section className="ops-header surface-card">
        <div>
          <span className={`pill pill-${otlp?.ok ? 'mint' : 'amber'}`}><span className="pulse-dot" /> {health ? `${health.eventAdapter} · persistence ${health.persistence}` : 'Loading health…'}</span>
          <h2>Operate on <em>measured, labelled signals.</em></h2>
          <p>This process: {process.requests || 0} requests, {process.errors5xx || 0} 5xx. Not a 30-day platform SLO. Failures include a support trace id.</p>
        </div>
        <div className="ops-status-box">
          <span className="section-kicker">ON-CALL</span>
          <div>
            <span className="oncall-avatar">—</span>
            <span><b>No on-call connector</b><small>PagerDuty/status page not wired</small></span>
          </div>
        </div>
      </section>
      <ErrorNote error={error} />

      <section className="slo-grid">
        {(slo.length ? slo : [{ name: 'No SLO samples', current: 'n/a', objective: '—', status: 'watch' }]).map((item) => (
          <article className="surface-card slo-card" key={item.name || item.label}>
            <div><span>{item.name || item.label}</span><span className={`status-chip status-${toneFor(item.status)}`}>{item.status}</span></div>
            <h2>{item.current || item.actual}</h2>
            <p>Objective {item.objective}{item.note ? ` · ${item.note}` : ''}</p>
          </article>
        ))}
      </section>

      <section className="ops-grid">
        <article className="surface-card services-card">
          <div className="surface-header">
            <div><span className="section-kicker">PROVIDER MAP</span><h2>Connected vs mocked</h2></div>
            <button className="text-button" onClick={() => onToast(otlp?.ok ? `OTLP last success ${otlp.lastSuccess}` : 'Collector down — traces stay in-process.')}>OTLP {otlp?.state || '…'} <Icon name="arrowUpRight" size={14} /></button>
          </div>
          <div className="service-map">
            {providers.map((service) => (
              <article key={service.id}>
                <span className={`service-health-dot ${toneFor(service.state)}`} />
                <div><b>{service.label}</b><small>{service.state}{service.lastError ? ` · ${service.lastError}` : ''}</small></div>
                <span>{service.ok ? 'reachable' : 'not connected'}</span>
                <strong>{service.lastSuccess ? String(service.lastSuccess).slice(11, 19) : '—'}</strong>
              </article>
            ))}
          </div>
        </article>
        <aside className="surface-card resilience-card">
          <span className="section-kicker">RESILIENCE</span>
          <h2>Recovery drill</h2>
          <div className="drill-score"><span>{incidents.length}</span><div><b>Open incidents</b><small>In-memory records only</small></div></div>
          <ul>
            <li><Icon name="check" size={15} /> File store survives API restart</li>
            <li><Icon name="alert" size={15} /> Kafka replay needs Redpanda</li>
            <li><Icon name="alert" size={15} /> No volume restore evidence</li>
          </ul>
          <button className="button button-secondary full" disabled={drillRunning} onClick={() => { setDrillRunning(true); onToast('Local drill record only. No live interviews affected.'); setTimeout(() => setDrillRunning(false), 1200); }}>
            <Icon name={drillRunning ? 'refresh' : 'activity'} size={16} /> {drillRunning ? 'Recording…' : 'Start local drill record'}
          </button>
        </aside>
      </section>
    </main>
  );
}
