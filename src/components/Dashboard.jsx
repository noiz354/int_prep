import { useEffect, useState } from 'react';
import { Icon } from './Icon.jsx';
import { metrics, upcomingInterviews } from '../data/platformData.js';
import { isRemoteApiEnabled } from '../lib/session.js';
import { platformApi } from '../lib/platformApi.js';
import { presentInterview } from '../lib/interviewView.js';

function AvatarStack({ people }) {
  return <div className="avatar-stack" aria-label={`${people.length} interviewers assigned`}>
    {people.map((initials, index) => <span key={`${initials}-${index}`} className={`avatar-stack-item a-${index}`}>{initials}</span>)}
  </div>;
}

function MetricCard({ metric }) {
  return (
    <article className={`metric-card metric-${metric.tone}`}>
      <div className="metric-topline"><span>{metric.label}</span><Icon name="arrowUpRight" size={16} /></div>
      <strong>{metric.value}</strong>
      <p><b>{metric.trend}</b> {metric.note}</p>
      <div className="metric-spark" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></div>
    </article>
  );
}

export function Dashboard({ onNavigate, onToast, principal, refreshTick = 0, onCreate }) {
  const [ownInterviews, setOwnInterviews] = useState(null);
  const [opsHealth, setOpsHealth] = useState(null);
  useEffect(() => {
    if (!isRemoteApiEnabled()) return;
    platformApi.getInterviews().then((list) => setOwnInterviews(Array.isArray(list) ? list.map(presentInterview) : [])).catch(() => setOwnInterviews([]));
    platformApi.getOpsHealth().then(setOpsHealth).catch(() => setOpsHealth(null));
  }, [refreshTick]);
  const apiMode = isRemoteApiEnabled();
  const greetingName = principal?.name || 'there';
  const schedule = apiMode ? (ownInterviews || []) : upcomingInterviews;
  const liveMetrics = apiMode ? [
    { label: 'Interviews in your tenant', value: String(schedule.length), trend: 'live', tone: 'violet', note: 'not a seeded weekly count' },
    { label: 'Drafts', value: String(schedule.filter((item) => item.status === 'draft').length), trend: 'live', tone: 'amber', note: 'awaiting schedule' },
    { label: 'Scheduled / live', value: String(schedule.filter((item) => ['scheduled', 'live', 'checked_in'].includes(item.status)).length), trend: 'live', tone: 'mint', note: 'from the durable store' },
    { label: 'Join success rate', value: '—', trend: 'n/a', tone: 'sky', note: 'needs real SFU (U3)' },
  ] : metrics;
  const next = schedule[0];
  return (
    <main className="page dashboard-page">
      <section className="welcome-card">
        <div className="welcome-content">
          <span className="pill pill-on-dark"><span className="pulse-dot" /> {apiMode ? 'YOUR WORKSPACE' : 'LIVE OPERATIONS'}</span>
          <h2>Hello, {greetingName}.<br /><em>{apiMode ? 'This list is yours — not a seeded Maya day.' : 'Run interviews with more signal.'}</em></h2>
          <p>{apiMode ? (ownInterviews === null ? 'Loading your interviews…' : ownInterviews.length ? `${ownInterviews.length} interview${ownInterviews.length === 1 ? '' : 's'} in your tenant.` : 'No interviews yet. Create one — it will survive API restart.') : 'Four conversations are planned for today. Your next interview begins at 09:30 with Alex Morgan.'}</p>
          <div className="welcome-actions">
            <button className="button button-light" onClick={() => onCreate?.() || onNavigate('interviews')}><Icon name="plus" size={18} /> Schedule interview</button>
            <button className="button button-ghost-on-dark" onClick={() => onNavigate('interviews')}>View calendar <Icon name="arrowUpRight" size={16} /></button>
          </div>
        </div>
        <div className="welcome-visual" aria-hidden="true">
          <div className="orb orb-one" /><div className="orb orb-two" /><div className="orb orb-three" />
          <div className="signal-card signal-card-one"><span className="signal-icon"><Icon name="sparkles" size={17} /></span><div><small>Copilot ready</small><b>3 focused prompts</b></div></div>
          <div className="signal-card signal-card-two"><span className="signal-check"><Icon name="check" size={15} /></span><div><small>Room health</small><b>Excellent · 34 ms</b></div></div>
          <div className="portrait-shape"><span>AM</span><i /></div>
        </div>
      </section>

      <section className="metrics-grid" aria-label="Interview performance metrics">
        {liveMetrics.map((metric) => <MetricCard metric={metric} key={metric.label} />)}
      </section>

      <section className="dashboard-grid">
        <article className="surface-card schedule-card">
          <div className="surface-header">
            <div><span className="section-kicker">TODAY · THURSDAY, 20 AUG</span><h2>Your interview run</h2></div>
            <button className="text-button" onClick={() => onNavigate('interviews')}>View calendar <Icon name="arrowUpRight" size={15} /></button>
          </div>
          <div className="schedule-list">
            {schedule.length === 0 && <p className="empty-schedule">{apiMode ? 'Empty on purpose. Create an interview to persist it.' : 'No interviews.'}</p>}
            {schedule.map((interview, index) => {
              const candidate = interview.candidate || interview.candidateName;
              const time = interview.time || (interview.scheduledAt ? String(interview.scheduledAt).slice(11, 16) : '--:--');
              return (
              <button className="schedule-item" key={interview.id} onClick={() => index === 0 ? onNavigate('studio') : onToast(`${candidate}'s workspace is ready to review.`)}>
                <time><strong>{time}</strong><span>{interview.endTime || interview.status}</span></time>
                <span className={`schedule-line line-${interview.tone || 'mint'}`}><i /></span>
                <span className={`person-avatar person-${interview.tone || 'mint'}`}>{interview.avatar || (candidate || '?').slice(0, 2).toUpperCase()}</span>
                <span className="schedule-detail"><strong>{candidate}</strong><span>{interview.role} · {interview.stage}</span></span>
                <AvatarStack people={interview.interviewers || ['You']} />
                <span className={`status-chip status-${interview.tone || 'mint'}`}>{index === 0 && <i className="tiny-live-dot" />}{interview.status}</span>
                <Icon name="chevronRight" size={18} className="schedule-arrow" />
              </button>
            ); })}
          </div>
        </article>

        <div className="side-column">
          <article className="surface-card insight-card">
            <div className="surface-header compact"><div><span className="section-kicker">NEXT SESSION</span><h2>{next ? next.candidate : 'Nothing queued'}</h2></div><button className="icon-button tiny" onClick={() => onNavigate('intelligence')} aria-label="Open AI intelligence"><Icon name="arrowUpRight" size={17} /></button></div>
            {next ? (
              <>
                <div className="briefing-profile"><span className="briefing-avatar">{next.avatar}</span><div><strong>{next.candidate}</strong><p>{next.role}</p></div></div>
                <div className="briefing-points">
                  <p><Icon name="target" size={16} /><span><b>Stage:</b> {next.stage}</span></p>
                  <p><Icon name="clock" size={16} /><span><b>When:</b> {next.time} · {next.status}</span></p>
                  <p><Icon name="file" size={16} /><span><b>AI briefing</b> stays assistive and is not a hiring prediction.</span></p>
                </div>
                <button className="button button-secondary full" onClick={() => onNavigate('studio')}><Icon name="sparkles" size={17} /> Open room</button>
              </>
            ) : (
              <p className="empty-schedule">Create an interview to see it here. Seeded “Alex Morgan” copy is not used when the API is on.</p>
            )}
          </article>

          <article className="surface-card health-card">
            <div className="surface-header compact"><div><span className="section-kicker">PLATFORM HEALTH</span><h2>{apiMode ? 'Live probes' : 'Seeded watch'}</h2></div><button className="text-button" onClick={() => onNavigate('operations')}>Details</button></div>
            <div className="health-list">
              {(apiMode ? (opsHealth?.providers || []).slice(0, 6) : []).map((service) => (
                <div className="health-row" key={service.id}>
                  <span className={`health-status ${service.ok ? 'mint' : 'amber'}`} />
                  <span><b>{service.label}</b><small>{service.state}</small></span>
                  <strong>{service.ok ? 'up' : '—'}</strong>
                </div>
              ))}
              {apiMode && !opsHealth && <p className="empty-schedule">Loading provider health…</p>}
              {!apiMode && <p className="empty-schedule">Turn on the API path to see probed health instead of seeded latency.</p>}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
