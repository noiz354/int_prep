import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';
import { platformApi } from '../lib/platformApi.js';
import { ErrorNote } from './ErrorNote.jsx';

export function TrustCenter({ onToast }) {
  const [redaction, setRedaction] = useState(true);
  const [hold, setHold] = useState(false);
  const [error, setError] = useState(null);
  const [audit, setAudit] = useState([]);
  const [verify, setVerify] = useState(null);
  const [policy, setPolicy] = useState(null);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      platformApi.getAuditLedger(),
      platformApi.verifyAudit(),
      platformApi.getSecurityPolicy(),
      platformApi.getOpsHealth(),
    ]).then(([nextAudit, nextVerify, nextPolicy, nextHealth]) => {
      if (!active) return;
      setAudit(Array.isArray(nextAudit) ? nextAudit.slice(0, 12) : []);
      setVerify(nextVerify);
      setPolicy(nextPolicy);
      setHealth(nextHealth);
    }).catch((reason) => { if (active) setError(reason); });
    return () => { active = false; };
  }, []);

  const otlp = health?.providers?.find((item) => item.id === 'otlp');
  const residency = policy?.residency;

  return (
    <main className="page trust-page">
      <section className="trust-hero surface-card">
        <div className="trust-hero-copy">
          <span className="pill pill-mint"><Icon name="shield" size={14} /> LOCAL TRUST POSTURE</span>
          <h2>Controls you can <em>inspect, not assume.</em></h2>
          <p>Audit is hash-chained in this process. Residency is a policy record, not region pinning. OTLP export is {otlp?.ok ? 'reaching a collector' : 'process-local'}.</p>
          <div className="trust-statline">
            <span><b>{audit.length}</b> audit rows loaded</span>
            <span><b>{verify?.valid === false ? 'break' : 'ok'}</b> chain verify</span>
            <span><b>{otlp?.state || 'unconfigured'}</b> OTLP</span>
          </div>
        </div>
        <div className="trust-shield-art"><div className="shield-orbit orbit-one" /><div className="shield-orbit orbit-two" /><span><Icon name="shield" size={54} /></span><i className="shield-check"><Icon name="check" size={17} /></i></div>
      </section>
      <ErrorNote error={error} />

      <section className="control-grid">
        <article className="surface-card control-status-card">
          <div className="control-icon control-mint"><Icon name="file" size={20} /></div>
          <div><span className="status-chip status-mint">Local record</span><h3>Interview recording consent</h3><p>Consent writes the interview record and audit chain when the API is on.</p></div>
        </article>
        <article className="surface-card control-status-card">
          <div className="control-icon control-violet"><Icon name="sparkles" size={20} /></div>
          <div><span className="status-chip status-violet">Enforced locally</span><h3>AI-assisted decision policy</h3><p>Human review is required. No auto hire/reject.</p></div>
        </article>
        <article className="surface-card control-status-card">
          <div className="control-icon control-sky"><Icon name="lock" size={20} /></div>
          <div><span className="status-chip status-sky">Preview</span><h3>Sensitive data redaction</h3><p>Local email/phone mask. Not a production DLP gateway.</p></div>
        </article>
        <article className="surface-card control-status-card">
          <div className="control-icon control-mint"><Icon name="globe" size={20} /></div>
          <div><span className="status-chip status-amber">Policy only</span><h3>Regional data residency</h3><p>Allowed: {(residency?.allowedRegions || ['local-process']).join(', ')}. Not pinned to a cloud region.</p></div>
        </article>
      </section>

      <section className="trust-grid">
        <article className="surface-card audit-card">
          <div className="surface-header">
            <div><span className="section-kicker">TAMPER-EVIDENT AUDIT</span><h2>{verify?.valid === false ? 'Chain mismatch' : 'Tenant chain'}</h2></div>
            <button className="text-button" onClick={() => onToast(verify?.valid ? 'Chain verified for this tenant.' : 'Verification used the local ledger.')}>Verify <Icon name="download" size={15} /></button>
          </div>
          <div className="audit-list">
            {audit.length === 0 && <p className="empty-schedule">No audit rows yet for this tenant.</p>}
            {audit.map((item) => (
              <div className="audit-row" key={item.id || item.hash || item.time}>
                <time>{item.occurredAt ? String(item.occurredAt).slice(11, 19) : (item.time || '')}</time>
                <span className="audit-icon"><Icon name="check" size={15} /></span>
                <div><b>{item.action}</b><small>{item.actor?.name || item.actor || 'system'}</small></div>
                <span className="audit-hash">{item.hash ? String(item.hash).slice(0, 12) : 'hash'}</span>
              </div>
            ))}
          </div>
          <div className="audit-footer"><Icon name="lock" size={15} /> Append-only in this process. Not an independent WORM store.</div>
        </article>
        <aside className="surface-card policy-card">
          <span className="section-kicker">ACTIVE CONTROLS</span>
          <h2>Policy switches</h2>
          <label className="policy-toggle"><span><b>Redact sensitive content</b><small>Local preview helper</small></span><button className={`toggle ${redaction ? 'is-on' : ''}`} onClick={() => { setRedaction((value) => !value); onToast(`Redaction preview ${redaction ? 'still required for exports.' : 'enabled locally.'}`); }} aria-pressed={redaction}><i /></button></label>
          <label className="policy-toggle"><span><b>Legal hold</b><small>Queued as a local job, not a storage freeze</small></span><button className={`toggle ${hold ? 'is-on' : ''}`} onClick={() => { setHold((value) => !value); onToast(hold ? 'Hold request cleared locally.' : 'Legal hold is a local flag until object storage is wired.'); }} aria-pressed={hold}><i /></button></label>
          <div className="policy-callout"><Icon name="alert" size={16} /><span><b>Trace on failures</b> — API errors include a support trace id.</span></div>
          <button className="button button-secondary full" onClick={() => platformApi.redactText('alex@example.test +62 812 0000 1111').then((result) => onToast(result.redacted)).catch((reason) => onToast(reason.message))}>Preview redaction</button>
        </aside>
      </section>
    </main>
  );
}
