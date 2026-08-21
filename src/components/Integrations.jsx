import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';
import { platformApi } from '../lib/platformApi.js';
import { ErrorNote } from './ErrorNote.jsx';

export function Integrations({ onToast }) {
  const [showAll, setShowAll] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [webhooks, setWebhooks] = useState([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      platformApi.getIntegrations(),
      platformApi.getFoundationSnapshot().then((snap) => snap.webhooks || []).catch(() => []),
    ]).then(([nextItems, nextHooks]) => {
      if (!active) return;
      setItems(Array.isArray(nextItems) ? nextItems : []);
      setWebhooks(Array.isArray(nextHooks) ? nextHooks : []);
    }).catch((reason) => { if (active) setError(reason); });
    return () => { active = false; };
  }, []);

  const visible = showAll ? items : items.filter((item) => item.statusKind !== 'sandbox_mock');

  return (
    <main className="page integrations-page">
      <section className="integration-hero surface-card">
        <div>
          <span className="pill pill-violet"><Icon name="plug" size={14} /> SANDBOX, NOT PRODUCTION ATS</span>
          <h2>Connectors stay <em>honest about OAuth.</em></h2>
          <p>WireMock is a sandbox mock until an OAuth app exists. This screen will never say “Connected to Greenhouse”.</p>
          <div className="integration-hero-actions">
            <button className="button button-primary" onClick={() => onToast('OAuth marketplace is blocked_on_decision until credentials exist.')}><Icon name="plus" size={17} /> Add integration</button>
            <button className="button button-secondary" onClick={() => onToast(`${webhooks.length} webhook registration(s) in this process.`)}><Icon name="terminal" size={17} /> Webhooks ({webhooks.length})</button>
          </div>
        </div>
        <div className="integration-art"><span className="hub-icon"><Icon name="plug" size={30} /></span><i className="hub-line h1"/><i className="hub-line h2"/><i className="hub-line h3"/><span className="orbit-app app-one">GH</span><span className="orbit-app app-two">SL</span><span className="orbit-app app-three">GW</span></div>
      </section>
      <ErrorNote error={error} />
      <section className="integration-toolbar">
        <div><span className="section-kicker">TENANT CONNECTIONS</span><h2>Managed integrations</h2></div>
        <div className="filter-chips">
          <button className={`filter-chip ${showAll ? 'is-active' : ''}`} onClick={() => setShowAll(true)}>All ({items.length})</button>
          <button className={`filter-chip ${!showAll ? 'is-active' : ''}`} onClick={() => setShowAll(false)}>Needs OAuth</button>
        </div>
      </section>
      <section className="integration-card-grid">
        {visible.map((integration) => (
          <article className="surface-card integration-card" key={integration.id || integration.name}>
            <div className="integration-card-head">
              <span className={`integration-logo logo-${integration.accent}`}>{integration.initials}</span>
              <button className="icon-button tiny" aria-label={`Inspect ${integration.name}`} onClick={() => onToast(integration.note || integration.status)}><Icon name="more" size={18} /></button>
            </div>
            <h3>{integration.name}</h3>
            <p>{integration.type}</p>
            <div className="integration-card-foot">
              <span className={integration.statusKind === 'sandbox_mock' ? 'status-chip status-amber' : 'status-chip status-coral'}>{integration.status}</span>
              <small>{integration.sync}</small>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
