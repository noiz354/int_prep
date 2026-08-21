import { useState } from 'react';
import { Icon } from './Icon.jsx';

const controls = [
  { title: 'Interview recording consent', description: 'Explicit consent collected before room admission and stored with the session audit trail.', status: 'Enforced', icon: 'file', tone: 'mint' },
  { title: 'AI-assisted decision policy', description: 'Human review is required for every recommendation and hiring disposition.', status: 'Enforced', icon: 'sparkles', tone: 'violet' },
  { title: 'Sensitive data redaction', description: 'PII detection and policy-based transcript masking are active in search and export flows.', status: 'Monitoring', icon: 'lock', tone: 'sky' },
  { title: 'Regional data residency', description: 'Northstar interview artifacts remain in their approved Singapore processing region.', status: 'Verified', icon: 'globe', tone: 'mint' },
];

const audit = [
  { time: '09:31:02', action: 'Recording consent captured', actor: 'Alex Morgan', icon: 'check' },
  { time: '09:31:04', action: 'Room key issued', actor: 'Media control plane', icon: 'lock' },
  { time: '09:42:18', action: 'AI evidence cited', actor: 'Interview copilot v4.2', icon: 'sparkles' },
  { time: '09:43:09', action: 'Follow-up queued by interviewer', actor: 'Maya Patel', icon: 'users' },
];

export function TrustCenter({ onToast }) {
  const [redaction, setRedaction] = useState(true);
  const [hold, setHold] = useState(false);
  return (
    <main className="page trust-page">
      <section className="trust-hero surface-card"><div className="trust-hero-copy"><span className="pill pill-mint"><Icon name="shield" size={14} /> TRUST POSTURE: STRONG</span><h2>Make every decision <em>defensible by design.</em></h2><p>Controls travel with candidate data—from consent and access to model outputs, exports, and deletion.</p><div className="trust-statline"><span><b>142</b> audited actions today</span><span><b>0</b> critical policy violations</span><span><b>99.9%</b> encrypted artifacts</span></div></div><div className="trust-shield-art"><div className="shield-orbit orbit-one" /><div className="shield-orbit orbit-two" /><span><Icon name="shield" size={54} /></span><i className="shield-check"><Icon name="check" size={17} /></i></div></section>

      <section className="control-grid">{controls.map((control) => <article className="surface-card control-status-card" key={control.title}><div className={`control-icon control-${control.tone}`}><Icon name={control.icon} size={20} /></div><div><span className={`status-chip status-${control.tone}`}>{control.status}</span><h3>{control.title}</h3><p>{control.description}</p></div><button className="icon-button tiny" aria-label={`Inspect ${control.title}`} onClick={() => onToast(`${control.title} is configured in the policy center.`)}><Icon name="arrowUpRight" size={16} /></button></article>)}</section>

      <section className="trust-grid">
        <article className="surface-card audit-card"><div className="surface-header"><div><span className="section-kicker">TAMPER-EVIDENT AUDIT</span><h2>Interview int-2048</h2></div><button className="text-button" onClick={() => onToast('A signed audit export has been prepared.')}>Export audit <Icon name="download" size={15} /></button></div><div className="audit-list">{audit.map((item) => <div className="audit-row" key={item.time}><time>{item.time}</time><span className="audit-icon"><Icon name={item.icon} size={15} /></span><div><b>{item.action}</b><small>{item.actor}</small></div><span className="audit-hash">SHA-256 verified</span></div>)}</div><div className="audit-footer"><Icon name="lock" size={15} /> This chain is append-only. Authorized reviewers can verify exported evidence independently.</div></article>
        <aside className="surface-card policy-card"><span className="section-kicker">ACTIVE CONTROLS</span><h2>Policy switches</h2><label className="policy-toggle"><span><b>Redact sensitive content</b><small>Apply to search and governed exports</small></span><button className={`toggle ${redaction ? 'is-on' : ''}`} onClick={() => { setRedaction((value) => !value); onToast(`Sensitive-content redaction ${redaction ? 'requires review before it can be disabled.' : 'is now enabled.'}`); }} aria-pressed={redaction}><i /></button></label><label className="policy-toggle"><span><b>Legal hold</b><small>Pause deletion for this candidate record</small></span><button className={`toggle ${hold ? 'is-on' : ''}`} onClick={() => { setHold((value) => !value); onToast(hold ? 'Legal hold removal request created.' : 'Legal hold request routed to Privacy Admin.'); }} aria-pressed={hold}><i /></button></label><div className="policy-callout"><Icon name="alert" size={16} /><span><b>Approval boundary</b> — policy changes are logged and may require Privacy Admin approval.</span></div><button className="button button-secondary full" onClick={() => onToast('The compliance evidence center is ready for a SOC 2 review.')}>Open compliance evidence</button></aside>
      </section>
    </main>
  );
}
