import { Icon } from './Icon.jsx';
import { metrics, upcomingInterviews, reliabilityServices } from '../data/platformData.js';

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

export function Dashboard({ onNavigate, onToast }) {
  return (
    <main className="page dashboard-page">
      <section className="welcome-card">
        <div className="welcome-content">
          <span className="pill pill-on-dark"><span className="pulse-dot" /> LIVE OPERATIONS</span>
          <h2>Good morning, Maya.<br /><em>Run interviews with more signal.</em></h2>
          <p>Four conversations are planned for today. Your next interview begins at 09:30 with Alex Morgan.</p>
          <div className="welcome-actions">
            <button className="button button-light" onClick={() => onNavigate('studio')}><Icon name="video" size={18} /> Open live studio</button>
            <button className="button button-ghost-on-dark" onClick={() => onNavigate('interviews')}>View today <Icon name="arrowUpRight" size={16} /></button>
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
        {metrics.map((metric) => <MetricCard metric={metric} key={metric.label} />)}
      </section>

      <section className="dashboard-grid">
        <article className="surface-card schedule-card">
          <div className="surface-header">
            <div><span className="section-kicker">TODAY · THURSDAY, 20 AUG</span><h2>Your interview run</h2></div>
            <button className="text-button" onClick={() => onNavigate('interviews')}>View calendar <Icon name="arrowUpRight" size={15} /></button>
          </div>
          <div className="schedule-list">
            {upcomingInterviews.map((interview, index) => (
              <button className="schedule-item" key={interview.id} onClick={() => index === 0 ? onNavigate('studio') : onToast(`${interview.candidate}'s workspace is ready to review.`)}>
                <time><strong>{interview.time}</strong><span>{interview.endTime}</span></time>
                <span className={`schedule-line line-${interview.tone}`}><i /></span>
                <span className={`person-avatar person-${interview.tone}`}>{interview.avatar}</span>
                <span className="schedule-detail"><strong>{interview.candidate}</strong><span>{interview.role} · {interview.stage}</span></span>
                <AvatarStack people={interview.interviewers} />
                <span className={`status-chip status-${interview.tone}`}>{index === 0 && <i className="tiny-live-dot" />}{interview.status}</span>
                <Icon name="chevronRight" size={18} className="schedule-arrow" />
              </button>
            ))}
          </div>
        </article>

        <div className="side-column">
          <article className="surface-card insight-card">
            <div className="surface-header compact"><div><span className="section-kicker">AI BRIEFING</span><h2>Before Alex joins</h2></div><button className="icon-button tiny" onClick={() => onNavigate('intelligence')} aria-label="Open AI intelligence"><Icon name="arrowUpRight" size={17} /></button></div>
            <div className="briefing-profile"><span className="briefing-avatar">AM</span><div><strong>Alex Morgan</strong><p>Senior Frontend Engineer</p></div><span className="fit-pill"><Icon name="sparkles" size={14} /> 89% role fit</span></div>
            <div className="briefing-points">
              <p><Icon name="target" size={16} /><span><b>Probe for:</b> collaboration at scale and accessibility systems.</span></p>
              <p><Icon name="file" size={16} /><span><b>Evidence:</b> led a design-system migration for 42 product teams.</span></p>
              <p><Icon name="clock" size={16} /><span><b>Plan:</b> 45 minutes · 4 weighted competencies.</span></p>
            </div>
            <button className="button button-secondary full" onClick={() => onNavigate('studio')}><Icon name="sparkles" size={17} /> Review interview plan</button>
          </article>

          <article className="surface-card health-card">
            <div className="surface-header compact"><div><span className="section-kicker">PLATFORM HEALTH</span><h2>All systems watch</h2></div><button className="text-button" onClick={() => onNavigate('operations')}>Details</button></div>
            <div className="health-list">
              {reliabilityServices.map((service) => <div className="health-row" key={service.name}><span className={`health-status ${service.tone}`} /><span><b>{service.name}</b><small>{service.region}</small></span><strong>{service.latency}</strong></div>)}
            </div>
          </article>
        </div>
      </section>
    </main>
  );
}
