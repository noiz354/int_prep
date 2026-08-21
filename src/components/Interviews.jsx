import { useEffect, useMemo, useState } from 'react';
import { Icon } from './Icon.jsx';
import { candidateTasks } from '../data/platformData.js';
import { isRemoteApiEnabled } from '../lib/session.js';
import { platformApi } from '../lib/platformApi.js';
import { presentInterview } from '../lib/interviewView.js';

const days = [
  { day: 'MON', date: '17' }, { day: 'TUE', date: '18' }, { day: 'WED', date: '19' },
  { day: 'THU', date: '20', active: true }, { day: 'FRI', date: '21' }, { day: 'SAT', date: '22' }, { day: 'SUN', date: '23' },
];

export function Interviews({ onNavigate, onToast, onCreate, refreshTick = 0 }) {
  const apiMode = isRemoteApiEnabled();
  const [filter, setFilter] = useState('All');
  const [selectedId, setSelectedId] = useState('');
  const [records, setRecords] = useState(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [hits, setHits] = useState([]);
  const [busy, setBusy] = useState('');

  const load = async () => {
    setError('');
    try {
      const list = await platformApi.getInterviews();
      setRecords(Array.isArray(list) ? list.map(presentInterview) : []);
    } catch (reason) {
      setError(reason.message);
      setRecords([]);
    }
  };

  useEffect(() => { load(); }, [refreshTick]);

  const interviews = records || [];
  const selected = interviews.find((interview) => interview.id === selectedId) || interviews[0];
  const filtered = useMemo(() => {
    if (filter === 'All') return interviews;
    return interviews.filter((interview) => String(interview.status).toLowerCase().includes(filter.toLowerCase()));
  }, [filter, interviews]);

  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  const runSearch = async (event) => {
    event.preventDefault();
    if (!search.trim()) return;
    try {
      const result = await platformApi.search(search.trim());
      setHits(result.results || []);
    } catch (reason) {
      onToast(reason.message);
    }
  };

  const invite = async () => {
    if (!selected) return;
    setBusy('invite');
    try {
      const invitation = await platformApi.createInvitation({
        interviewId: selected.id,
        recipient: 'candidate@example.test',
        channel: 'email',
        locale: 'en',
      });
      onToast(`Invitation queued (${invitation.id}). Email delivery is a labelled local adapter — not Postal/SendGrid.`);
    } catch (reason) {
      onToast(reason.message);
    } finally {
      setBusy('');
    }
  };

  const remind = async () => {
    if (!selected) return;
    setBusy('notify');
    try {
      const job = await platformApi.notify({
        recipient: 'panel@example.test',
        channel: 'email',
        template: 'interview-reminder',
      });
      onToast(`Reminder job ${job.id} · ${job.status}. No SMS/email provider is connected.`);
    } catch (reason) {
      onToast(reason.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <main className="page interviews-page">
      <section className="planning-toolbar surface-card">
        <div className="date-jump"><button className="icon-button tiny" aria-label="Previous week"><Icon name="arrowLeft" size={17} /></button><strong>August 2026</strong><button className="icon-button tiny" aria-label="Next week"><Icon name="arrowUpRight" size={17} /></button></div>
        <div className="week-strip" role="tablist" aria-label="Select interview day">
          {days.map((day) => <button key={day.date} className={`day-pill ${day.active ? 'is-selected' : ''}`} role="tab" aria-selected={day.active}><span>{day.day}</span><b>{day.date}</b></button>)}
        </div>
        <button className="button button-primary" onClick={() => onCreate?.()}><Icon name="plus" size={18} /> Schedule interview</button>
      </section>

      {apiMode && (
        <form className="interview-search surface-card" onSubmit={runSearch}>
          <Icon name="search" size={16} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search your interviews (tenant-scoped)" aria-label="Search interviews" />
          <button className="button button-secondary compact-button" type="submit">Search</button>
          {hits.length > 0 && <span>{hits.length} hit{hits.length === 1 ? '' : 's'}</span>}
        </form>
      )}

      <section className="interview-layout">
        <article className="surface-card interview-list-card">
          <div className="surface-header">
            <div>
              <span className="section-kicker">{apiMode ? 'YOUR TENANT' : 'DEMO SEED'}</span>
              <h2>{records === null ? 'Loading…' : `${filtered.length} interview${filtered.length === 1 ? '' : 's'}`}</h2>
            </div>
          </div>
          {error && <p className="empty-schedule" role="alert">{error}</p>}
          <div className="filter-chips" aria-label="Interview filters">
            {['All', 'draft', 'scheduled', 'live', 'completed'].map((item) => <button key={item} className={`filter-chip ${filter === item ? 'is-active' : ''}`} onClick={() => setFilter(item)}>{item}</button>)}
          </div>
          <div className="interview-row-list">
            {filtered.length === 0 && records !== null && <p className="empty-schedule">{apiMode ? 'No interviews yet. Schedule one — it persists after API restart.' : 'No interviews.'}</p>}
            {filtered.map((interview) => (
              <button key={interview.id} className={`interview-row ${selected?.id === interview.id ? 'is-selected' : ''}`} onClick={() => setSelectedId(interview.id)}>
                <time><strong>{interview.time}</strong><small>{interview.status}</small></time>
                <span className={`person-avatar person-${interview.tone}`}>{interview.avatar}</span>
                <span className="interview-row-copy"><strong>{interview.candidate}</strong><span>{interview.role}</span><small>{interview.stage}</small></span>
                <span className={`status-chip status-${interview.tone}`}>{interview.status}</span>
                <Icon name="chevronRight" size={18} />
              </button>
            ))}
          </div>
        </article>

        <aside className="surface-card interview-detail-card">
          {!selected && <p className="empty-schedule">Select or create an interview.</p>}
          {selected && (
            <>
              <div className="detail-card-head">
                <span className={`large-person-avatar person-${selected.tone}`}>{selected.avatar}</span>
              </div>
              <h2>{selected.candidate}</h2>
              <p className="detail-role">{selected.role}</p>
              <div className="detail-meta"><span><Icon name="calendar" size={16} /> {selected.time} · {selected.status}</span><span><Icon name="target" size={16} /> {selected.stage}</span><span><Icon name="layers" size={16} /> {selected.id}</span></div>
              <p className="microcopy">Calendar sync is a labelled adapter (Radicale/Google not wired). Invitations and reminders mutate the local control plane.</p>
              <div className="candidate-readiness">
                <div><span className="section-kicker">CANDIDATE READINESS</span><strong>Preparation is a separate product</strong></div>
                <ul>{candidateTasks.map((task) => <li key={task.title}><span className={`task-check ${task.complete ? 'done' : ''}`}><Icon name={task.complete ? 'check' : 'clock'} size={13} /></span><span><b>{task.title}</b><small>{task.note}</small></span></li>)}</ul>
              </div>
              <div className="detail-actions">
                <button className="button button-primary full" onClick={() => onNavigate('studio')}><Icon name="video" size={18} /> Open room</button>
                <button className="button button-secondary full" disabled={Boolean(busy)} onClick={invite}><Icon name="copy" size={17} /> {busy === 'invite' ? 'Queuing…' : 'Queue invitation'}</button>
                <button className="button button-secondary full" disabled={Boolean(busy)} onClick={remind}>{busy === 'notify' ? 'Queuing…' : 'Queue reminder'}</button>
              </div>
            </>
          )}
        </aside>
      </section>
    </main>
  );
}
