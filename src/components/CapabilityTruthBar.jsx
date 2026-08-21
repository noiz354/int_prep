import { IMPLEMENTATION_STATES, STATE_ORDER, summarizeByState } from '../data/capabilityRegistry.js';

export function CapabilityTruthBar({ product, className = '' }) {
  const summary = summarizeByState(product);
  return (
    <div className={`capability-truth-bar ${className}`} role="group" aria-label="Capability status counts">
      <p className="capability-truth-total">
        <strong>{summary.userUsable}</strong> user-usable
        <span> of {summary.total}</span>
      </p>
      <ul>
        {STATE_ORDER.map((state) => {
          const meta = IMPLEMENTATION_STATES[state];
          const count = summary.counts[state];
          return (
            <li key={state}>
              <span className={`implementation-tag tag-${meta.tone}`}>{meta.label}</span>
              <b>{count}</b>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
