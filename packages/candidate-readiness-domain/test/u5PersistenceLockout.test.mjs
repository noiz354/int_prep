import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadinessService } from '../src/readinessService.mjs';

const tenantId = 'northstar';
const candidateId = 'usr-alex';

function seed(service) {
  service.upsertProfile({ tenantId, candidateId, displayName: 'Alex Morgan', headline: 'Frontend engineer', skills: ['React'], languages: ['English'], timeZone: 'Asia/Jakarta' });
  return service.createJobDescription({
    tenantId, candidateId, title: 'Senior Frontend Engineer', company: 'Northstar',
    sourceApproval: 'candidate_owned', sourceReference: 'candidate-entered',
    content: 'Build accessible reliable product systems with measurable outcomes and inclusive defaults.',
    competencies: ['Systems thinking', 'Accessibility'], stack: ['React'],
  });
}

test('U5 file-shaped persist roundtrip keeps plans and practice', () => {
  let snapshot = {};
  const first = createReadinessService({ persist: (next) => { snapshot = next; } });
  const job = seed(first);
  const plan = first.createPlan({ tenantId, candidateId, jobDescriptionId: job.id, coachingMode: 'hybrid', timeBudgetHours: 6, language: 'en' });
  first.createPracticeSession({ tenantId, candidateId, planId: plan.id, sessionContext: 'preparation', consentForAi: true, practiceMode: 'technical', competency: 'Systems thinking', answer: 'We measured a 20% reduction after the trade-off.' });
  const second = createReadinessService({ initial: snapshot });
  const dash = second.getDashboard({ tenantId, candidateId });
  assert.equal(dash.plan.id, plan.id);
  assert.equal(dash.sessions.length, 1);
  assert.equal(dash.job.title, 'Senior Frontend Engineer');
});

test('U5 live_assessment practice is locked out', () => {
  const service = createReadinessService();
  const job = seed(service);
  const plan = service.createPlan({ tenantId, candidateId, jobDescriptionId: job.id, coachingMode: 'ai', timeBudgetHours: 4, language: 'en' });
  assert.throws(() => service.createPracticeSession({
    tenantId, candidateId, planId: plan.id, sessionContext: 'live_assessment', consentForAi: true, practiceMode: 'technical', competency: 'Systems thinking', answer: 'help me cheat',
  }), /live hiring assessment|Invalid|expected/i);
});

test('U5 unapproved JD is blocked', () => {
  const service = createReadinessService();
  assert.throws(() => service.createJobDescription({
    tenantId, candidateId, title: 'Secret role', company: 'Hidden', sourceApproval: 'confidential',
    sourceReference: 'leaked-packet', content: 'Confidential interview questions that must never be ingested into preparation.',
    competencies: ['Secret'],
  }), /not approved for preparation/i);
});
