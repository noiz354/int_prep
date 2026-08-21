import { useMemo, useState } from 'react';
import { actionInbox, demoCoaches, demoJob, demoMaterials, demoOpportunities, demoProfile, demoStories } from './data/demo.js';
import { createApplicationReview, createReadinessPlan, requestCoachBooking, submitPractice } from './lib/readinessApi.js';

const navItems = [
  ['overview', 'Overview', '⌂'],
  ['role', 'Role intelligence', '⌘'],
  ['practice', 'Practice lab', '◌'],
  ['coaches', 'Coach network', '◎'],
  ['opportunities', 'Opportunities', '↗'],
  ['trust', 'Trust & data', '◈'],
];

const practiceModes = [
  ['behavioral', 'Behavioral', 'Tell a truthful story with ownership, outcome, and reflection.'],
  ['technical', 'Technical', 'Explain an approach, constraints, trade-offs, and validation.'],
  ['system_design', 'System design', 'Design for requirements, failure, scale, and measurable outcomes.'],
  ['portfolio', 'Portfolio', 'Walk through a candidate-owned project and role-relevant evidence.'],
  ['coding', 'Coding', 'Clarify requirements, narrate the approach, test, then discuss complexity.'],
];

function Badge({ children, tone = 'mint' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function ReadinessRing({ score }) {
  return <div className="readiness-ring" style={{ '--progress': `${score * 3.6}deg` }}><div><strong>{score}</strong><small>readiness</small></div></div>;
}

function SectionTitle({ eyebrow, title, action }) {
  return <div className="section-title"><div><span className="eyebrow">{eyebrow}</span><h2>{title}</h2></div>{action}</div>;
}

export function App() {
  const [active, setActive] = useState('overview');
  const [mode, setMode] = useState('hybrid');
  const [plan, setPlan] = useState(null);
  const [stories, setStories] = useState(demoStories);
  const [practiceMode, setPracticeMode] = useState('technical');
  const [practiceAnswer, setPracticeAnswer] = useState('I would begin by clarifying the product constraints, then separate the rendering path from the synchronization path so the experience remains responsive under unreliable network conditions.');
  const [practice, setPractice] = useState([]);
  const [selectedCoach, setSelectedCoach] = useState(null);
  const [booking, setBooking] = useState(null);
  const [opportunities, setOpportunities] = useState(demoOpportunities);
  const [consent, setConsent] = useState({ ai: true, recording: false, transcript: true, human: false, email: true, instagram: false });
  const [deviceReady, setDeviceReady] = useState(false);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState('');

  const readiness = useMemo(() => {
    const skill = Math.round(demoJob.competencies.reduce((sum, item) => sum + item.progress, 0) / demoJob.competencies.length);
    const evidence = Math.min(100, stories.length * 28);
    const practiceScore = practice.length ? Math.round(practice.reduce((sum, item) => sum + (item.feedback?.readinessSignal || 0), 0) / practice.length) : 48;
    const communication = practice.length ? Math.min(95, 55 + practice.length * 10) : 58;
    const session = deviceReady ? 100 : 40;
    const total = Math.round(skill * .25 + evidence * .20 + practiceScore * .20 + communication * .15 + session * .10 + 45 * .10);
    return { total, skill, evidence, practice: practiceScore, communication, session, label: total >= 80 ? 'Ready to apply or schedule assessment' : total >= 70 ? 'Schedule a mock and human review' : total >= 50 ? 'Practice priority areas first' : 'Build fundamentals first' };
  }, [deviceReady, practice, stories]);

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(window.__readyToast);
    window.__readyToast = window.setTimeout(() => setToast(''), 4500);
  };

  const buildPlan = async () => {
    setLoading('plan');
    try {
      const created = await createReadinessPlan({ jobDescriptionId: demoJob.id, coachingMode: mode, timeBudgetHours: 6, language: 'en', accessibilityPreferences: [] });
      setPlan(created);
      notify('Your candidate-owned readiness plan is ready. It stays separate from hiring evaluation data.');
    } catch (error) { notify(error.message); }
    finally { setLoading(''); }
  };

  const runPractice = async () => {
    setLoading('practice');
    try {
      const session = await submitPractice({ planId: plan?.id || 'cr-plan-demo', sessionContext: 'preparation', consentForAi: consent.ai, practiceMode, competency: demoJob.competencies[0].name, answer: practiceAnswer });
      setPractice((items) => [session, ...items]);
      notify('Practice feedback created. It is guidance only, not a hiring prediction.');
    } catch (error) { notify(error.message); }
    finally { setLoading(''); }
  };

  const bookCoach = async (coach) => {
    setLoading(`coach-${coach.id}`);
    try {
      const next = await requestCoachBooking({ planId: plan?.id || 'cr-plan-demo', coachId: coach.id, slot: coach.availability, candidateApprovedAt: new Date().toISOString() });
      setSelectedCoach(coach.id);
      setBooking(next);
      setConsent((current) => ({ ...current, human: true }));
      notify(`Preparation session requested with ${coach.name}. You control what is shared.`);
    } catch (error) { notify(error.message); }
    finally { setLoading(''); }
  };

  const requestApplication = async (opportunity) => {
    setLoading(`application-${opportunity.id}`);
    try {
      const application = await createApplicationReview({ opportunityId: opportunity.id, resumeVersion: 'Senior Frontend v3', candidateApprovedAt: new Date().toISOString() });
      setOpportunities((items) => items.map((item) => item.id === opportunity.id ? { ...item, status: application.status } : item));
      notify('Application saved for your review. No application was automatically submitted.');
    } catch (error) { notify(error.message); }
    finally { setLoading(''); }
  };

  const addStory = () => {
    const story = { id: `story-${Date.now()}`, title: 'Accessibility remediation', competency: 'Accessibility', summary: 'Improved keyboard navigation and semantic structure in a complex workflow.', evidence: 'Added tests and resolved issues discovered through user feedback.', score: 68 };
    setStories((items) => [story, ...items]);
    notify('A draft story was added to your private evidence library. Edit it with truthful details before sharing.');
  };

  const content = {
    overview: <Overview readiness={readiness} plan={plan} mode={mode} actions={actionInbox} setActive={setActive} deviceReady={deviceReady} setDeviceReady={setDeviceReady} notify={notify} />,
    role: <RoleIntelligence mode={mode} setMode={setMode} plan={plan} buildPlan={buildPlan} loading={loading} stories={stories} addStory={addStory} notify={notify} />,
    practice: <PracticeLab consent={consent} practiceMode={practiceMode} setPracticeMode={setPracticeMode} answer={practiceAnswer} setAnswer={setPracticeAnswer} runPractice={runPractice} loading={loading} practice={practice} />,
    coaches: <CoachNetwork mode={mode} selectedCoach={selectedCoach} booking={booking} bookCoach={bookCoach} loading={loading} />,
    opportunities: <OpportunityTracker opportunities={opportunities} readiness={readiness} requestApplication={requestApplication} loading={loading} notify={notify} />,
    trust: <TrustData consent={consent} setConsent={setConsent} deviceReady={deviceReady} notify={notify} />,
  };

  return <div className="ready-shell">
    <aside className="ready-sidebar" aria-label="Readiness navigation">
      <a className="ready-brand" href="#overview"><span>R</span><b>signalroom <em>ready</em></b></a>
      <div className="candidate-mini"><span>{demoProfile.initials}</span><div><b>{demoProfile.name}</b><small>{demoProfile.headline}</small></div></div>
      <nav>{navItems.map(([id, label, icon]) => <button key={id} className={active === id ? 'is-active' : ''} onClick={() => setActive(id)} aria-current={active === id ? 'page' : undefined}><span>{icon}</span>{label}</button>)}</nav>
      <div className="sidebar-bottom"><span className="boundary-dot"/> <p><b>Preparation only</b><small>Not connected to a live employer assessment.</small></p></div>
    </aside>
    <main className="ready-main">
      <header className="ready-topbar"><div><span className="eyebrow">SIGNALROOM READY / MICRO1 READINESS MODE</span><h1>{navItems.find((item) => item[0] === active)?.[1]}</h1></div><div className="topbar-status"><Badge tone="mint">Candidate owned</Badge><button onClick={() => notify('Your data controls, sources, and sharing choices are available in Trust & data.')}>Privacy</button><span>{demoProfile.initials}</span></div></header>
      <section className="assessment-boundary"><span>Practice environment</span><p>Use this space before an assessment. It cannot generate answers from a live Zara/Micro1 interview, reveal confidential questions, or bypass proctoring.</p><button onClick={() => setActive('trust')}>Review boundary</button></section>
      {content[active]}
    </main>
    {toast && <div className="ready-toast" role="status"><span>✓</span><p>{toast}</p><button onClick={() => setToast('')} aria-label="Dismiss notification">×</button></div>}
  </div>;
}

function Overview({ readiness, plan, mode, actions, setActive, deviceReady, setDeviceReady, notify }) {
  const breakdown = [
    ['JD & stack coverage', readiness.skill, 'Skill and concept evidence'],
    ['Candidate evidence', readiness.evidence, 'Stories, projects, and portfolio proof'],
    ['Practice performance', readiness.practice, 'Mock answers and feedback closure'],
    ['Communication clarity', readiness.communication, 'Structure, trade-offs, and reflection'],
    ['Session readiness', readiness.session, 'Laptop, environment, and accessibility setup'],
  ];
  return <section className="screen-grid overview-grid" id="overview">
    <article className="hero-card"><div><span className="eyebrow on-dark">MICRO1 READINESS MODE</span><h2>Build evidence.<br/><em>Practice honestly.</em></h2><p>Transform an authorized job description into a private readiness plan that helps you explain what you know, how you reason, and how you work.</p><div className="hero-actions"><button className="primary-light" onClick={() => setActive('role')}>Review role intelligence</button><button className="ghost-light" onClick={() => setActive('practice')}>Start practice →</button></div></div><ReadinessRing score={readiness.total}/></article>
    <article className="panel-card readiness-card"><SectionTitle eyebrow="READINESS THRESHOLD" title="Your preparation signal" action={<Badge tone={readiness.total >= 80 ? 'mint' : 'amber'}>{readiness.label}</Badge>}/><div className="readiness-summary"><ReadinessRing score={readiness.total}/><div><b>80 is a readiness threshold</b><p>It means you are prepared to apply or schedule an assessment—not that a job outcome is guaranteed.</p><small>{plan ? `Plan active · ${mode} support` : 'Create a plan to personalize milestones.'}</small></div></div><div className="breakdown-list">{breakdown.map(([label, score, detail]) => <article key={label}><div><b>{label}</b><small>{detail}</small></div><span><i><b style={{ width: `${score}%` }}/></i><strong>{score}</strong></span></article>)}</div></article>
    <article className="panel-card action-card"><SectionTitle eyebrow="NEXT BEST ACTIONS" title="Your private action inbox"/><div className="action-list">{actions.map((action) => <button key={action.id} onClick={() => { if (action.type === 'practice') setActive('practice'); else if (action.type === 'story') setActive('role'); else setActive('opportunities'); }}><span className={`action-icon ${action.priority}`}>{action.type === 'practice' ? '◌' : action.type === 'story' ? '✦' : '↗'}</span><span><b>{action.label}</b><small>{action.detail}</small></span><em>→</em></button>)}</div></article>
    <article className="panel-card device-card"><SectionTitle eyebrow="OWN LAPTOP CHECK" title="Practice your actual setup"/><p>Use the same environment you intend to use for the real assessment: stable connection, camera, microphone, lighting, quiet space, and accessibility preferences.</p><div className="device-checks"><span className={deviceReady ? 'done' : ''}>Camera</span><span className={deviceReady ? 'done' : ''}>Microphone</span><span className={deviceReady ? 'done' : ''}>Network</span><span className={deviceReady ? 'done' : ''}>Environment</span></div><button className="secondary full" onClick={() => { setDeviceReady(true); notify('Local setup rehearsal completed. Re-check before the real assessment.'); }}>{deviceReady ? 'Setup rehearsal completed' : 'Complete setup rehearsal'}</button></article>
  </section>;
}

function RoleIntelligence({ mode, setMode, plan, buildPlan, loading, stories, addStory, notify }) {
  return <section className="screen-grid role-grid">
    <article className="panel-card role-hero"><div className="role-icon">⌘</div><div><span className="eyebrow">AUTHORIZED ROLE INTELLIGENCE</span><h2>{demoJob.title}</h2><p>{demoJob.company} · {demoJob.level} · {demoJob.sourceLabel}</p></div><Badge>Public/approved research only</Badge></article>
    <article className="panel-card skills-card"><SectionTitle eyebrow="SKILL & STACK MAP" title="What this role needs"/><div className="skill-matrix">{demoJob.competencies.map((item) => <article key={item.id}><div><b>{item.name}</b><small>{item.focus}</small><em>{item.action}</em></div><span><i><b style={{ width: `${item.progress}%` }}/></i><strong>{item.progress}% evidence</strong></span></article>)}</div><div className="stack-tags">{demoJob.stack.map((stack) => <span key={stack}>{stack}</span>)}</div></article>
    <article className="panel-card plan-builder"><SectionTitle eyebrow="SUPPORT MODE" title="Build your readiness plan"/><div className="mode-grid">{[['ai','AI coach','Practice immediately with original, JD-grounded prompts.'],['human','Human coach','Get feedback from a verified specialist.'],['hybrid','Hybrid','Use AI first, then share only selected preparation context.']].map(([id,title,description]) => <button key={id} className={mode === id ? 'is-selected' : ''} onClick={() => setMode(id)}><span className="mode-circle"/><b>{title}</b><small>{description}</small></button>)}</div><button className="primary full" disabled={loading === 'plan'} onClick={buildPlan}>{loading === 'plan' ? 'Building plan…' : plan ? 'Refresh my readiness plan' : 'Build my readiness plan'}</button><p className="microcopy">Plans use candidate-provided evidence and approved sources. They never include hidden interview questions.</p></article>
    <article className="panel-card materials-card"><SectionTitle eyebrow="RESEARCH MATERIALS" title="Public, role-relevant sources"/><div className="material-list">{demoMaterials.map((item) => <article key={item.id}><span>↗</span><div><b>{item.title}</b><small>{item.type} · {item.relevance}</small><em>{item.source}</em></div><button onClick={() => notify(`${item.action} is queued in your private plan.`)}>{item.action}</button></article>)}</div></article>
    <article className="panel-card stories-card"><SectionTitle eyebrow="CANDIDATE EVIDENCE LIBRARY" title="Truthful stories beat memorized answers" action={<button className="text-button" onClick={addStory}>Add draft story</button>}/><div className="story-list">{stories.map((story) => <article key={story.id}><span>{story.score}</span><div><b>{story.title}</b><small>{story.competency} · {story.summary}</small><em>{story.evidence}</em></div></article>)}</div></article>
  </section>;
}

function PracticeLab({ consent, practiceMode, setPracticeMode, answer, setAnswer, runPractice, loading, practice }) {
  const last = practice[0];
  return <section className="screen-grid practice-grid">
    <article className="panel-card practice-header"><div><span className="eyebrow">PREPARATION-ONLY PRACTICE LAB</span><h2>Practice how you think aloud.</h2><p>Original role-relevant prompts. No live-assessment integration, prompt relay, or hidden answer assistance.</p></div><Badge tone="mint">Live-assessment lockout active</Badge></article>
    <article className="panel-card practice-modes"><SectionTitle eyebrow="SELECT MODE" title="What do you want to rehearse?"/><div className="practice-mode-list">{practiceModes.map(([id,title,description]) => <button key={id} className={practiceMode === id ? 'is-selected' : ''} onClick={() => setPracticeMode(id)}><span>{id === 'behavioral' ? '◉' : id === 'technical' ? '⌘' : id === 'coding' ? '</>' : '◌'}</span><div><b>{title}</b><small>{description}</small></div></button>)}</div></article>
    <article className="panel-card answer-card"><SectionTitle eyebrow="PROMPT" title={`Explain ${demoJob.competencies[0].name}`}/><blockquote>“How would you design a responsive collaboration experience when a user briefly loses connectivity? Explain your assumptions, trade-offs, and how you would validate the result.”</blockquote><label><span>Your private practice answer</span><textarea value={answer} onChange={(event) => setAnswer(event.target.value)} /></label><div className="answer-footer"><span>AI practice consent: <b>{consent.ai ? 'enabled' : 'disabled'}</b></span><button className="primary" disabled={loading === 'practice' || !consent.ai} onClick={runPractice}>{loading === 'practice' ? 'Reviewing…' : 'Get preparation feedback'}</button></div></article>
    <article className="panel-card feedback-card"><SectionTitle eyebrow="FEEDBACK" title="Evidence, not personality"/>{last ? <><div className="practice-score"><strong>{last.feedback.readinessSignal}</strong><span>practice signal<br/>not a hiring score</span></div><ul>{last.feedback.guidance.map((item) => <li key={item}>✓ {item}</li>)}</ul><p>Use: Context → Constraints → Approach → Trade-offs → Validation.</p></> : <div className="empty-state"><span>✦</span><p>Complete a mock answer to receive evidence-linked preparation feedback.</p></div>}</article>
    <article className="panel-card communication-card"><SectionTitle eyebrow="COMMUNICATION COACH" title="Make your reasoning easy to follow"/><div className="framework"><span>1</span><div><b>Context</b><small>Define the problem and assumptions.</small></div><span>2</span><div><b>Constraints</b><small>Name scale, security, accessibility, or reliability limits.</small></div><span>3</span><div><b>Approach</b><small>Explain the decision, trade-off, and validation plan.</small></div></div></article>
  </section>;
}

function CoachNetwork({ mode, selectedCoach, booking, bookCoach, loading }) {
  return <section className="screen-grid coach-grid">
    <article className="panel-card coach-hero"><div><span className="eyebrow">VERIFIED HUMAN COACHING</span><h2>Use human judgment where it matters.</h2><p>Coach matches consider domain expertise, language, time zone, availability, verification, and candidate choice—not employer evaluation data.</p></div><Badge tone="mint">Candidate-controlled handoff</Badge></article>
    <article className="panel-card match-card"><SectionTitle eyebrow="WHY THESE COACHES" title="Transparent matching"/><div className="match-reasons"><span>✓ Stack and role specialty</span><span>✓ Language and time zone</span><span>✓ Verified status and conflict check</span><span>✓ Candidate decides whether to book or share context</span></div><p className="microcopy">Current support mode: <b>{mode}</b>. Hybrid mode lets you share selected goals, milestones, evidence, and accommodations only after approval.</p></article>
    <article className="panel-card coach-list-card"><SectionTitle eyebrow="MATCHED COACHES" title="Choose your support"/>{demoCoaches.map((coach) => <article className={`coach-row ${selectedCoach === coach.id ? 'is-selected' : ''}`} key={coach.id}><span className="coach-avatar">{coach.name.split(' ').map((name) => name[0]).join('')}</span><div><b>{coach.name} <em>{coach.verified ? 'Verified' : 'Pending'}</em></b><small>{coach.title}</small><p>{coach.specialties.join(' · ')} · {coach.languages.join(', ')} · {coach.timeZone}</p></div><span className="coach-match">{coach.match}%<small>match</small></span><button className="secondary" disabled={Boolean(loading)} onClick={() => bookCoach(coach)}>{loading === `coach-${coach.id}` ? 'Requesting…' : 'Request session'}</button></article>)}</article>
    <article className="panel-card handoff-card"><SectionTitle eyebrow="AI → HUMAN HANDOFF" title="You decide what gets shared"/><div className="handoff-fields"><span className="is-shared">Goals & target date</span><span className="is-shared">Milestones</span><span>Practice evidence</span><span>Accessibility preferences</span><span>Story library</span></div><p>Employer interview scores, confidential questions, hiring feedback, and unrelated private data are excluded by default.</p>{booking ? <div className="booking-confirmed">✓ Preparation session requested · {booking.slot}</div> : <button className="secondary full" disabled>Choose a coach to enable handoff</button>}</article>
  </section>;
}

function OpportunityTracker({ opportunities, readiness, requestApplication, loading, notify }) {
  return <section className="screen-grid opportunities-grid">
    <article className="panel-card opportunity-hero"><div><span className="eyebrow">CANDIDATE OPPORTUNITY OS</span><h2>Track every opportunity.<br/><em>Apply with control.</em></h2><p>Recommendations use your skills, evidence, preferences, readiness, and verified source quality. Every application remains candidate-approved.</p></div><div className="opportunity-stats"><strong>{opportunities.length}</strong><span>tracked roles</span><strong>{readiness.total}</strong><span>readiness</span></div></article>
    <article className="panel-card campaign-card"><SectionTitle eyebrow="SAFE APPLICATION CAMPAIGN" title="Review before send"/><div className="campaign-steps"><span className="done">1 <b>Set role criteria</b></span><span className="done">2 <b>Check readiness</b></span><span className="current">3 <b>Review every submission</b></span></div><div className="channel-grid"><span className="active">Email digest<br/><small>Opt-in</small></span><span className="active">In-app inbox<br/><small>Default</small></span><span>Calendar<br/><small>Connect later</small></span><span>Instagram Business<br/><small>Opt-in only</small></span></div><p className="microcopy">Automatic submission is disabled until an official partner API, explicit campaign consent, rate cap, receipt capture, duplicate prevention, and pause control are configured.</p></article>
    <article className="panel-card opportunities-list"><SectionTitle eyebrow="RECOMMENDED OPPORTUNITIES" title="Why each role fits"/>{opportunities.map((opportunity) => <article key={opportunity.id}><span className="opportunity-score">{opportunity.match}%</span><div><b>{opportunity.title}</b><small>{opportunity.company} · {opportunity.source}</small><p>{opportunity.readiness}</p><em>{opportunity.verified ? 'Verified source' : 'Source review needed'} · {opportunity.deadline}</em></div><Badge tone={opportunity.status === 'review_required' ? 'amber' : 'mint'}>{opportunity.status.replaceAll('_', ' ')}</Badge><button className="secondary" disabled={Boolean(loading)} onClick={() => requestApplication(opportunity)}>{loading === `application-${opportunity.id}` ? 'Saving…' : opportunity.status === 'review_required' ? 'Review application' : 'Add to review'}</button></article>)}</article>
    <article className="panel-card tracker-card"><SectionTitle eyebrow="APPLICATION TIMELINE" title="No more black box"/><div className="timeline"><span className="done">Profile and evidence ready</span><span className="done">Role saved from verified source</span><span className="current">Candidate review required</span><span>Submission receipt captured</span><span>Employer/recruiter update</span></div><button className="text-button" onClick={() => notify('A follow-up assistant would draft a respectful message for your review; it never impersonates you.')}>Draft a respectful follow-up →</button></article>
  </section>;
}

function TrustData({ consent, setConsent, deviceReady, notify }) {
  const toggle = (key) => setConsent((current) => ({ ...current, [key]: !current[key] }));
  return <section className="screen-grid trust-grid">
    <article className="panel-card trust-hero"><div><span className="eyebrow">CANDIDATE CONTROL CENTER</span><h2>Your data. Your preparation. Your decision.</h2><p>SignalRoom Ready stores preparation work separately from hiring evaluation. It cannot become an invisible assistant in a real assessment.</p></div><Badge tone="mint">Preparation boundary active</Badge></article>
    <article className="panel-card consent-card"><SectionTitle eyebrow="CONSENT PREFERENCES" title="Choose what is processed"/>{[['ai','AI practice feedback','Role-grounded mock questions and feedback.'],['recording','Practice recording','Optional recording of your own preparation sessions.'],['transcript','Practice transcript','Captions and searchable preparation transcript.'],['human','Human coach handoff','Share selected preparation context with a verified coach.'],['email','Email opportunity updates','Candidate-selected role alerts and application receipts.'],['instagram','Instagram Business updates','Only opt-in business messaging; never unsolicited job blasts.']].map(([id,label,detail]) => <label key={id}><span><b>{label}</b><small>{detail}</small></span><button className={`toggle ${consent[id] ? 'is-on' : ''}`} onClick={() => toggle(id)} aria-pressed={consent[id]}><i /></button></label>)}</article>
    <article className="panel-card boundary-card"><SectionTitle eyebrow="REAL-ASSESSMENT LOCKOUT" title="Practice stops before the real interview"/><div className="boundary-list"><span>✓ No live prompt relay</span><span>✓ No hidden overlays or proctoring bypass</span><span>✓ No confidential question or scorecard access</span><span>✓ No automatic hiring prediction</span><span>✓ No employer-data import without authorization</span></div><button className="secondary full" onClick={() => notify(deviceReady ? 'Your setup rehearsal is complete. Close the practice lab before entering a real assessment.' : 'Complete the laptop setup rehearsal from Overview before your real assessment.')}>{deviceReady ? 'View assessment-day checklist' : 'Go to setup rehearsal'}</button></article>
    <article className="panel-card data-card"><SectionTitle eyebrow="DATA RIGHTS" title="Export, delete, and control sharing"/><p>Candidate-owned readiness plans, stories, practice feedback, opportunities, and handoffs can be exported or deleted according to policy. Hiring evaluation artifacts are a separate data domain.</p><div className="data-actions"><button className="secondary" onClick={() => notify('A candidate-owned readiness export has been queued for review.')}>Request data export</button><button className="secondary danger" onClick={() => notify('A deletion request would start a confirmed, auditable workflow.')}>Request deletion</button></div></article>
  </section>;
}
