export const currentUser = {
  name: 'Maya Patel',
  initials: 'MP',
  role: 'Talent Operations Lead',
  organization: 'Northstar Systems',
};

export const metrics = [
  { label: 'Interviews this week', value: '48', trend: '+12%', tone: 'violet', note: 'vs. last week' },
  { label: 'Join success rate', value: '99.2%', trend: '+0.6%', tone: 'mint', note: 'healthy across regions' },
  { label: 'Median candidate NPS', value: '72', trend: '+4 pts', tone: 'sky', note: 'last 30 days' },
  { label: 'Rubrics on time', value: '94%', trend: '+8%', tone: 'amber', note: 'within 24 hours' },
];

export const upcomingInterviews = [
  {
    id: 'int-2048',
    time: '09:30',
    endTime: '10:15',
    candidate: 'Alex Morgan',
    role: 'Senior Frontend Engineer',
    stage: 'Technical deep dive',
    interviewers: ['MP', 'JN'],
    status: 'Live in 18 min',
    tone: 'violet',
    avatar: 'AM',
  },
  {
    id: 'int-2051',
    time: '11:00',
    endTime: '11:45',
    candidate: 'Nadia Rahman',
    role: 'Data Platform Manager',
    stage: 'Leadership conversation',
    interviewers: ['MP', 'SK', 'AR'],
    status: 'Confirmed',
    tone: 'mint',
    avatar: 'NR',
  },
  {
    id: 'int-2056',
    time: '14:00',
    endTime: '15:00',
    candidate: 'Jordan Lee',
    role: 'Staff Backend Engineer',
    stage: 'Systems design',
    interviewers: ['MP', 'RK'],
    status: 'Pending device check',
    tone: 'amber',
    avatar: 'JL',
  },
  {
    id: 'int-2060',
    time: '16:30',
    endTime: '17:15',
    candidate: 'Priya Menon',
    role: 'Product Designer',
    stage: 'Portfolio review',
    interviewers: ['MP', 'CE'],
    status: 'Confirmed',
    tone: 'sky',
    avatar: 'PM',
  },
];

export const liveParticipants = [
  { id: 'alex', name: 'Alex Morgan', initials: 'AM', role: 'Candidate', speaking: true, gradient: 'coral' },
  { id: 'maya', name: 'Maya Patel', initials: 'MP', role: 'Interviewer', gradient: 'indigo' },
  { id: 'jordan', name: 'Jordan Nguyen', initials: 'JN', role: 'Observer', muted: true, gradient: 'mint' },
];

export const transcriptSeed = [
  { id: 1, speaker: 'Alex Morgan', time: '09:42:18', text: 'I would begin by separating the rendering path from the data synchronization path, so the experience stays responsive even when the network is noisy.', tone: 'candidate' },
  { id: 2, speaker: 'Maya Patel', time: '09:42:47', text: 'How would you make that synchronization resilient if a user briefly loses connectivity?', tone: 'interviewer' },
  { id: 3, speaker: 'Alex Morgan', time: '09:43:05', text: 'I would preserve the local intent, use idempotency keys for writes, and replay the queue after the connection is re-established.', tone: 'candidate' },
];

export const copilotSeed = [
  { id: 1, type: 'coverage', title: 'Rubric coverage', text: 'Reliability is well covered. Accessibility has not yet been explored.', action: 'Ask about a11y' },
  { id: 2, type: 'followup', title: 'Useful follow-up', text: 'Ask Alex to explain how conflicting offline edits should be reconciled.', action: 'Add to queue' },
  { id: 3, type: 'signal', title: 'Evidence captured', text: 'Strong systems thinking supported by two timestamped transcript excerpts.', action: 'View evidence' },
];

export const intelligenceSignals = [
  { label: 'Transcript freshness', value: '1.8s', status: 'Excellent', progress: 92 },
  { label: 'AI recommendation confidence', value: '0.84', status: 'Human review', progress: 84 },
  { label: 'Integrity signal', value: 'Low risk', status: 'No action', progress: 14 },
  { label: 'Rubric coverage', value: '76%', status: '3 criteria left', progress: 76 },
];

export const eventFeed = [
  { time: '09:43:09', type: 'ai.copilot.followup.created', label: 'Follow-up suggested for offline conflict handling', tone: 'violet' },
  { time: '09:43:05', type: 'transcript.segment.finalized', label: 'Candidate segment diarized and indexed', tone: 'sky' },
  { time: '09:42:59', type: 'media.quality.updated', label: 'Jakarta edge · 34 ms · 0.2% packet loss', tone: 'mint' },
  { time: '09:42:47', type: 'interview.prompt.asked', label: 'Reliability follow-up captured', tone: 'amber' },
];

export const reliabilityServices = [
  { name: 'Interview API', region: 'ap-southeast-1', status: 'Operational', latency: '82 ms', tone: 'mint' },
  { name: 'Media edge', region: 'Singapore', status: 'Operational', latency: '34 ms', tone: 'mint' },
  { name: 'AI copilot', region: 'Regional', status: 'Degraded', latency: '1.8 s', tone: 'amber' },
  { name: 'Event pipeline', region: 'Global', status: 'Operational', latency: '220 ms', tone: 'mint' },
];

export const integrations = [
  { name: 'Greenhouse', type: 'Applicant tracking', initials: 'GH', status: 'Connected', sync: '2 min ago', accent: 'green' },
  { name: 'Google Workspace', type: 'Calendar & identity', initials: 'GW', status: 'Connected', sync: 'Live', accent: 'blue' },
  { name: 'Slack', type: 'Notifications', initials: 'SL', status: 'Connected', sync: 'Live', accent: 'purple' },
  { name: 'Workday', type: 'HRIS', initials: 'WD', status: 'Needs mapping', sync: '—', accent: 'orange' },
];

export const scorecardCriteria = [
  { id: 'systems', label: 'Systems thinking', weight: 30, score: 4, evidence: 'Separated rendering and synchronization paths.' },
  { id: 'execution', label: 'Execution & quality', weight: 25, score: 4, evidence: 'Used idempotency and replay safeguards.' },
  { id: 'accessibility', label: 'Accessibility mindset', weight: 20, score: null, evidence: '' },
  { id: 'collaboration', label: 'Collaboration', weight: 25, score: 3, evidence: 'Explains trade-offs with clarity.' },
];

export const candidateTasks = [
  { title: 'Pre-interview device check', complete: true, note: 'Camera, microphone, and bandwidth verified' },
  { title: 'Review interview guide', complete: true, note: 'Shared by Northstar Systems' },
  { title: 'Accessibility preferences', complete: false, note: 'Optional · 2 minutes' },
];
