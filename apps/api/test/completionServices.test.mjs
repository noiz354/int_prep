import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEventBus } from '../../../services/event-gateway/src/eventBus.mjs';
import { createPlatformServices } from '../src/platformServices.mjs';
import { createCompletionServices } from '../src/completionServices.mjs';

function services() {
  const platform = createPlatformServices({ events: new MemoryEventBus() });
  return createCompletionServices({ platform });
}

test('completion services expose all remaining fifty provider-ready feature adapters', () => {
  const completion = services();
  const overview = completion.overview();
  const features = overview.domains.flatMap((domain) => domain.features);
  assert.equal(overview.domains.length, 7);
  assert.equal(features.length, 50);
  assert.equal(new Set(features.map((feature) => feature.id)).size, 50);
});

test('completion actions return safe, reviewable local adapter records', () => {
  const completion = services();
  const ai = completion.run('ai-advanced', 'simulate-interviewer', { text: 'Candidate response' });
  const data = completion.run('data-platform', 'run-cdc-sync', {});
  const trust = completion.run('trust-risk', 'issue-media-access', { viewer: 'reviewer-1' });
  const delivery = completion.run('delivery-sre', 'generate-supply-chain-report', {});
  const enterprise = completion.run('enterprise-ecosystem', 'configure-ats-connector', { provider: 'Greenhouse' });

  assert.equal(ai.featureId, 'AI-02');
  assert.equal(ai.requiresHumanReview, true);
  assert.equal(data.featureId, 'DE-04');
  assert.equal(data.job.kind, 'cdc.capture');
  assert.equal(trust.result.download, false);
  assert.equal(delivery.result.signedArtifacts, true);
  assert.equal(enterprise.result.provider, 'Greenhouse');
});
