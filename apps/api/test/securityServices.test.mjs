import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEventBus } from '../../../services/event-gateway/src/eventBus.mjs';
import { createSecurityServices } from '../src/securityServices.mjs';
import { createPlatformServices } from '../src/platformServices.mjs';

const tenantId = 'northstar';

function makeHarness() {
  const events = new MemoryEventBus();
  const platform = createPlatformServices({ events });
  const services = createSecurityServices({ events, platform, tenantId });
  return { events, services };
}

test('SC-03 step-up MFA issues, expires, and verifies challenges', () => {
  const { services } = makeHarness();
  const challenge = services.createStepUpChallenge({ purpose: 'recording-export', userId: 'usr-maya', methods: ['passkey', 'totp'] });
  assert.equal(challenge.expiresInSeconds, 300);
  assert.equal(challenge.status, 'issued');
  assert.ok(challenge.methods.includes('totp'));
  const bad = services.verifyStepUp(challenge.challengeId, { method: 'sms', verified: true });
  assert.equal(bad.reason, 'method-not-allowed');
  const failed = services.verifyStepUp(challenge.challengeId, { method: 'totp', verified: false });
  assert.equal(failed.reason, 'verification-failed');
  const ok = services.verifyStepUp(challenge.challengeId, { method: 'totp', verified: true });
  assert.equal(ok.ok, true);
});

test('SC-12 secret rotation is vault-backed, least-privilege, never exposed', () => {
  const { services, events } = makeHarness();
  const rotated = services.rotateSecret('turn-credential');
  assert.equal(rotated.rotationCount, 1);
  assert.ok(rotated.nextRotationAt > rotated.rotatedAt);
  const policy = services.secretPolicy();
  assert.equal(policy.exposedInResponse, false);
  assert.equal(policy.leastPrivilege, true);
  assert.equal(policy.rotationWindow, '30 days');
  assert.ok(events.list({ tenantId }).map((e) => e.type).includes('security.secret.rotated'));
});

test('SC-04 envelope key rotation versions the KMS-wrapped key', () => {
  const { services } = makeHarness();
  const material = services.rotateEnvelopeKey({ keyReference: 'signalroom-artifact-key' });
  assert.equal(material.algorithm, 'AES-256-GCM');
  assert.equal(material.wrapping, 'kms-transit');
  assert.match(material.keyVersion, /^v\d+$/);
});

test('SC-09 DLP scan detects PII, masks export, and blocks findings', () => {
  const { services } = makeHarness();
  const scan = services.runDlpScan({ content: 'Email alex@example.test or call +62 812 5555 1000' });
  assert.ok(scan.findings.some((f) => f.category === 'email'));
  assert.ok(scan.findings.some((f) => f.category === 'phone'));
  assert.equal(scan.blocked, true);
  assert.equal(scan.downloadPolicy, 'authorization + watermark required');
  const clean = services.runDlpScan({ content: 'No PII here' });
  assert.equal(clean.findings.length, 0);
  assert.equal(clean.blocked, false);
});

test('WAF policy defaults to block with OWASP CRS enabled', () => {
  const { services } = makeHarness();
  const policy = services.setWafPolicy({ id: 'api-edge', rules: ['rate-limit:120', 'geo-allowlist'] });
  assert.equal(policy.defaultAction, 'block');
  assert.equal(policy.owaspCrsEnabled, true);
  assert.equal(services.wafPoliciesSnapshot().length, 1);
});

test('SC-13 compliance evidence bundle is auditor-scoped with owner assignments', () => {
  const { services } = makeHarness();
  const bundle = services.assembleEvidence({ frameworks: ['SOC 2', 'GDPR'] });
  assert.equal(bundle.frameworks.length, 2);
  assert.equal(bundle.export, 'auditor-scoped');
  assert.equal(bundle.ownerAssignments, true);
  assert.ok(bundle.controls.some((c) => c.id === 'sc-03'));
});

test('DO-01 IaC plan and DO-04 release pipeline are parity-gated with review', () => {
  const { services } = makeHarness();
  const iac = services.generateIacPlan();
  assert.ok(iac.environmentParity.includes('production'));
  assert.equal(iac.driftDetection, 'enabled');
  assert.equal(iac.reviewRequired, true);
  const release = services.createReleasePipeline();
  assert.ok(release.stages.includes('canary'));
  assert.ok(release.stages.includes('rollback'));
  assert.equal(release.approvalGate, 'release-manager');
  assert.equal(release.artifactSigning, 'sigstore-cosign-required');
});

test('DO-11 DR drill tracks corrective actions with RPO/RTO targets', () => {
  const { services, events } = makeHarness();
  const drill = services.runDrDrill({ scenario: 'region-failover' });
  assert.equal(drill.rpo, '15 minutes target');
  assert.equal(drill.rto, '4 hours target');
  assert.equal(drill.correctiveActionTracking, true);
  assert.ok(drill.exercises.includes('backup-restore'));
  assert.ok(events.list({ tenantId }).map((e) => e.type).includes('security.dr.drill-planned'));
});

test('DO-12 supply-chain report shows clean audit and blocked install scripts', () => {
  const { services } = makeHarness();
  const report = services.supplyChainReport();
  assert.equal(report.criticalAdvisories, 0);
  assert.equal(report.installScriptPolicy, 'blocked-unless-approved');
  assert.equal(report.dependencyAudit, 'npm audit clean (0 high)');
  assert.ok(report.sbom);
});
