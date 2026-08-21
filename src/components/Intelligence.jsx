import { useState } from 'react';
import { Icon } from './Icon.jsx';
import { intelligenceSignals } from '../data/platformData.js';

const evidence = [
  { time: '09:42:18', competency: 'Systems thinking', quote: 'Separate rendering from synchronization so the experience stays responsive when the network is noisy.', confidence: 'High', tone: 'violet' },
  { time: '09:43:05', competency: 'Execution & quality', quote: 'Preserve local intent, use idempotency keys, and replay the queue when the connection returns.', confidence: 'High', tone: 'mint' },
  { time: '09:44:11', competency: 'Accessibility mindset', quote: 'No evidence recorded yet. A neutral follow-up is available.', confidence: 'Open', tone: 'amber' },
];

export function Intelligence({ onToast }) {
  const [approval, setApproval] = useState(false);
  const [model, setModel] = useState('Signal Reasoner v4.2');
  return (
    <main className="page intelligence-page">
      <section className="intelligence-hero surface-card">
        <div className="intelligence-hero-copy"><span className="pill pill-violet"><Icon name="sparkles" size={14} /> HUMAN-GOVERNED AI</span><h2>Recommendations with <em>evidence, context, and controls.</em></h2><p>SignalRoom turns approved interview materials into assistive, reviewable guidance—not automatic hiring decisions.</p><div className="hero-commitments"><span><Icon name="lock" size={15} /> Tenant-isolated retrieval</span><span><Icon name="file" size={15} /> Evidence linked</span><span><Icon name="users" size={15} /> Human override</span></div></div>
        <div className="model-card"><div className="model-card-top"><span className="model-orb"><Icon name="sparkles" size={23} /></span><span className="status-chip status-mint"><i className="tiny-live-dot" /> Healthy</span></div><small>ACTIVE POLICY-BONDED MODEL</small><strong>{model}</strong><p>Prompt set: Interview Copilot · v12</p><div className="model-stat-row"><span><b>84%</b><small>review confidence</small></span><span><b>99.1%</b><small>grounded output</small></span><span><b>0</b><small>unreviewed decisions</small></span></div></div>
      </section>

      <section className="intelligence-grid">
        <article className="surface-card signals-card"><div className="surface-header"><div><span className="section-kicker">LIVE DECISION SUPPORT</span><h2>Interview signal board</h2></div><button className="text-button" onClick={() => onToast('Signal thresholds are configured by your hiring policy.')}>Configure <Icon name="arrowUpRight" size={14} /></button></div><div className="signal-rows">{intelligenceSignals.map((signal) => <div key={signal.label} className="signal-row"><div><span>{signal.label}</span><strong>{signal.value}</strong></div><div className="signal-bar"><span style={{ width: `${signal.progress}%` }} /></div><em>{signal.status}</em></div>)}</div><div className="policy-note"><Icon name="shield" size={16} /><span><b>Policy guardrail:</b> sentiment and integrity signals are advisory only and cannot determine a disposition.</span></div></article>
        <article className="surface-card prompt-card"><div className="surface-header compact"><div><span className="section-kicker">GROUNDED PROMPT</span><h2>Next best question</h2></div><span className="confidence-pill">0.84 confidence</span></div><blockquote>“How would you make sure an offline edit does not silently overwrite a collaborator’s newer change?”</blockquote><div className="prompt-grounding"><span><Icon name="target" size={15} /> Maps to <b>Systems thinking · 30%</b></span><span><Icon name="file" size={15} /> Source: rubric v6.3</span></div><div className="prompt-actions"><button className="button button-primary" onClick={() => onToast('Follow-up placed in the interviewer’s private queue.')}><Icon name="plus" size={16} /> Add to queue</button><button className="button button-secondary" onClick={() => onToast('Prompt dismissed and feedback captured for calibration.')}><Icon name="x" size={16} /> Dismiss</button></div></article>
      </section>

      <section className="evidence-grid">
        <article className="surface-card evidence-card"><div className="surface-header"><div><span className="section-kicker">TRACEABLE EVIDENCE</span><h2>What the model can cite</h2></div><button className="icon-button tiny" onClick={() => onToast('Evidence bundle exported with policy-controlled access.')} aria-label="Export evidence"><Icon name="download" size={17} /></button></div><div className="evidence-list">{evidence.map((item) => <article key={item.time} className={`evidence-item evidence-${item.tone}`}><span className="evidence-time">{item.time}</span><div><span className={`status-chip status-${item.tone}`}>{item.competency}</span><p>“{item.quote}”</p><small><Icon name="check" size={13} /> Transcript source · confidence {item.confidence}</small></div><button className="icon-button tiny" aria-label={`Review ${item.competency} evidence`}><Icon name="chevronRight" size={17} /></button></article>)}</div></article>
        <article className="surface-card control-card"><span className="section-kicker">MODEL GOVERNANCE</span><h2>Human approval remains mandatory</h2><p>Changing a model, rubric, or retrieval collection produces a versioned audit record and requires the configured reviewer path.</p><div className="control-list"><span><Icon name="check" size={15} /> Prompt and policy version logged</span><span><Icon name="check" size={15} /> Low-confidence route enabled</span><span><Icon name="check" size={15} /> Reviewer feedback retained</span></div><label className="approval-toggle"><span><b>Approve model update</b><small>Requires Security Admin role</small></span><button className={`toggle ${approval ? 'is-on' : ''}`} onClick={() => { setApproval((value) => !value); onToast(approval ? 'Approval request withdrawn.' : 'Approval request created for Security Admin review.'); }} aria-pressed={approval}><i /></button></label><button className="button button-secondary full" onClick={() => { setModel('Signal Reasoner v4.3 (staged)'); onToast('A staged model version is ready for evaluation, not production.'); }}><Icon name="layers" size={16} /> Stage a model version</button></article>
      </section>
    </main>
  );
}
