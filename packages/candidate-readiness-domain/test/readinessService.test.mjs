import test from 'node:test';
import assert from 'node:assert/strict';
import { createReadinessService } from '../src/readinessService.mjs';
import { BoundaryViolationError, assertPreparationOnly } from '../src/policies.mjs';

const tenantId = 'candidate-program-demo';
const candidateId = 'candidate-alex';

test('readiness plans are built only from an authorized candidate-owned job description', () => {
  const service = createReadinessService();
  const job = service.createJobDescription({ tenantId, candidateId, title: 'Senior Frontend Engineer', sourceApproval: 'candidate_owned', sourceReference: 'candidate-upload', content: 'Build accessible, reliable frontend systems with React, collaboration, testing, and performance ownership.', competencies: ['Accessibility', 'Systems thinking', 'Collaboration'] });
  const plan = service.createPlan({ tenantId, candidateId, jobDescriptionId: job.id, coachingMode: 'ai', timeBudgetHours: 6, language: 'en' });
  assert.equal(plan.boundary, 'preparation_only');
  assert.equal(plan.milestones.length, 3);
});

test('preparation policy rejects a live assessment context', () => {
  assert.throws(() => assertPreparationOnly({ sessionContext: 'live_assessment' }), BoundaryViolationError);
});

test('candidate-controlled sharing only matches verified coaches in the same tenant', () => {
  const service = createReadinessService();
  const job = service.createJobDescription({ tenantId, candidateId, title: 'Data Engineer', sourceApproval: 'tenant_approved', sourceReference: 'program-library', content: 'Build governed data pipelines, streaming systems, quality checks, and analytics products for enterprise teams.', competencies: ['Data pipelines', 'Quality'] });
  const plan = service.createPlan({ tenantId, candidateId, jobDescriptionId: job.id, coachingMode: 'hybrid', timeBudgetHours: 8, language: 'en' });
  service.upsertCoach({ tenantId, coachId: 'coach-maya', displayName: 'Maya Coach', specialties: ['Data pipelines'], languages: ['en'], timeZone: 'Asia/Jakarta', verificationStatus: 'verified' });
  const matches = service.matchCoaches({ tenantId, planId: plan.id, language: 'en', timeZone: 'Asia/Jakarta' });
  assert.equal(matches.length, 1);
  const handoff = service.createHandoff({ tenantId, candidateId, planId: plan.id, coachId: 'coach-maya', sharedFields: ['goals', 'milestones'], candidateApprovedAt: new Date().toISOString() });
  assert.equal(handoff.scope, 'candidate_selected_preparation_data_only');
});
