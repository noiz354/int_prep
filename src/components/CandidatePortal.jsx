import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon.jsx';
import { useDevicePreflight } from '../hooks/useDevicePreflight.js';
import { clearEncryptedDraft, readEncryptedDraft, saveEncryptedDraft } from '../lib/secureDraft.js';
import { platformApi } from '../lib/platformApi.js';

const draftScope = 'candidate-preflight:int-2048';
const consentOutboxScope = 'candidate-consent-outbox:int-2048';
const consentItems = [
  { id: 'recording', label: 'Interview recording', detail: 'A recording helps the assigned hiring panel review the conversation according to the retention notice.', required: true },
  { id: 'transcription', label: 'Live transcription', detail: 'Captions and a searchable transcript can support accessibility and structured feedback.', required: true },
  { id: 'aiProcessing', label: 'AI interview assistance', detail: 'Private, evidence-linked prompts may help the interviewer cover the approved rubric. A human remains responsible for decisions.', required: false },
  { id: 'integrityProcessing', label: 'Interview integrity review', detail: 'Consented technical signals may be flagged for trained human review; they do not automatically decide an outcome.', required: false },
];

function DeviceRow({ icon, label, state, detail, children }) {
  const copy = state === 'ready' ? 'Ready' : state === 'checking' ? 'Checking…' : state === 'warning' ? 'Review' : state === 'blocked' ? 'Blocked' : state === 'offline' ? 'Offline' : state === 'unsupported' ? 'Unsupported' : state === 'error' ? 'Needs attention' : 'Not tested';
  return <article className={`preflight-device-row state-${state}`}><span className="preflight-device-icon"><Icon name={icon} size={18} /></span><div><b>{label}</b><small>{detail}</small></div><span className="device-state"><i /> {copy}</span>{children}</article>;
}

export function CandidatePortal({ onToast }) {
  const preflight = useDevicePreflight();
  const [consent, setConsent] = useState({ recording: false, transcription: false, aiProcessing: false, integrityProcessing: false });
  const [hydrated, setHydrated] = useState(false);
  const [savedLocally, setSavedLocally] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    let active = true;
    readEncryptedDraft(draftScope).then((draft) => {
      if (active && draft) {
        setConsent((current) => ({ ...current, ...draft.consent }));
        setSubmitted(Boolean(draft.submitted));
        setSavedLocally(true);
      }
      if (active) setHydrated(true);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const markOnline = () => setOnline(true);
    const markOffline = () => setOnline(false);
    window.addEventListener('online', markOnline);
    window.addEventListener('offline', markOffline);
    return () => { window.removeEventListener('online', markOnline); window.removeEventListener('offline', markOffline); };
  }, []);

  useEffect(() => {
    if (!online) return undefined;
    let active = true;
    const flushConsentOutbox = async () => {
      const queued = await readEncryptedDraft(consentOutboxScope);
      if (!queued?.consent) return;
      try {
        await platformApi.captureConsent('int-2048', queued.consent);
        if (!active) return;
        clearEncryptedDraft(consentOutboxScope);
        setSubmitted(true);
        onToast('Your saved consent choices were synced to the interview audit trail.');
      } catch {
        // Keep the encrypted queued choice until a later online event or retry.
      }
    };
    flushConsentOutbox();
    return () => { active = false; };
  }, [online, onToast]);

  useEffect(() => {
    if (!hydrated) return;
    saveEncryptedDraft(draftScope, { consent, submitted }).then((result) => setSavedLocally(result.persisted));
  }, [consent, submitted, hydrated]);

  const requiredConsentsAccepted = useMemo(() => consent.recording && consent.transcription, [consent]);
  const canEnter = requiredConsentsAccepted && preflight.ready && submitted;

  const toggleConsent = (id) => setConsent((current) => ({ ...current, [id]: !current[id] }));
  const saveConsent = async () => {
    if (!requiredConsentsAccepted) return onToast('Recording and live transcription must be acknowledged before this configured interview can begin. Optional processing remains your choice.');
    setSaving(true);
    try {
      await platformApi.captureConsent('int-2048', { ...consent, legalNoticeVersion: 'candidate-notice-2026.08' });
      setSubmitted(true);
      onToast(online ? 'Your consent choices were recorded with the interview audit trail.' : 'Your encrypted local checklist was saved. It will be synced after reconnection.');
    } catch {
      const queued = await saveEncryptedDraft(consentOutboxScope, { consent: { ...consent, legalNoticeVersion: 'candidate-notice-2026.08' } });
      setSavedLocally(queued.persisted);
      onToast(queued.persisted ? 'The consent service is unavailable. Your encrypted choice is queued for a safe retry when you reconnect.' : 'The consent service is unavailable. Please retry before entering the waiting room.');
    } finally {
      setSaving(false);
    }
  };

  return <main className="page candidate-page">
    <section className="candidate-banner"><div className="candidate-brand"><span className="brand-mark" aria-hidden="true"><i /><i /><i /></span><b>signalroom</b><span>Candidate space</span></div><div className={`candidate-connection ${online ? 'online' : 'offline'}`}><i /> {online ? 'Secure connection active' : 'Offline — checklist is saved locally'}</div></section>
    <section className="candidate-hero surface-card"><div><span className="pill pill-violet"><Icon name="briefcase" size={14} /> NORTHSTAR SYSTEMS</span><h2>Welcome, Alex. Let’s make your interview <em>feel effortless.</em></h2><p>You’re scheduled for a 45-minute technical deep dive for the Senior Frontend Engineer role. Complete this private setup at your pace before entering the waiting room.</p><div className="candidate-appointment"><span><Icon name="calendar" size={16} /> Thursday, 20 August · 09:30 WIB</span><span><Icon name="users" size={16} /> Maya Patel + Jordan Nguyen</span><span><Icon name="clock" size={16} /> 45 minutes</span></div></div><div className="candidate-hero-art"><div className="candidate-art-orbit orbit-a"/><div className="candidate-art-orbit orbit-b"/><span className="candidate-art-card one"><Icon name="check" size={16} /> Guided setup</span><span className="candidate-art-card two"><Icon name="accessibility" size={16} /> Accommodations</span><div className="candidate-avatar-hero">AM</div></div></section>

    <section className="candidate-progress" aria-label="Interview readiness progress"><article className={requiredConsentsAccepted ? 'is-done' : 'is-current'}><span>{requiredConsentsAccepted ? <Icon name="check" size={15} /> : '1'}</span><div><b>Permissions</b><small>Review processing choices</small></div></article><i/><article className={preflight.ready ? 'is-done' : !requiredConsentsAccepted ? '' : 'is-current'}><span>{preflight.ready ? <Icon name="check" size={15} /> : '2'}</span><div><b>Device check</b><small>Camera, mic, connection</small></div></article><i/><article className={canEnter ? 'is-current' : ''}><span>3</span><div><b>Waiting room</b><small>Join when you’re ready</small></div></article></section>

    <section className="candidate-setup-grid">
      <article className="surface-card consent-card"><div className="surface-header"><div><span className="section-kicker">STEP 1 · INFORMED CHOICE</span><h2>How this interview is processed</h2></div><span className={requiredConsentsAccepted ? 'status-chip status-mint' : 'status-chip status-amber'}>{requiredConsentsAccepted ? 'Required choices complete' : 'Review required'}</span></div><p className="candidate-card-intro">Recording and live transcription are configured as required for this interview. AI assistance and integrity review are optional choices that you may decline.</p><div className="consent-list">{consentItems.map((item) => <label key={item.id} className={`consent-item ${consent[item.id] ? 'is-checked' : ''}`}><input type="checkbox" checked={consent[item.id]} onChange={() => toggleConsent(item.id)} /><span className="custom-checkbox"><Icon name="check" size={13} /></span><span><b>{item.label} {!item.required && <em className="optional-tag">Optional</em>}</b><small>{item.detail}</small></span></label>)}</div><div className="consent-footer"><span><Icon name="shield" size={15} /> Your choices are recorded with a time-stamped audit trail.</span><button className="text-button" onClick={() => onToast('The candidate privacy notice would open in a separate accessible document.')}>Read privacy notice <Icon name="external" size={14} /></button></div><button className="button button-primary full" disabled={!requiredConsentsAccepted || saving} onClick={saveConsent}><Icon name="check" size={16} /> {saving ? 'Saving choices…' : submitted ? 'Consent choices saved' : 'Save processing choices'}</button></article>

      <article className="surface-card preflight-card"><div className="surface-header"><div><span className="section-kicker">STEP 2 · PRIVATE PREFLIGHT</span><h2>Check your setup</h2></div><button className="button button-secondary compact-button" onClick={preflight.isTesting ? preflight.stopTest : preflight.startTest}><Icon name={preflight.isTesting ? 'pause' : 'play'} size={15} /> {preflight.isTesting ? 'Stop test' : 'Start device test'}</button></div><p className="candidate-card-intro">The check requests access only after you press the button. This preview is local to your browser and is not recorded.</p><div className="preflight-preview"><video ref={preflight.videoRef} autoPlay muted playsInline aria-label="Private local camera preview"/><div className="preflight-video-placeholder"><Icon name="video" size={25} /><span>{preflight.isTesting ? 'Private camera preview' : 'Your private camera preview appears here'}</span></div><div className="audio-meter"><Icon name="mic" size={14} /><i><b style={{ width: `${Math.max(4, preflight.audioLevel)}%` }} /></i><span>{preflight.isTesting ? 'Microphone input' : 'Awaiting input'}</span></div></div><div className="preflight-device-list"><DeviceRow icon="video" label="Camera" state={preflight.devices.camera} detail={preflight.devices.camera === 'ready' ? 'Video input is available.' : 'No recording is made during this check.'}/><DeviceRow icon="mic" label="Microphone" state={preflight.devices.microphone} detail={preflight.devices.microphone === 'ready' ? 'Audio input is available.' : 'Allow access to test your microphone.'}/><DeviceRow icon="wifi" label="Connection" state={preflight.devices.network} detail={preflight.devices.detail}/></div><div className="preflight-footer"><span><Icon name="lock" size={15} /> Media permissions remain under your browser’s control.</span><button className="text-button" onClick={() => onToast('Accessibility preferences are available through the candidate support link.')}>Need an accommodation? <Icon name="arrowUpRight" size={14} /></button></div></article>
    </section>

    <section className="candidate-ready-card surface-card"><div><span className="ready-check"><Icon name={canEnter ? 'check' : 'clock'} size={19} /></span><span><span className="section-kicker">STEP 3 · WAITING ROOM</span><h2>{canEnter ? 'You are ready to enter.' : 'Finish the setup when you are ready.'}</h2><p>{canEnter ? 'Your private setup is complete. The hiring panel is notified only when you enter the secure waiting room.' : 'Review processing choices, save them, and run a device test. Encrypted non-sensitive setup state is retained for up to 12 hours on this device.'}</p></span></div><div className="candidate-ready-actions"><span className={savedLocally ? 'saved-draft-indicator' : 'saved-draft-indicator muted'}><Icon name={savedLocally ? 'lock' : 'alert'} size={14} /> {savedLocally ? 'Encrypted local draft saved' : 'Local saving unavailable'}</span><button className="button button-primary" disabled={!canEnter} onClick={() => { clearEncryptedDraft(draftScope); onToast('Waiting room entered. Your panel will admit you when the interview starts.'); }}><Icon name="video" size={17} /> Enter waiting room</button></div></section>
  </main>;
}
