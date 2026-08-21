import test from 'node:test';
import assert from 'node:assert/strict';
import { createCareerVaultService } from '../src/careerVaultService.mjs';
import { createRagService } from '../src/ragService.mjs';

const tenantId = 'northstar';
const candidateId = 'usr-alex';

test('U5 vault persist roundtrip keeps opportunities and artifacts', () => {
  let snapshot = {};
  const first = createCareerVaultService({ persist: (next) => { snapshot = next; } });
  first.createOpportunity({ tenantId, candidateId, title: 'Senior Frontend Engineer', company: 'Northstar', source: 'candidate_added', sourceReference: 'candidate-entered' });
  first.addArtifact({ tenantId, candidateId, kind: 'note', title: 'Mock notes', content: 'Improve structure and evidence with a measurable outcome.', competency: 'communication' });
  const second = createCareerVaultService({ initial: snapshot });
  assert.equal(second.listOpportunities({ tenantId, candidateId }).length, 1);
  assert.equal(second.listArtifacts({ tenantId, candidateId }).length, 1);
});

test('U5 RAG live_assessment is locked out', () => {
  const rag = createRagService();
  assert.throws(() => rag.ask({
    tenantId, candidateId, sessionContext: 'live_assessment', question: 'What should I say in the live interview?', evidence: [],
  }), /live hiring assessment/i);
});

test('U5 recording without consent is blocked', () => {
  const service = createCareerVaultService();
  assert.throws(() => service.addArtifact({
    tenantId, candidateId, kind: 'audio', title: 'Practice take', content: 'clip', consent: { recording: false, rightsConfirmed: false },
  }), /Recording consent/i);
});
