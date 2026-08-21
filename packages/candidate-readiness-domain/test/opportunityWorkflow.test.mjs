import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadinessService } from '../src/readinessService.mjs';

const tenantId = 'candidate-program-demo';
const candidateId = 'candidate-alex';

function setup() {
  const service = createReadinessService();
  service.upsertProfile({ tenantId, candidateId, displayName: 'Alex Morgan', headline: 'Frontend engineer', skills: ['React', 'Accessibility', 'Testing'], languages: ['en'], timeZone: 'Asia/Jakarta' });
  const job = service.createJobDescription({ tenantId, candidateId, title: 'Senior Frontend Engineer', company: 'Target company', sourceApproval: 'candidate_owned', sourceReference: 'candidate-upload', content: 'Build reliable, accessible React applications with strong testing, collaboration, and performance practices for enterprise users.', competencies: ['Accessibility', 'Systems thinking'], stack: ['React', 'Testing'] });
  const plan = service.createPlan({ tenantId, candidateId, jobDescriptionId: job.id, coachingMode: 'ai', timeBudgetHours: 6, language: 'en' });
  return { service, job, plan };
}

test('role intelligence only uses authorized job and candidate profile data', () => {
  const { service, job } = setup();
  const intelligence = service.buildRoleIntelligence({ tenantId, candidateId, jobDescriptionId: job.id });
  assert.equal(intelligence.title, 'Senior Frontend Engineer');
  assert.equal(intelligence.sourcePolicy, 'public_or_candidate_owned_or_tenant_approved_only');
  assert.equal(intelligence.skillMatrix.length, 2);
});

test('practice feedback stays preparation-only and returns readiness guidance', () => {
  const { service, plan } = setup();
  const session = service.createPracticeSession({ tenantId, candidateId, planId: plan.id, sessionContext: 'preparation', consentForAi: true, practiceMode: 'technical', competency: 'Systems thinking', answer: 'I considered the network constraint, chose idempotent writes, tested retries, and reduced failed updates by 30%.' });
  assert.equal(session.liveAssessmentAccess, false);
  assert.ok(session.feedback.readinessSignal > 0);
  assert.match(session.feedback.limitations[0], /Practice-only/);
});

test('application campaigns never auto-submit by default and prevent duplicates', () => {
  const { service } = setup();
  const opportunity = service.createOpportunity({ tenantId, candidateId, title: 'Senior Frontend Engineer', company: 'Target company', source: 'official_career_page', sourceReference: 'career-page', requirements: ['React', 'Accessibility'], verifiedSource: true });
  const campaign = service.createCampaign({ tenantId, candidateId, name: 'Frontend roles', sourceTypes: ['official_career_page'], targetRoles: ['Senior Frontend Engineer'], dailyLimit: 5, reviewBeforeSend: true, candidateApprovedAt: new Date().toISOString() });
  const application = service.createApplication({ tenantId, candidateId, opportunityId: opportunity.id, resumeVersion: 'Frontend v3', candidateApprovedAt: new Date().toISOString() });
  assert.equal(campaign.autoSubmitAllowed, false);
  assert.equal(application.status, 'review_required');
  assert.throws(() => service.createApplication({ tenantId, candidateId, opportunityId: opportunity.id, resumeVersion: 'Frontend v3', candidateApprovedAt: new Date().toISOString() }), /active application/);
});
