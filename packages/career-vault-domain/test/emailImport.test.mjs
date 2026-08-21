import test from 'node:test';
import assert from 'node:assert/strict';
import { createCareerVaultService } from '../src/careerVaultService.mjs';

const tenantId = 'career-vault-demo';
const candidateId = 'candidate-alex';

function setupWithConnector() {
  const service = createCareerVaultService();
  service.setProviderEnabled({ tenantId, candidateId, providerId: 'email', enabled: true });
  const connector = service.registerConnector({ tenantId, candidateId, provider: 'gmail', scopeLabel: 'Application receipts and recruiter messages', candidateApprovedAt: new Date().toISOString(), candidateSelectedFolders: ['Receipts', 'Recruiters'] });
  return { service, connector };
}

test('CV-05: email connector registration requires consent and shows minimal scopes', () => {
  const { connector } = setupWithConnector();
  assert.equal(connector.provider, 'gmail');
  assert.equal(connector.status, 'candidate_approved_review_before_import');
  assert.ok(connector.scopeLabel.includes('Application receipts'));
});

test('CV-06: imported email is held awaiting review and never auto-creates a timeline entry', () => {
  const { service, connector } = setupWithConnector();
  const imported = service.importEmail({ tenantId, candidateId, connectorId: connector.id, subject: 'Interview invitation: Senior Frontend Engineer', from: 'recruiter@company.com', receivedAt: new Date().toISOString(), body: 'Hi, thanks for applying at Northwind Labs.', eligibleFolder: true, scopeLabel: connector.scopeLabel, candidateConsentedFolder: true });
  assert.equal(imported.status, 'awaiting_review');
  assert.equal(imported.trainingUse, false);
  assert.equal(imported.forwardedToEmployer, false);
  // Nothing entered the timeline until review.
  assert.equal(service.listTimeline({ tenantId, candidateId }).length, 0);
  assert.equal(service.listOpportunities({ tenantId, candidateId }).length, 0);
});

test('CV-18: candidate can correct extraction before approval', () => {
  const { service, connector } = setupWithConnector();
  const imported = service.importEmail({ tenantId, candidateId, connectorId: connector.id, subject: 'Interview invitation: Senior Frontend Engineer', from: 'recruiter@company.com', receivedAt: new Date().toISOString(), body: 'Hi, thanks for applying at Northwind Labs.', eligibleFolder: true, scopeLabel: connector.scopeLabel, candidateConsentedFolder: true });
  const reviewed = service.reviewImport({ tenantId, candidateId, importId: imported.id, decision: 'correct', titleOverride: 'Staff Frontend Engineer', companyOverride: 'Northwind Labs', candidateApprovedAt: new Date().toISOString() });
  assert.equal(reviewed.status, 'corrected');
  assert.equal(reviewed.opportunity.title, 'Staff Frontend Engineer');
  assert.equal(reviewed.opportunity.company, 'Northwind Labs');
  assert.equal(reviewed.opportunity.source, 'email_receipt');
  assert.equal(service.listTimeline({ tenantId, candidateId }).length, 1);
});

test('CV-18: candidate can reject an import without creating anything', () => {
  const { service, connector } = setupWithConnector();
  const imported = service.importEmail({ tenantId, candidateId, connectorId: connector.id, subject: 'Newsletter', from: 'news@list.com', receivedAt: new Date().toISOString(), body: 'Weekly digest', eligibleFolder: true, scopeLabel: connector.scopeLabel, candidateConsentedFolder: true });
  const rejected = service.reviewImport({ tenantId, candidateId, importId: imported.id, decision: 'reject', candidateApprovedAt: new Date().toISOString() });
  assert.equal(rejected.status, 'rejected');
  assert.equal(service.listOpportunities({ tenantId, candidateId }).length, 0);
});

test('CV-06: import without folder consent or outside eligible folder is blocked', () => {
  const { service, connector } = setupWithConnector();
  assert.throws(() => service.importEmail({ tenantId, candidateId, connectorId: connector.id, subject: 'Invitation', from: 'r@c.com', receivedAt: new Date().toISOString(), body: 'Hello', eligibleFolder: true, scopeLabel: connector.scopeLabel, candidateConsentedFolder: false }), /consent for this folder/);
  assert.throws(() => service.importEmail({ tenantId, candidateId, connectorId: connector.id, subject: 'Invitation', from: 'r@c.com', receivedAt: new Date().toISOString(), body: 'Hello', eligibleFolder: false, scopeLabel: connector.scopeLabel, candidateConsentedFolder: true }), /not within the candidate-selected eligible folders/);
});

test('CV-06: imported email cannot create duplicate active opportunities', () => {
  const { service, connector } = setupWithConnector();
  service.createOpportunity({ tenantId, candidateId, title: 'Senior Frontend Engineer', company: 'Northwind Labs', source: 'candidate_added', sourceReference: 'manual' });
  const imported = service.importEmail({ tenantId, candidateId, connectorId: connector.id, subject: 'Interview invitation: Senior Frontend Engineer', from: 'recruiter@company.com', receivedAt: new Date().toISOString(), body: 'Hi, thanks for applying at Northwind Labs.', eligibleFolder: true, scopeLabel: connector.scopeLabel, candidateConsentedFolder: true });
  assert.throws(() => service.reviewImport({ tenantId, candidateId, importId: imported.id, decision: 'approve', candidateApprovedAt: new Date().toISOString() }), /active opportunity already exists/);
});

test('CV-20: raw email body is not exposed in audit logs', () => {
  const { service, connector } = setupWithConnector();
  const imported = service.importEmail({ tenantId, candidateId, connectorId: connector.id, subject: 'Interview invitation: Senior Frontend Engineer', from: 'recruiter@company.com', receivedAt: new Date().toISOString(), body: 'CONFIDENTIAL: salary range $180k-$200k', eligibleFolder: true, scopeLabel: connector.scopeLabel, candidateConsentedFolder: true });
  const audit = service.getAudit({ tenantId });
  const importAudit = audit.find((entry) => entry.entityId === imported.id);
  assert.ok(importAudit);
  assert.ok(!JSON.stringify(importAudit).includes('CONFIDENTIAL'));
});
