import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';
import { platformApi } from '../lib/platformApi.js';
import { isRemoteApiEnabled } from '../lib/session.js';
import { ErrorNote } from './ErrorNote.jsx';

export function Intelligence({ onToast }) {
  const apiMode = isRemoteApiEnabled();
  const [consent, setConsent] = useState(false);
  const [question, setQuestion] = useState('How should we follow up on offline conflict handling?');
  const [status, setStatus] = useState(null);
  const [answer, setAnswer] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    platformApi.getAiStatus().then((data) => { if (active) setStatus(data); }).catch((reason) => { if (active) setError(reason); });
    return () => { active = false; };
  }, []);

  const ask = async () => {
    setBusy(true);
    setError('');
    try {
      const result = await platformApi.suggestGroundedFollowUp({
        question,
        transcript: question,
        uncovered: ['Accessibility mindset'],
        consent: { aiProcessing: consent },
      });
      setAnswer(result);
      if (result.allowed === false) onToast('Consent is required before any model call.');
      else if (result.abstention) onToast('The copilot abstained — not enough grounded evidence.');
      else onToast(result.fallback ? 'Answer from labelled deterministic fallback (Ollama down).' : 'Answer from the configured model gateway.');
    } catch (reason) {
      setError(reason);
    } finally {
      setBusy(false);
    }
  };

  const generation = status?.generation || 'deterministic-fallback';
  const modelLabel = status?.ollama?.ok ? status.ollama.model : 'local-heuristic';

  return (
    <main className="page intelligence-page">
      <section className="intelligence-hero surface-card">
        <div className="intelligence-hero-copy"><span className="pill pill-violet"><Icon name="sparkles" size={14} /> HUMAN-GOVERNED AI</span><h2>Ask a grounded question. <em>Get evidence or an abstention.</em></h2><p>Assistive only. No hire/reject. Consent is required before a model call. If Ollama is down, the response is a labelled local fallback.</p></div>
        <div className="model-card"><div className="model-card-top"><span className="model-orb"><Icon name="sparkles" size={23} /></span><span className={`status-chip ${status?.ollama?.ok ? 'status-mint' : 'status-amber'}`}>{status?.ollama?.ok ? 'Ollama reachable' : 'Fallback path'}</span></div><small>ACTIVE GENERATION PATH</small><strong>{generation}</strong><p>Model: {modelLabel} · Retrieval: {status?.retrieval || 'local-keyword'}</p><div className="model-stat-row"><span><b>{status?.ollama?.ok ? 'live' : 'local'}</b><small>provider</small></span><span><b>{status?.qdrant?.ok ? 'qdrant' : 'keyword'}</b><small>index</small></span><span><b>0</b><small>auto decisions</small></span></div></div>
      </section>

      <section className="intelligence-grid">
        <article className="surface-card prompt-card">
          <div className="surface-header compact"><div><span className="section-kicker">ASSISTIVE ASK</span><h2>Grounded follow-up</h2></div></div>
          {!apiMode && <p className="microcopy">API mode is off. This still returns a labelled local heuristic.</p>}
          <ErrorNote error={error} />
          <label className="form-field"><span>Your question (interviewers only)</span><textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={3} aria-label="Copilot question" /></label>
          <label className="approval-toggle"><span><b>I consent to AI assistance on this question</b><small>Required. No model call without this.</small></span><button className={`toggle ${consent ? 'is-on' : ''}`} onClick={() => setConsent((value) => !value)} aria-pressed={consent}><i /></button></label>
          <div className="prompt-actions"><button className="button button-primary" disabled={busy} onClick={ask}><Icon name="sparkles" size={16} /> {busy ? 'Asking…' : 'Ask copilot'}</button></div>
          {answer && (
            <div className="ai-answer-card">
              {answer.abstention || answer.allowed === false ? (
                <blockquote>{answer.message || answer.reason || 'Abstained.'}</blockquote>
              ) : (
                <blockquote>“{answer.question}”</blockquote>
              )}
              <div className="prompt-grounding">
                <span><Icon name="layers" size={15} /> Provider <b>{answer.provider || generation}</b></span>
                <span><Icon name="file" size={15} /> Model <b>{answer.modelVersion || modelLabel}</b></span>
                <span><Icon name="shield" size={15} /> {answer.fallback ? 'Labelled fallback' : 'Gateway path'} · human review required</span>
                {(answer.citations || []).slice(0, 3).map((item) => <span key={String(item)}><Icon name="check" size={15} /> {typeof item === 'string' ? item : item.title || item}</span>)}
              </div>
            </div>
          )}
        </article>
        <article className="surface-card control-card">
          <span className="section-kicker">MODEL GOVERNANCE</span>
          <h2>Human approval remains mandatory</h2>
          <p>Audit stores provider, model version, and an input hash — not the raw transcript or PII.</p>
          <div className="control-list"><span><Icon name="check" size={15} /> Consent 409 if unchecked</span><span><Icon name="check" size={15} /> Abstain when evidence is thin</span><span><Icon name="check" size={15} /> No auto-disposition</span></div>
          <button className="button button-secondary full" onClick={() => onToast('Evaluation suite remains local (grounding, privacy, harmful-rejection, low-confidence).')}><Icon name="layers" size={16} /> View evaluation suite</button>
        </article>
      </section>
    </main>
  );
}
