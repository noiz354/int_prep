import test from 'node:test';
import assert from 'node:assert/strict';
import { createCareerVaultService } from '../src/careerVaultService.mjs';
import { assertCandidatePrivateDefault, assertCareerPlanningContext, assertExplicitShare } from '../src/policies.mjs';

const tenantId = 'career-vault-demo';
const candidateId = 'candidate-alex';

function setup() {
  const service = createCareerVaultService();
  return { service };
}

test('CV-01: candidate can add a manual opportunity and update application status', () => {
  const { service } = setup();
  const opportunity = service.createOpportunity({ tenantId, candidateId, title: 'Senior Frontend Engineer', company: 'Target company', source: 'candidate_added', sourceReference: 'candidate-entered', requirements: ['React', 'Accessibility'] });
  const updated = service.updateOpportunityStatus({ tenantId, candidateId, opportunityId: opportunity.id, status: 'review_required', actorId: candidateId });
  assert.equal(updated.status, 'review_required');
  const timeline = service.addTimelineEvent({ tenantId, candidateId, kind: 'application', title: 'Applied via career page', opportunityId: opportunity.id, source: 'candidate_entered' });
  assert.ok(timeline.id);
  const events = service.listTimeline({ tenantId, candidateId });
  assert.equal(events.length, 1);
});

test('CV-02: artifact is private by default and tagged with provenance', () => {
  const { service } = setup();
  const artifact = service.addArtifact({ tenantId, candidateId, kind: 'note', title: 'Feedback from mock', content: 'Improve structure and evidence.', source: 'candidate_entered', competency: 'Communication' });
  assert.equal(artifact.privateByDefault, undefined); // default policy is enforced in access, not stored flag
  const owner = service.getArtifact({ tenantId, candidateId, artifactId: artifact.id, actorId: candidateId });
  assert.equal(owner.title, 'Feedback from mock');
  assert.throws(() => service.getArtifact({ tenantId, candidateId, artifactId: artifact.id, actorId: 'coach-maya' }), /private by default/);
});

test('CV-03: uploaded practice recording requires recording and transcript consent with separate retention', () => {
  const { service } = setup();
  assert.throws(() => service.addArtifact({ tenantId, candidateId, kind: 'audio', title: 'Practice recording', content: 'ref', consent: { recording: false, transcript: false, rightsConfirmed: false } }), /consent/);
  const artifact = service.addArtifact({ tenantId, candidateId, kind: 'audio', title: 'Practice recording', content: 'ref', consent: { recording: true, transcript: true, rightsConfirmed: true }, retention: 'delete_after_90_days' });
  assert.equal(artifact.retention, 'delete_after_90_days');
  assert.equal(artifact.consent.recording, true);
});

test('CV-04: upload without required rights/consent is blocked', () => {
  const { service } = setup();
  assert.throws(() => service.addArtifact({ tenantId, candidateId, kind: 'video', title: 'No rights video', content: 'ref', consent: { recording: false, transcript: false, rightsConfirmed: false } }), /consent/);
});

test('CV-11: excluding an artifact from future retrieval is immediate and audited', () => {
  const { service } = setup();
  const artifact = service.addArtifact({ tenantId, candidateId, kind: 'feedback', title: 'Do not use', content: 'sensitive', source: 'candidate_entered' });
  const excluded = service.excludeArtifactFromRetrieval({ tenantId, candidateId, artifactId: artifact.id, actorId: candidateId });
  assert.equal(excluded.excludeFromRetrieval, true);
  const audit = service.getAudit({ tenantId });
  assert.ok(audit.some((entry) => entry.action === 'artifact.retrieval_excluded'));
});

test('CV-14: export contains only candidate-owned timeline, artifacts, and metadata', () => {
  const { service } = setup();
  service.createOpportunity({ tenantId, candidateId, title: 'Data Engineer', company: 'Other company', source: 'candidate_added', sourceReference: 'manual' });
  service.addArtifact({ tenantId, candidateId, kind: 'note', title: 'My note', content: 'x' });
  const result = service.exportCandidateData({ tenantId, candidateId, include: ['timeline', 'artifacts', 'metadata', 'audit'], candidateApprovedAt: new Date().toISOString() });
  assert.equal(result.exportScope, 'candidate_owned_timeline_and_artifacts_only');
  assert.equal(result.data.opportunities.length, 1);
  assert.equal(result.data.artifacts.length, 1);
  assert.ok(result.data.audit.length >= 2);
});

test('CV-15: deletion propagates through artifacts, timeline, and derived records', () => {
  const { service } = setup();
  const opportunity = service.createOpportunity({ tenantId, candidateId, title: 'Delete me', company: 'Company', source: 'candidate_added', sourceReference: 'manual' });
  const artifact = service.addArtifact({ tenantId, candidateId, kind: 'note', title: 'Delete artifact', content: 'x' });
  service.excludeArtifactFromRetrieval({ tenantId, candidateId, artifactId: artifact.id, actorId: candidateId });
  service.addTimelineEvent({ tenantId, candidateId, kind: 'note', title: 'Delete event', opportunityId: opportunity.id });
  const result = service.deleteCandidateData({ tenantId, candidateId, candidateApprovedAt: new Date().toISOString() });
  assert.equal(result.propagated, true);
  assert.equal(service.listOpportunities({ tenantId, candidateId }).length, 0);
  assert.equal(service.listArtifacts({ tenantId, candidateId }).length, 0);
  assert.equal(service.listTimeline({ tenantId, candidateId }).length, 0);
  assert.ok(result.deletedEntities >= 4);
});

test('CV-16: cross-tenant or cross-candidate access is denied', () => {
  const { service } = setup();
  const artifact = service.addArtifact({ tenantId, candidateId, kind: 'note', title: 'Private', content: 'secret' });
  assert.throws(() => service.getArtifact({ tenantId: 'other-tenant', candidateId, artifactId: artifact.id, actorId: candidateId }), /not found/);
  assert.throws(() => service.getArtifact({ tenantId, candidateId: 'candidate-bob', artifactId: artifact.id, actorId: 'candidate-bob' }), /not found/);
  assert.throws(() => service.getDashboard({ tenantId, candidateId, actorId: 'coach-maya' }), /private to the candidate/);
});

test('CV-17: real-assessment context is locked out', () => {
  assert.throws(() => assertCareerPlanningContext({ sessionContext: 'live_assessment' }), /not available during a live hiring assessment/);
  assert.doesNotThrow(() => assertCareerPlanningContext({ sessionContext: 'career_planning' }));
  assert.throws(() => assertCandidatePrivateDefault({ candidateId, actorId: 'coach-maya' }), /private to the candidate/);
});

test('duplicate detection prevents active duplicate opportunities for the same role', () => {
  const { service } = setup();
  service.createOpportunity({ tenantId, candidateId, title: 'Staff UI Engineer', company: 'Product company', source: 'official_career_page', sourceReference: 'career-page' });
  assert.throws(() => service.createOpportunity({ tenantId, candidateId, title: 'Staff UI Engineer', company: 'Product company', source: 'email_receipt', sourceReference: 'email-import' }), /active opportunity already exists/);
});

test('explicit granular sharing is required and employer evaluation data is excluded', () => {
  const { service } = setup();
  const artifact = service.addArtifact({ tenantId, candidateId, kind: 'feedback', title: 'Shared feedback', content: 'x' });
  const share = service.createShare({ tenantId, candidateId, artifactIds: [artifact.id], recipientRole: 'coach', fields: ['summary', 'feedback'], candidateApprovedAt: new Date().toISOString() });
  assert.equal(share.scope, 'candidate_selected_fields_only');
  assert.equal(share.employerEvaluationExcluded, true);
  assert.throws(() => assertExplicitShare({ candidateApprovedAt: undefined, fields: ['summary'], artifactIds: [artifact.id] }), /time-stamped, granular candidate sharing/);
});
