export const demoProfile = {
  id: 'candidate-alex',
  name: 'Alex Morgan',
  initials: 'AM',
  headline: 'Frontend engineer focused on accessible, reliable product systems',
  skills: ['React', 'TypeScript', 'Accessibility', 'Web Performance', 'Testing', 'Collaboration'],
  languages: ['English', 'Bahasa Indonesia'],
  timeZone: 'WIB · Asia/Jakarta',
  profileCompleteness: 78,
};

export const demoJob = {
  id: 'cr-job-demo',
  title: 'Senior Frontend Engineer',
  company: 'Target company',
  level: 'Senior',
  sourceApproval: 'tenant_approved',
  sourceLabel: 'Authorized job description',
  competencies: [
    { id: 'systems', name: 'Systems thinking', focus: 'Resilient client state, performance, and trade-offs', progress: 72, action: 'Practice a trade-off story' },
    { id: 'a11y', name: 'Accessibility', focus: 'Inclusive, semantic, keyboard-first product systems', progress: 38, action: 'Complete an accessibility design mock' },
    { id: 'collaboration', name: 'Collaboration', focus: 'Cross-functional influence and design-system adoption', progress: 64, action: 'Add a stakeholder alignment story' },
    { id: 'quality', name: 'Quality engineering', focus: 'Testing, observability, and safe delivery', progress: 58, action: 'Explain a quality decision' },
  ],
  stack: ['React', 'TypeScript', 'Web performance', 'Accessibility', 'Testing'],
};

export const demoMaterials = [
  { id: 'react', title: 'React documentation', type: 'Official documentation', relevance: 'Component design, rendering, state, and performance', source: 'Public authorized material', action: 'Open learning plan' },
  { id: 'mdn', title: 'MDN Web Performance', type: 'Official documentation', relevance: 'Browser performance, loading, caching, and diagnostics', source: 'Public authorized material', action: 'Create practice task' },
  { id: 'wai', title: 'W3C Web Accessibility Initiative', type: 'Official guidance', relevance: 'Semantic UI, keyboard flow, assistive technology, and inclusive patterns', source: 'Public authorized material', action: 'Start a11y mock' },
  { id: 'owasp', title: 'OWASP web guidance', type: 'Official guidance', relevance: 'Secure browser and application patterns', source: 'Public authorized material', action: 'Review security scenario' },
];

export const demoStories = [
  { id: 'story-1', title: 'Design system migration', competency: 'Collaboration', summary: 'Led a cross-team migration for 42 product teams while preserving accessibility tokens.', evidence: 'Reduced duplicated UI work and established shared review process.', score: 82 },
  { id: 'story-2', title: 'Offline conflict recovery', competency: 'Systems thinking', summary: 'Separated rendering and synchronization paths for a collaborative workflow.', evidence: 'Introduced idempotency and recovery behavior.', score: 74 },
];

export const demoCoaches = [
  { id: 'coach-maya', name: 'Maya Rivera', title: 'Frontend & accessibility coach', languages: ['English', 'Bahasa Indonesia'], timeZone: 'WIB', match: 94, verified: true, availability: 'Tomorrow · 16:00', specialties: ['Accessibility', 'React', 'Design systems'] },
  { id: 'coach-daniel', name: 'Daniel Ortiz', title: 'Systems design coach', languages: ['English'], timeZone: 'SGT', match: 88, verified: true, availability: 'Friday · 10:30', specialties: ['Systems thinking', 'Performance', 'Architecture'] },
  { id: 'coach-sara', name: 'Sara Lim', title: 'Technical communication coach', languages: ['English', 'Bahasa Indonesia'], timeZone: 'WIB', match: 83, verified: true, availability: 'Saturday · 13:00', specialties: ['Storytelling', 'Leadership', 'Communication'] },
];

export const demoOpportunities = [
  { id: 'opp-1', title: 'Senior Frontend Engineer', company: 'Target company', source: 'Official career page', verified: true, match: 86, readiness: 'Practice accessibility before applying', status: 'review_required', deadline: 'In 5 days' },
  { id: 'opp-2', title: 'Staff UI Engineer', company: 'Product company', source: 'Approved ATS connector', verified: true, match: 78, readiness: 'Apply now with system-design story', status: 'saved', deadline: 'In 9 days' },
  { id: 'opp-3', title: 'Frontend Platform Engineer', company: 'Referral introduction', source: 'Candidate-approved referral', verified: true, match: 82, readiness: 'Request human coach review', status: 'saved', deadline: 'Referral open' },
];

export const actionInbox = [
  { id: 'action-1', type: 'practice', label: 'Finish the accessibility design mock', detail: '35 minutes · improves a current readiness gap', priority: 'high' },
  { id: 'action-2', type: 'story', label: 'Add a measurable outcome to your collaboration story', detail: '10 minutes · evidence improvement', priority: 'medium' },
  { id: 'action-3', type: 'application', label: 'Review your Target company application', detail: 'Candidate approval required before submission', priority: 'high' },
];
