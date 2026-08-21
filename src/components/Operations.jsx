import { useState } from 'react';
import { Icon } from './Icon.jsx';
import { reliabilityServices } from '../data/platformData.js';

const objectives = [
  { label: 'Room join success', objective: '99.9%', actual: '99.92%', progress: 99, tone: 'mint' },
  { label: 'P95 media latency', objective: '< 120 ms', actual: '84 ms', progress: 78, tone: 'sky' },
  { label: 'Recording completion', objective: '99.5%', actual: '99.81%', progress: 99, tone: 'mint' },
  { label: 'Transcript freshness', objective: '< 3 sec', actual: '1.8 sec', progress: 67, tone: 'amber' },
];

const releases = [
  { version: 'web-2026.08.20.3', state: 'Canary', detail: '10% of Northstar interviewers · 12 min ago' },
  { version: 'copilot-v4.2.1', state: 'Healthy', detail: 'Prompt policy set v12 · 52 min ago' },
  { version: 'events-v1.4', state: 'Stable', detail: 'Schema registry compatible · Yesterday' },
];

export function Operations({ onToast }) {
  const [drillRunning, setDrillRunning] = useState(false);
  return (
    <main className="page operations-page">
      <section className="ops-header surface-card"><div><span className="pill pill-mint"><span className="pulse-dot" /> 99.98% PLATFORM AVAILABLE</span><h2>Operate with <em>calm, measurable confidence.</em></h2><p>Signals from the application, media edge, event fabric, and AI services resolve into a shared operational picture.</p></div><div className="ops-status-box"><span className="section-kicker">ON-CALL NOW</span><div><span className="oncall-avatar">RK</span><span><b>Rafael Kim</b><small>Media reliability · APAC</small></span><button className="icon-button tiny" onClick={() => onToast('Rafael Kim has been notified through the on-call connector.')} aria-label="Contact on-call"><Icon name="external" size={16} /></button></div></div></section>
      <section className="slo-grid">{objectives.map((item) => <article className="surface-card slo-card" key={item.label}><div><span>{item.label}</span><span className={`status-chip status-${item.tone}`}>On target</span></div><h2>{item.actual}</h2><p>Objective {item.objective}</p><div className="slo-meter"><span className={`meter-${item.tone}`} style={{ width: `${item.progress}%` }} /></div></article>)}</section>
      <section className="ops-grid"><article className="surface-card services-card"><div className="surface-header"><div><span className="section-kicker">SERVICE MAP</span><h2>Critical path health</h2></div><button className="text-button" onClick={() => onToast('A live trace explorer would open here in the production connection.')}>Trace explorer <Icon name="arrowUpRight" size={14} /></button></div><div className="service-map">{reliabilityServices.map((service) => <article key={service.name}><span className={`service-health-dot ${service.tone}`} /><div><b>{service.name}</b><small>{service.region}</small></div><span>{service.status}</span><strong>{service.latency}</strong><button className="icon-button tiny" aria-label={`Inspect ${service.name}`}><Icon name="chevronRight" size={16} /></button></article>)}</div><div className="service-chain"><span>Browser RUM</span><i /><span>API gateway</span><i /><span>Media edge</span><i /><span>Event fabric</span><i /><span>AI services</span></div></article><aside className="surface-card resilience-card"><span className="section-kicker">RESILIENCE READINESS</span><h2>Last recovery drill</h2><div className="drill-score"><span>96</span><div><b>Healthy recovery</b><small>Regional media failover · 14 days ago</small></div></div><ul><li><Icon name="check" size={15} /> RTO objective under 8 min</li><li><Icon name="check" size={15} /> Kafka replay validated</li><li><Icon name="check" size={15} /> Recording restore sampled</li></ul><button className="button button-secondary full" disabled={drillRunning} onClick={() => { setDrillRunning(true); onToast('A non-production recovery drill has started. No live interviews are affected.'); setTimeout(() => setDrillRunning(false), 1800); }}><Icon name={drillRunning ? 'refresh' : 'activity'} size={16} /> {drillRunning ? 'Running safe drill…' : 'Start safe drill'}</button></aside></section>
      <section className="surface-card release-card"><div className="surface-header"><div><span className="section-kicker">PROGRESSIVE DELIVERY</span><h2>What is moving through the platform</h2></div><button className="button button-secondary compact-button" onClick={() => onToast('A feature flag review has been opened for authorized release managers.')}><Icon name="settings" size={15} /> Review flags</button></div><div className="release-list">{releases.map((release) => <div key={release.version}><span className="release-dot" /><code>{release.version}</code><span className={`status-chip ${release.state === 'Canary' ? 'status-violet' : 'status-mint'}`}>{release.state}</span><p>{release.detail}</p><button className="text-button" onClick={() => onToast(`${release.version} has a safe rollback plan and signed build provenance.`)}>Details <Icon name="chevronRight" size={14} /></button></div>)}</div></section>
    </main>
  );
}
