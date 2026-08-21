import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEventBus } from '../../../services/event-gateway/src/eventBus.mjs';
import { assertInterviewTransition, createPlatformServices } from '../src/platformServices.mjs';

test('workflow controls enforce valid lifecycle transitions', () => {
  assert.doesNotThrow(() => assertInterviewTransition('scheduled', 'checked_in'));
  assert.throws(() => assertInterviewTransition('scheduled', 'decision'), /Invalid interview transition/);
});

test('AI, code, and data-control adapters return reviewable local results', () => {
  const services = createPlatformServices({ events: new MemoryEventBus() });
  const followUp = services.suggestFollowUp({ transcript: 'The candidate described an offline network queue.', uncovered: ['Accessibility mindset'] });
  const evaluation = services.evaluateCode({ language: 'javascript', code: 'function merge(items) { const byId = new Map(); if (!items) return []; return items; }' });
  const contract = services.validateSchema({ name: 'media.telemetry.v2', payload: { tenantId: 'northstar', interviewId: 'int-2048', latencyMs: 32, packetLoss: 0 } });
  const invalidContract = services.validateSchema({ name: 'media.telemetry.v2', payload: { tenantId: 'northstar' } });

  assert.equal(followUp.requiresHumanJudgment, true);
  assert.equal(followUp.competency, 'Accessibility mindset');
  assert.ok(evaluation.score >= 50);
  assert.equal(contract.valid, true);
  assert.equal(invalidContract.valid, false);
});

test('privacy and operational actions create inspectable local work', () => {
  const services = createPlatformServices({ events: new MemoryEventBus() });
  const deletion = services.requestDeletion({ interviewId: 'int-2048' });
  const redaction = services.redact('Email alex@example.test or call +62 812 5555 1000');
  const encrypted = services.envelopeEncrypt({ reference: 'vault://artifact' });

  assert.equal(deletion.kind, 'privacy.deletion-orchestration');
  assert.match(redaction.redacted, /REDACTED_EMAIL/);
  assert.match(redaction.redacted, /REDACTED_PHONE/);
  assert.equal(encrypted.algorithm, 'AES-256-GCM');
  assert.equal(services.jobs().length, 1);
});
