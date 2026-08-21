import test from 'node:test';
import assert from 'node:assert/strict';
import { createCareerVaultService } from '../src/careerVaultService.mjs';
import { assertCareerPlanningContext } from '../src/policies.mjs';

test('career vault smoke: opportunity → artifact → exclusion → export → delete', () => {
  const service = createCareerVaultService();
  const tenantId = 'career-vault-demo';
  const candidateId = 'candidate-alex';

  const opportunity = service.createOpportunity({ tenantId, candidateId, title: 'Senior Frontend Engineer', company: 'Target company', source: 'candidate_added', sourceReference: 'candidate-entered' });
  assert.equal(opportunity.status, 'saved');

  const artifact = service.addArtifact({ tenantId, candidateId, kind: 'note', title: 'Mock feedback', content: 'Improve structure and evidence.', competency: 'communication' });
  assert.equal(service.getArtifact({ tenantId, candidateId, artifactId: artifact.id, actorId: candidateId }).id, artifact.id);

  service.excludeArtifactFromRetrieval({ tenantId, candidateId, artifactId: artifact.id, actorId: candidateId });
  assert.equal(service.getArtifact({ tenantId, candidateId, artifactId: artifact.id, actorId: candidateId }).excludeFromRetrieval, true);

  const exported = service.exportCandidateData({ tenantId, candidateId, include: ['timeline', 'artifacts', 'metadata', 'audit'], candidateApprovedAt: new Date().toISOString() });
  assert.equal(exported.exportScope, 'candidate_owned_timeline_and_artifacts_only');
  assert.equal(exported.data.artifacts.length, 1);
  assert.ok(exported.data.audit.length >= 3);

  const deleted = service.deleteCandidateData({ tenantId, candidateId, candidateApprovedAt: new Date().toISOString() });
  assert.equal(deleted.propagated, true);
  assert.equal(service.listArtifacts({ tenantId, candidateId }).length, 0);
});

test('career vault smoke: private-by-default blocks non-candidate and cross-tenant access', () => {
  const service = createCareerVaultService();
  const tenantId = 'career-vault-demo';
  const candidateId = 'candidate-alex';

  const artifact = service.addArtifact({ tenantId, candidateId, kind: 'note', title: 'Private', content: 'secret' });
  assert.throws(() => service.getArtifact({ tenantId, candidateId, artifactId: artifact.id, actorId: 'coach-maya' }), /private by default/);
  assert.throws(() => service.getArtifact({ tenantId: 'other-tenant', candidateId, artifactId: artifact.id, actorId: candidateId }), /not found/);
  assert.throws(() => service.getDashboard({ tenantId, candidateId, actorId: 'coach-maya' }), /private to the candidate/);
});

test('career vault smoke: live assessment is rejected by the career planning policy', () => {
  assert.throws(() => assertCareerPlanningContext({ sessionContext: 'live_assessment' }), /not available during a live hiring assessment/);
});
