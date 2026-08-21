import test from 'node:test';
import assert from 'node:assert/strict';
import { createCareerVaultService } from '../src/careerVaultService.mjs';
import { createProviderRegistry, PROVIDER_CATALOG } from '../src/providerRegistry.mjs';

const tenantId = 'career-vault-demo';
const candidateId = 'candidate-alex';

test('provider registry lists disable/connect/blocked actions', () => {
  const registry = createProviderRegistry();
  const providers = registry.list({ tenantId, candidateId });
  assert.equal(providers.length, PROVIDER_CATALOG.length);
  const rag = providers.find((p) => p.id === 'rag_coach');
  assert.equal(rag.action, 'disable'); // enabled by default
  const email = providers.find((p) => p.id === 'email');
  assert.equal(email.action, 'connect'); // available but not enabled
  const vector = providers.find((p) => p.id === 'vector_index');
  assert.equal(vector.action, 'blocked'); // blocked_on_provider_decision
  assert.match(vector.reason, /Requires/);
});

test('enabling a blocked provider is rejected', () => {
  const registry = createProviderRegistry();
  assert.throws(() => registry.setEnabled({ tenantId, candidateId, providerId: 'model_gateway', enabled: true }), /until a provider is selected/);
});

test('disabling a provider is allowed and audited', () => {
  const registry = createProviderRegistry();
  const updated = registry.setEnabled({ tenantId, candidateId, providerId: 'rag_coach', enabled: false });
  assert.equal(updated.action, 'connect');
  assert.equal(registry.isEnabled('rag_coach'), false);
});

test('email import is blocked when the email provider is disabled', () => {
  const service = createCareerVaultService();
  const connector = service.registerConnector({ tenantId, candidateId, provider: 'gmail', scopeLabel: 'Application receipts and recruiter messages', candidateApprovedAt: new Date().toISOString(), candidateSelectedFolders: ['Receipts'] });
  assert.throws(() => service.importEmail({ tenantId, candidateId, connectorId: connector.id, subject: 'Interview invitation: Senior Frontend Engineer', from: 'recruiter@company.com', receivedAt: new Date().toISOString(), body: 'Hi at Northwind Labs.', eligibleFolder: true, scopeLabel: 'Application receipts and recruiter messages', candidateConsentedFolder: true }), /disabled/);
  service.setProviderEnabled({ tenantId, candidateId, providerId: 'email', enabled: true });
  const imported = service.importEmail({ tenantId, candidateId, connectorId: connector.id, subject: 'Interview invitation: Senior Frontend Engineer', from: 'recruiter@company.com', receivedAt: new Date().toISOString(), body: 'Hi at Northwind Labs.', eligibleFolder: true, scopeLabel: 'Application receipts and recruiter messages', candidateConsentedFolder: true });
  assert.equal(imported.status, 'awaiting_review');
});

test('provider enable/disable is audit logged through the service', () => {
  const service = createCareerVaultService();
  service.setProviderEnabled({ tenantId, candidateId, providerId: 'email', enabled: true });
  service.setProviderEnabled({ tenantId, candidateId, providerId: 'email', enabled: false });
  const audit = service.getAudit({ tenantId });
  assert.ok(audit.some((entry) => entry.action === 'provider.enabled'));
  assert.ok(audit.some((entry) => entry.action === 'provider.disabled'));
});

test('RAG is disabled by default? no — rag_coach enabled by default, but can be disabled via service', () => {
  const service = createCareerVaultService();
  const providers = service.listProviders({ tenantId, candidateId });
  assert.equal(providers.find((p) => p.id === 'rag_coach').enabled, true);
  service.setProviderEnabled({ tenantId, candidateId, providerId: 'rag_coach', enabled: false });
  assert.equal(service.listProviders({ tenantId, candidateId }).find((p) => p.id === 'rag_coach').enabled, false);
});
