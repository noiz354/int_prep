import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateScorecard, newInterview, validateScorecard } from '../src/domain.mjs';

test('calculates a weighted, evidence-aware scorecard', () => {
  const score = calculateScorecard([
    { id: 'systems', weight: 60, score: 4 },
    { id: 'accessibility', weight: 40, score: 3 },
  ]);
  assert.deepEqual(score, { completeness: 100, average: 3.6, recommendation: 'Hire' });
});

test('marks incomplete scorecards as needing evidence', () => {
  const score = calculateScorecard([{ id: 'systems', weight: 60, score: 4 }, { id: 'a11y', weight: 40, score: null }]);
  assert.equal(score.completeness, 60);
  assert.equal(score.recommendation, 'Needs evidence');
});

test('validates critical interview input', () => {
  assert.equal(validateScorecard({ criteria: [] }), 'criteria must be a non-empty array');
  assert.throws(() => newInterview({ candidateName: '', role: 'Engineer', stage: 'Technical', tenantId: 'northstar' }), /required/);
});
