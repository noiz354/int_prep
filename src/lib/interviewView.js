const tones = {
  live: 'violet',
  scheduled: 'mint',
  draft: 'amber',
  checked_in: 'sky',
  completed: 'mint',
  interrupted: 'coral',
};

export function presentInterview(record) {
  if (!record) return null;
  const candidate = record.candidateName || record.candidate || 'Candidate';
  const scheduled = record.scheduledAt ? new Date(record.scheduledAt) : null;
  const valid = scheduled && !Number.isNaN(scheduled.getTime());
  const initials = candidate.split(/\s+/).filter(Boolean).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '?';
  return {
    ...record,
    candidate,
    time: valid ? scheduled.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
    endTime: record.status || '',
    avatar: record.avatar || initials,
    interviewers: record.interviewers || record.panelIds || ['You'],
    tone: record.tone || tones[record.status] || 'mint',
    status: record.status || 'draft',
  };
}

export function localDateTimeValue(date = new Date(Date.now() + 86_400_000)) {
  const pad = (value) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function localDateTimeToIso(value) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}
