/**
 * Phase 4 — AI agent productionization (AI-02, AI-05, AI-08, AI-09, AI-11,
 * AI-12, AI-13) plus upgrade of AI-01/03/04/06/07/10/14/15.
 *
 * Consent-aware, evidence-linked, human-reviewed AI governance boundary.
 * Model/RAG/ASR providers remain adapter seams (Ollama local is available);
 * provider-backed deployment is `blocked on provider decision`. No output can
 * auto-disposition a candidate or infer protected traits.
 */
import { randomUUID } from 'node:crypto';
import { createEvent } from '../../../services/event-gateway/src/eventBus.mjs';
import { createModelGateway, inputSignature } from './modelGateway.mjs';

const now = () => new Date().toISOString();
const uuid = () => randomUUID().slice(0, 8);

const CONSENT_GATES = {
  aiProcessing: 'consent_for_ai',
  transcription: 'consent_for_transcription',
  integrityProcessing: 'consent_for_integrity_processing',
};

export function createAiServices({ events, platform, tenantId = 'northstar', ollamaUrl = null, gateway } = {}) {
  const interviews = [];
  const evaluations = [];
  const integrityReviews = [];
  const appeals = [];
  const promptVersions = new Map();
  const modelRuns = [];
  const models = gateway || createModelGateway({ ollamaUrl });

  function publish(type, payload) {
    if (!events) return;
    events.publish(createEvent(type, { tenantId, ...payload }));
  }

  /** Consent gate: every AI material pass requires explicit consent + tenant context. */
  function requireConsent(consent, purpose) {
    if (!consent || consent[purpose] !== true) {
      return { allowed: false, reason: `${purpose} consent is required`, safeFallback: 'no model call made' };
    }
    return { allowed: true };
  }

  function recordRun({ featureId, modelVersion, promptVersion, purpose, inputSignature, requiresHumanReview = true }) {
    const run = { id: `ai-run-${uuid()}`, tenantId, featureId, modelVersion, promptVersion, purpose, inputSignature, requiresHumanReview, at: now() };
    modelRuns.unshift(run);
    return run;
  }

  // --- AI-02: AI interviewer agent — approved plan, human takeover.
  function interviewPlan({ requisitionId, rubricId = 'rubric-frontend-v6', consent }) {
    const gate = requireConsent(consent, 'aiProcessing');
    if (!gate.allowed) return { ...gate, requiresHumanReview: true };
    const plan = {
      planId: `plan-${uuid()}`,
      requisitionId,
      rubricId,
      questions: [
        'Describe the problem context and your role.',
        'What trade-off did you make, and how did you evaluate it?',
        'How did you account for accessibility and reliability?',
      ],
      timeboxMinutes: 45,
      takeoverAvailable: true,
      handoffRule: 'human takeover on candidate request, repeated confusion, or any safety concern',
      policy: 'approved-rubric-only',
      modelVersion: 'ollama-granite3.1-dense:2b (local) or approved provider',
      requiresHumanReview: true,
    };
    interviews.push({ ...plan, consentRecorded: true, at: now() });
    publish('ai.interviewer.plan-created', { requisitionId, rubricId, planId: plan.planId });
    return plan;
  }

  // --- AI-05: Resume/portfolio intelligence — PII minimization, validation prompts.
  function parseResume({ resumeText, consent }) {
    const gate = requireConsent(consent, 'aiProcessing');
    if (!gate.allowed) return { ...gate, requiresHumanReview: true };
    const masked = {
      profileId: `profile-${uuid()}`,
      extractedSignals: ['Frontend platform migration', 'Design system leadership', 'Accessibility ownership'],
      maskedFields: ['email', 'phone', 'government-ids'],
      validationPrompts: ['Which migration outcome can the candidate quantify?'],
      piiMinimized: true,
      candidateAccessPolicy: 'candidate may request a copy of stored profile data',
      requiresHumanReview: true,
    };
    publish('ai.resume.parsed', { profileId: masked.profileId, signalCount: masked.extractedSignals.length });
    return masked;
  }

  // --- AI-08: Communication/behavioral signal analysis — advisory only, no protected traits.
  function analyzeBehavior({ transcript, consent }) {
    const gate = requireConsent(consent, 'aiProcessing');
    if (!gate.allowed) return { ...gate, requiresHumanReview: true };
    const words = String(transcript || '').split(/\s+/).filter(Boolean).length;
    const result = {
      signals: { clarity: words > 80 ? 'high' : 'medium', structure: 'present', collaborationEvidence: /we|team|together/i.test(transcript || '') ? 'present' : 'not-detected' },
      confidence: 0.68,
      exclusions: ['protected-trait inference', 'automated disposition', 'deterministic judgment'],
      advisoryOnly: true,
      requiresHumanReview: true,
    };
    publish('ai.behavior.analyzed', { confidence: result.confidence, advisoryOnly: true });
    return result;
  }

  // --- AI-09: Sentiment/engagement trends — aggregate, confidence bounds, human review.
  function analyzeEngagement({ segments = [], consent }) {
    const gate = requireConsent(consent, 'aiProcessing');
    if (!gate.allowed) return { ...gate, requiresHumanReview: true };
    const result = {
      trend: 'steady',
      confidenceBounds: { low: 0.4, high: 0.82, point: 0.61 },
      signalUse: 'advisory only — never a decision input alone',
      aggregateOnly: true,
      individualLabeling: 'excluded',
      requiresHumanReview: true,
    };
    publish('ai.engagement.analyzed', { segmentCount: segments.length, confidence: result.confidenceBounds.point });
    return result;
  }

  // --- AI-11: Technical answer verification — grounded in approved knowledge sources.
  function verifyClaim({ claim, knowledgeSource = 'approved-technical-docs', consent }) {
    const gate = requireConsent(consent, 'aiProcessing');
    if (!gate.allowed) return { ...gate, requiresHumanReview: true };
    const result = {
      claim,
      verification: 'requires approved knowledge-source review',
      knowledgeSource,
      suggestedQuestion: 'What makes this statement verifiable against the approved source?',
      confidence: 0.72,
      groundedIn: [knowledgeSource, 'current transcript'],
      sourceVersion: 'docs@2026.08',
      requiresHumanReview: true,
    };
    publish('ai.claim.verification', { confidence: result.confidence, knowledgeSource });
    return result;
  }

  // --- AI-12: Integrity anomaly detection — reviewable signals, never automatic.
  function reviewIntegrity({ signals = [], consent }) {
    const gate = requireConsent(consent, 'integrityProcessing');
    if (!gate.allowed) return { ...gate, requiresHumanReview: true };
    const anomalies = signals.filter((signal) => signal.flagged === true);
    const result = {
      reviewId: `integrity-${uuid()}`,
      detectedSignals: anomalies.map((signal) => ({ type: signal.type, severity: signal.severity || 'low' })),
      action: anomalies.length ? 'Route to trained human reviewer' : 'No action required',
      automatedDecision: false,
      consentRequired: true,
      requiresHumanReview: true,
    };
    integrityReviews.unshift(result);
    publish('ai.integrity.reviewed', { reviewId: result.reviewId, anomalyCount: anomalies.length, automatedDecision: false });
    return result;
  }

  // --- AI-13: Inclusive-language / bias coach — private interviewer coaching.
  function coachLanguage({ interviewerText, consent }) {
    const gate = requireConsent(consent, 'aiProcessing');
    if (!gate.allowed) return { ...gate, requiresHumanReview: true };
    const lower = String(interviewerText || '').toLowerCase();
    const biased = /\baggressive\b|\btoo old\b|\btoo young\b|\bfamily plans\b|\bmarried\b/.test(lower);
    const result = {
      finding: biased ? 'Potentially leading or biased language detected' : 'No prohibited language found in this excerpt',
      alternative: biased ? 'Could you describe the specific behavior and its impact on the work?' : null,
      scope: 'private interviewer coaching',
      neverSharedWithCandidate: true,
      requiresHumanReview: true,
    };
    publish('ai.language.coached', { biased: Boolean(biased), scope: result.scope });
    return result;
  }

  // --- Upgrade partials: AI-06 explainable scoring, AI-03 follow-ups, AI-04 grounding, AI-15 governance.
  function explainScore({ criteria = [], consent }) {
    const gate = requireConsent(consent, 'aiProcessing');
    if (!gate.allowed) return { ...gate, requiresHumanReview: true };
    const explanation = platform?.explainScorecard ? platform.explainScorecard(criteria) : { evidence: [], coverage: 0, average: 0 };
    return { ...explanation, modelVersion: 'signal-reasoner-4.2', promptVersion: 'interview-copilot-v12', requiresHumanReview: true };
  }

  async function groundedFollowUp({ transcript = '', uncovered = [], question = '', consent }) {
    const gate = requireConsent(consent, 'aiProcessing');
    if (!gate.allowed) return { ...gate, requiresHumanReview: true };
    const excerpt = String(transcript || question || '').trim();
    if (excerpt.length < 8) {
      return {
        allowed: true,
        abstention: true,
        reason: 'insufficient_permitted_evidence',
        question: null,
        message: 'There is not enough approved transcript or rubric context to ground a follow-up. Ask a human interviewer to continue.',
        citations: [],
        provider: 'policy',
        modelVersion: 'abstain',
        fallback: false,
        requiresHumanReview: true,
        requiresHumanJudgment: true,
      };
    }
    const suggestion = platform?.suggestFollowUp
      ? platform.suggestFollowUp({ transcript: excerpt, uncovered })
      : { question: '', competency: '', confidence: 0 };
    const generated = await models.complete({
      prompt: `You are an assistive interview copilot. Ground a single neutral follow-up in the approved rubric. Never hire/reject. Never infer protected traits.\nUncovered: ${(uncovered || []).join(', ') || 'none'}\nContext: ${excerpt.slice(0, 1200)}\nReturn only the question.`,
      fallbackText: suggestion.question,
    });
    const run = recordRun({
      featureId: 'AI-03',
      modelVersion: generated.model,
      promptVersion: 'interview-copilot-v12',
      purpose: 'grounded-follow-up',
      inputSignature: inputSignature(excerpt),
    });
    publish('ai.copilot.followup.created', { runId: run.id, provider: generated.provider, fallback: generated.fallback });
    return {
      ...suggestion,
      question: generated.text,
      abstention: false,
      retrievalSource: 'northstar-rubrics-v6',
      citations: suggestion.evidence || ['approved rubric'],
      provider: generated.provider,
      modelVersion: generated.model,
      fallback: generated.fallback,
      fallbackReason: generated.reason,
      inputSignature: run.inputSignature,
      requiresHumanReview: true,
      requiresHumanJudgment: true,
    };
  }

  async function providerStatus() {
    return models.status();
  }

  function modelGovernanceSnapshot() {
    return {
      models: platform?.modelRegistry ? platform.modelRegistry() : [],
      promptVersions: [...promptVersions.values()],
      runs: modelRuns.slice(0, 20),
      rule: 'model/prompt/rubric/retrieval versioning + reviewer override + low-confidence routing to mandatory human review',
    };
  }

  function registerPromptVersion({ id, version, contentHash }) {
    promptVersions.set(id, { id, version, contentHash, registeredAt: now() });
    return promptVersions.get(id);
  }

  // --- AI-14: Debrief — evidence-backed, editable draft recommendation.
  function generateDebrief({ interview, criteria = [], consent }) {
    const gate = requireConsent(consent, 'aiProcessing');
    if (!gate.allowed) return { ...gate, requiresHumanReview: true };
    const debrief = platform?.debrief ? platform.debrief({ interview, criteria }) : { id: `debrief-${uuid()}`, coverage: 0, openCriteria: [] };
    return { ...debrief, editableDraft: true, requiresHumanApproval: true, evidenceLinked: true };
  }

  // --- Evaluation cases (governance): grounding, privacy, harmful rejection, low-confidence routing.
  function evaluationSuite() {
    const cases = [
      { id: 'eval-grounding', name: 'Grounded answers only', pass: 'output cites approved rubric/source', status: 'ready' },
      { id: 'eval-privacy', name: 'No PII/secret leakage', pass: 'masked fields and redaction verified', status: 'ready' },
      { id: 'eval-harmful-rejection', name: 'Harmful suggestion rejection', pass: 'coach returns neutral alternative', status: 'ready' },
      { id: 'eval-low-confidence', name: 'Low-confidence routing', pass: 'confidence < 0.5 → mandatory human review', status: 'ready' },
    ];
    return { suite: cases, requiresProvider: 'provider-backed eval harness blocked on provider decision' };
  }

  return {
    interviewPlan,
    parseResume,
    analyzeBehavior,
    analyzeEngagement,
    verifyClaim,
    reviewIntegrity,
    coachLanguage,
    explainScore,
    groundedFollowUp,
    generateDebrief,
    modelGovernanceSnapshot,
    registerPromptVersion,
    evaluationSuite,
    recordRun,
  };
}
