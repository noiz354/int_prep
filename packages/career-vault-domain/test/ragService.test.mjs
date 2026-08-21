import test from 'node:test';
import assert from 'node:assert/strict';
import { createRagService } from '../src/ragService.mjs';

const TENANT = 'career-vault-demo';
const CANDIDATE = 'candidate-alex';

function evidence(overrides = {}) {
  return {
    artifactId: 'cv-artifact-1', title: 'Mock feedback', kind: 'feedback', content: 'Improve structure and evidence. Add a measurable outcome and explain trade-offs.',
    source: 'candidate_entered', date: '2026-08-01T00:00:00Z', tenantId: TENANT, candidateId: CANDIDATE, competency: 'communication', opportunityId: '', ...overrides,
  };
}

test('CV-08: ask cites candidate-owned evidence with dates and excerpts', () => {
  const rag = createRagService();
  const result = rag.ask({ tenantId: TENANT, candidateId: CANDIDATE, sessionContext: 'career_planning', question: 'What feedback patterns about structure and evidence repeat?', evidence: [evidence()] });
  assert.equal(result.abstention, false);
  assert.equal(result.citations[0].artifact_id, 'cv-artifact-1');
  assert.equal(result.citations[0].date, '2026-08-01T00:00:00Z');
  assert.ok(result.citations[0].excerpt.length > 0);
  assert.equal(result.requiresHumanJudgment, true);
  assert.ok(result.confidence > 0);
});

test('CV-10: ask with insufficient data abstains and recommends next step', () => {
  const rag = createRagService();
  const result = rag.ask({ tenantId: TENANT, candidateId: CANDIDATE, sessionContext: 'career_planning', question: 'quantum chromodynamics recipe', evidence: [] });
  assert.equal(result.abstention, true);
  assert.equal(result.reason, 'insufficient_permitted_evidence');
  assert.equal(result.answer, null);
  assert.ok(result.suggestedNextAction);
});

test('low-grounding abstains rather than fabricating', () => {
  const rag = createRagService();
  const result = rag.ask({ tenantId: TENANT, candidateId: CANDIDATE, sessionContext: 'career_planning', question: 'quantum chromodynamics recipe', evidence: [evidence({ content: 'frontend accessibility notes' })] });
  assert.equal(result.abstention, true);
  assert.equal(result.reason, 'low_grounding');
});

test('CV-16: retrieval is tenant and candidate scoped', () => {
  const rag = createRagService();
  const result = rag.ask({ tenantId: TENANT, candidateId: CANDIDATE, sessionContext: 'career_planning', question: 'structure and evidence', evidence: [evidence({ artifactId: 'a1' }), evidence({ artifactId: 'a2', tenantId: 'other-tenant' }), evidence({ artifactId: 'a3', candidateId: 'candidate-bob' })] });
  assert.deepEqual(result.citations.map((c) => c.artifact_id), ['a1']);
});

test('CV-11: blank or excluded content is not retrieved', () => {
  const rag = createRagService();
  const result = rag.ask({ tenantId: TENANT, candidateId: CANDIDATE, sessionContext: 'career_planning', question: 'structure and evidence', evidence: [evidence({ artifactId: 'a1', content: '' }), evidence({ artifactId: 'a2', content: '   ' }), evidence({ artifactId: 'a3', content: 'real feedback about structure and evidence' })] });
  assert.deepEqual(result.citations.map((c) => c.artifact_id), ['a3']);
});

test('CV-09: seven-day plan is grounded and cited', () => {
  const rag = createRagService();
  const result = rag.createSevenDayPlan({ tenantId: TENANT, candidateId: CANDIDATE, sessionContext: 'career_planning', evidence: [evidence({ artifactId: 'p1', kind: 'feedback', title: 'Frontend feedback', content: 'Improve system design trade-offs' })] });
  assert.equal(result.abstention, false);
  assert.equal(result.plan.days.length, 7);
  assert.ok(result.citations.length > 0);
  assert.deepEqual(result.plan.basedOn, result.citations);
});

test('seven-day plan abstains without evidence', () => {
  const rag = createRagService();
  const result = rag.createSevenDayPlan({ tenantId: TENANT, candidateId: CANDIDATE, sessionContext: 'career_planning', evidence: [] });
  assert.equal(result.abstention, true);
  assert.equal(result.reason, 'insufficient_permitted_evidence');
});

test('feedback theme clustering groups communication and evidence', () => {
  const rag = createRagService();
  const themes = rag.clusterFeedbackThemes([evidence({ artifactId: 'f1', title: 'Structure feedback', content: 'Your answer lacked structure and clarity' }), evidence({ artifactId: 'f2', title: 'Evidence feedback', content: 'Add a measurable outcome and metric' })]);
  const names = themes.map((t) => t.theme);
  assert.ok(names.includes('communication'));
  assert.ok(names.includes('evidence'));
  assert.ok(themes.every((t) => t.count >= 1));
});

test('CV-17: live assessment is locked out', () => {
  const rag = createRagService();
  assert.throws(() => rag.ask({ tenantId: TENANT, candidateId: CANDIDATE, sessionContext: 'live_assessment', question: 'help', evidence: [evidence()] }), /not available during a live hiring assessment/);
  assert.throws(() => rag.createSevenDayPlan({ tenantId: TENANT, candidateId: CANDIDATE, sessionContext: 'live_assessment', evidence: [evidence()] }), /not available during a live hiring assessment/);
});
