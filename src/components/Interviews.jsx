import { useMemo, useState } from 'react';
import { Icon } from './Icon.jsx';
import { upcomingInterviews, candidateTasks } from '../data/platformData.js';

const days = [
  { day: 'MON', date: '17' }, { day: 'TUE', date: '18' }, { day: 'WED', date: '19' },
  { day: 'THU', date: '20', active: true }, { day: 'FRI', date: '21' }, { day: 'SAT', date: '22' }, { day: 'SUN', date: '23' },
];

export function Interviews({ onNavigate, onToast }) {
  const [filter, setFilter] = useState('All');
  const [selectedId, setSelectedId] = useState('int-2048');
  const selected = upcomingInterviews.find((interview) => interview.id === selectedId) || upcomingInterviews[0];
  const filtered = useMemo(() => filter === 'All' ? upcomingInterviews : upcomingInterviews.filter((interview) => interview.status.includes(filter)), [filter]);

  return (
    <main className="page interviews-page">
      <section className="planning-toolbar surface-card">
        <div className="date-jump"><button className="icon-button tiny" aria-label="Previous week"><Icon name="arrowLeft" size={17} /></button><strong>August 2026</strong><button className="icon-button tiny" aria-label="Next week"><Icon name="arrowUpRight" size={17} /></button></div>
        <div className="week-strip" role="tablist" aria-label="Select interview day">
          {days.map((day) => <button key={day.date} className={`day-pill ${day.active ? 'is-selected' : ''}`} role="tab" aria-selected={day.active}><span>{day.day}</span><b>{day.date}</b></button>)}
        </div>
        <button className="button button-primary" onClick={() => onToast('Interview composer opened — choose a role, panel, and time.') }><Icon name="plus" size={18} /> Schedule interview</button>
      </section>

      <section className="interview-layout">
        <article className="surface-card interview-list-card">
          <div className="surface-header">
            <div><span className="section-kicker">4 INTERVIEWS SCHEDULED</span><h2>Thursday’s run</h2></div>
            <button className="icon-button tiny" aria-label="Filter interviews"><Icon name="filter" size={17} /></button>
          </div>
          <div className="filter-chips" aria-label="Interview filters">
            {['All', 'Confirmed', 'Pending', 'Live'].map((item) => <button key={item} className={`filter-chip ${filter === item ? 'is-active' : ''}`} onClick={() => setFilter(item)}>{item}</button>)}
          </div>
          <div className="interview-row-list">
            {filtered.map((interview, index) => (
              <button key={interview.id} className={`interview-row ${selectedId === interview.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(interview.id)}>
                <time><strong>{interview.time}</strong><small>{interview.endTime}</small></time>
                <span className={`person-avatar person-${interview.tone}`}>{interview.avatar}</span>
                <span className="interview-row-copy"><strong>{interview.candidate}</strong><span>{interview.role}</span><small>{interview.stage}</small></span>
                {index === 0 ? <span className="status-chip status-violet"><i className="tiny-live-dot" /> Live soon</span> : <span className={`status-chip status-${interview.tone}`}>{interview.status}</span>}
                <Icon name="chevronRight" size={18} />
              </button>
            ))}
          </div>
        </article>

        <aside className="surface-card interview-detail-card">
          <div className="detail-card-head">
            <span className={`large-person-avatar person-${selected.tone}`}>{selected.avatar}</span>
            <button className="icon-button tiny" aria-label="More interview actions"><Icon name="more" size={18} /></button>
          </div>
          <h2>{selected.candidate}</h2>
          <p className="detail-role">{selected.role}</p>
          <div className="detail-meta"><span><Icon name="calendar" size={16} /> Today · {selected.time}–{selected.endTime}</span><span><Icon name="users" size={16} /> {selected.interviewers.length} panelists</span><span><Icon name="target" size={16} /> {selected.stage}</span></div>
          <div className="panelist-row"><span className="section-kicker">INTERVIEW PANEL</span><div className="panelist-avatars">{selected.interviewers.map((person, index) => <span key={`${person}-${index}`}>{person}</span>)}<button aria-label="Add interviewer"><Icon name="plus" size={14} /></button></div></div>
          <div className="candidate-readiness">
            <div><span className="section-kicker">CANDIDATE READINESS</span><strong>2 of 3 tasks complete</strong></div><div className="readiness-ring">67%</div>
            <ul>{candidateTasks.map((task) => <li key={task.title}><span className={`task-check ${task.complete ? 'done' : ''}`}><Icon name={task.complete ? 'check' : 'clock'} size={13} /></span><span><b>{task.title}</b><small>{task.note}</small></span></li>)}</ul>
          </div>
          <div className="detail-actions">
            <button className="button button-primary full" onClick={() => selected.id === 'int-2048' ? onNavigate('studio') : onToast('A secure interview room has been prepared.')}><Icon name="video" size={18} /> {selected.id === 'int-2048' ? 'Enter live studio' : 'Open room'}</button>
            <button className="button button-secondary full" onClick={() => onToast('A secure candidate link has been copied.') }><Icon name="copy" size={17} /> Copy candidate link</button>
          </div>
        </aside>
      </section>
    </main>
  );
}
