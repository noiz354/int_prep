import test from 'node:test';
import assert from 'node:assert/strict';
import { MemoryEventBus } from '../../../services/event-gateway/src/eventBus.mjs';
import { createAiServices } from '../src/aiServices.mjs';
import { createPlatformServices } from '../src/platformServices.mjs';

const tenantId = 'northstar';

function makeHarness() {
  const events = new MemoryEventBus();
  const platform = createPlatformServices({ events });
  const services = createAiServices({ events, platform, tenantId });
  return { events, services };
}

const consent = { aiProcessing: true, transcription: true, integrityProcessing: true };

test('consent gate blocks every AI material pass without explicit consent', () => {
  const { services } = makeHarness();
  const blockedPlan = services.interviewPlan({ requisitionId: 'req-1', consent: { aiProcessing: false } });
  assert.equal(blockedPlan.allowed, false);
  assert.equal(blockedPlan.safeFallback, 'no model call made');
  const blockedIntegrity = services.reviewIntegrity({ signals: [], consent: { integrityProcessing: false } });
  assert.equal(blockedIntegrity.allowed, false);
  assert.equal(blockedIntegrity.requiresHumanReview, true);
});

test('AI-02 interviewer plan is rubric-grounded with human takeover and no auto-disposition', () => {
  const { services, events } = makeHarness();
  const plan = services.interviewPlan({ requisitionId: 'req-frontend-2026', consent });
  assert.equal(plan.policy, 'approved-rubric-only');
  assert.equal(plan.takeoverAvailable, true);
  assert.match(plan.handoffRule, /human takeover/);
  assert.equal(plan.requiresHumanReview, true);
  assert.ok(events.list({ tenantId }).map((e) => e.type).includes('ai.interviewer.plan-created'));
});

test('AI-05 resume intelligence minimizes PII and returns validation prompts', () => {
  const { services } = makeHarness();
  const profile = services.parseResume({ resumeText: 'Alex Morgan, alex@example.test', consent });
  assert.equal(profile.piiMinimized, true);
  assert.ok(profile.maskedFields.includes('email'));
  assert.ok(profile.maskedFields.includes('phone'));
  assert.ok(profile.validationPrompts.length > 0);
  assert.equal(profile.requiresHumanReview, true);
});

test('AI-08 behavior analysis is advisory and excludes protected-trait inference', () => {
  const { services } = makeHarness();
  const result = services.analyzeBehavior({ transcript: 'We designed the system together and shipped it.', consent });
  assert.equal(result.advisoryOnly, true);
  assert.ok(result.exclusions.includes('protected-trait inference'));
  assert.ok(result.exclusions.includes('automated disposition'));
  assert.equal(result.requiresHumanReview, true);
});

test('AI-09 engagement trends are aggregate with confidence bounds, never individual labeling', () => {
  const { services } = makeHarness();
  const result = services.analyzeEngagement({ segments: [{ text: 'ok' }], consent });
  assert.equal(result.aggregateOnly, true);
  assert.ok(result.confidenceBounds.low < result.confidenceBounds.high);
  assert.equal(result.individualLabeling, 'excluded');
  assert.equal(result.signalUse, 'advisory only — never a decision input alone');
});

test('AI-11 claim verification is grounded in approved sources with suggested questions', () => {
  const { services } = makeHarness();
  const result = services.verifyClaim({ claim: 'Offline edits use idempotency keys.', consent });
  assert.ok(result.groundedIn.includes('approved-technical-docs'));
  assert.ok(result.suggestedQuestion.length > 10);
  assert.equal(result.requiresHumanReview, true);
});

test('AI-12 integrity review is reviewable, never automatic, and consent-gated', () => {
  const { services } = makeHarness();
  const flagged = services.reviewIntegrity({ signals: [{ type: 'copy-paste-burst', flagged: true }], consent });
  assert.equal(flagged.automatedDecision, false);
  assert.equal(flagged.detectedSignals.length, 1);
  assert.match(flagged.action, /human reviewer/);
  assert.equal(flagged.requiresHumanReview, true);
  const clean = services.reviewIntegrity({ signals: [{ type: 'latency', flagged: false }], consent });
  assert.equal(clean.detectedSignals.length, 0);
  assert.equal(clean.action, 'No action required');
});

test('AI-13 inclusive-language coach is private, never shared with candidate', () => {
  const { services } = makeHarness();
  const biased = services.coachLanguage({ interviewerText: 'The candidate seems too aggressive.', consent });
  assert.equal(biased.scope, 'private interviewer coaching');
  assert.equal(biased.neverSharedWithCandidate, true);
  assert.ok(biased.alternative);
  const clean = services.coachLanguage({ interviewerText: 'Can you describe how you handled the outage?', consent });
  assert.equal(clean.finding, 'No prohibited language found in this excerpt');
});

test('upgraded partials: explainable scoring, grounded follow-up, debrief, model governance', () => {
  const { services } = makeHarness();
  const criteria = [{ id: 'a11y', label: 'Accessibility mindset', weight: 20, score: 4, evidence: 'WCAG fixes shipped' }];
  const score = services.explainScore({ criteria, consent });
  assert.equal(score.requiresHumanReview, true);
  assert.ok(score.evidence.length > 0);
  const followUp = services.groundedFollowUp({ transcript: 'The candidate described an offline network queue.', uncovered: ['Accessibility mindset'], consent });
  assert.ok(followUp.question.length > 10);
  assert.equal(followUp.retrievalSource, 'northstar-rubrics-v6');
  const debrief = services.generateDebrief({ interview: { id: 'int-2048', candidateName: 'Alex Morgan' }, criteria, consent });
  assert.equal(debrief.requiresHumanApproval, true);
  assert.equal(debrief.editableDraft, true);
  const governance = services.modelGovernanceSnapshot();
  assert.ok(governance.models.length > 0);
});

test('evaluation suite covers grounding, privacy, harmful rejection, and low-confidence routing', () => {
  const { services } = makeHarness();
  const suite = services.evaluationSuite();
  const ids = suite.suite.map((c) => c.id);
  assert.ok(ids.includes('eval-grounding'));
  assert.ok(ids.includes('eval-privacy'));
  assert.ok(ids.includes('eval-harmful-rejection'));
  assert.ok(ids.includes('eval-low-confidence'));
  assert.match(suite.requiresProvider, /blocked on provider decision/);
});

test('prompt/model versioning is registered and auditable', () => {
  const { services, events } = makeHarness();
  services.registerPromptVersion({ id: 'interview-copilot-v13', version: '13', contentHash: 'sha256:abc123' });
  const governance = services.modelGovernanceSnapshot();
  assert.equal(governance.promptVersions.length, 1);
  assert.equal(governance.promptVersions[0].id, 'interview-copilot-v13');
  const run = services.recordRun({ featureId: 'AI-07', modelVersion: '4.3', promptVersion: 'v13', purpose: 'follow-up' });
  assert.equal(run.requiresHumanReview, true);
  assert.ok(events);
});
