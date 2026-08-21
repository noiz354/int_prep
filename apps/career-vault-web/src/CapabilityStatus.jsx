import { capabilitiesForProduct, IMPLEMENTATION_STATES, summarizeByState } from '../../../src/data/capabilityRegistry.js';

export function CapabilityStatus({ product }) {
  const summary = summarizeByState(product);
  const rows = capabilitiesForProduct(product);
  return (
    <article className="vault-card capability-status-card">
      <div className="vault-section-title">
        <div>
          <span className="vault-eyebrow">SHARED REGISTRY</span>
          <h2>Honest capability status</h2>
        </div>
      </div>
      <p className="vault-micro">{summary.userUsable} user-usable of {summary.total}. Same schema as the main Feature Catalog.</p>
      <div className="capability-status-counts">
        {Object.entries(summary.counts).map(([state, count]) => (
          <span key={state}><b>{count}</b> {IMPLEMENTATION_STATES[state].label}</span>
        ))}
      </div>
      <div className="capability-status-list">
        {rows.map((item) => (
          <article key={item.id}>
            <code>{item.id}</code>
            <b>{IMPLEMENTATION_STATES[item.state].label}</b>
            <small>{item.userCan}</small>
          </article>
        ))}
      </div>
    </article>
  );
}
