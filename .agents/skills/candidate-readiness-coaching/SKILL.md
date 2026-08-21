---
name: candidate-readiness-coaching
description: Build or review the separate SignalRoom Ready candidate preparation and AI/human coaching bounded context.
---

# Candidate Readiness & Coaching

Use this skill for any work under `candidate-readiness/`, `apps/candidate-readiness-web/`, `services/candidate-readiness-api/`, `services/candidate-coaching-ai/`, or `packages/candidate-readiness-domain/`.

## Read first

1. `docs/PRD-Candidate-Readiness-Coaching.md`
2. `docs/FEATURES-Candidate-Readiness-Coaching.md`
3. `docs/UAT-Candidate-Readiness-Coaching.md`
4. `candidate-readiness/AGENTS.md`

## Core boundary

This product helps a candidate prepare. It is not an employer assessment product and must not provide covert live-interview assistance.

- Reject `live_assessment` context in every API and AI path.
- Keep preparation data separate from hiring evaluation data.
- Require explicit, granular, time-stamped candidate approval before sharing a handoff with a human coach.
- Never expose employer scorecards, confidential interview questions, hiring thresholds, or other candidates' data.
- Do not guarantee outcomes or produce automated employability/hire/no-hire judgments.

## AI requirements

- Require AI preparation consent and tenant context.
- Ground prompts in authorized JD/rubric sources and return source/version, confidence, limitations, and review requirements.
- Do not infer protected traits, score personality, or present integrity/sentiment as deterministic.
- Send low-confidence, harmful, or disputed feedback to a human review/resource path.
- Keep model keys, raw transcripts, and private candidate data out of browser code and logs.

## Human coach requirements

- Require verified coach status, same-tenant access, conflict checks, and candidate choice.
- Match transparently by expertise, language, time zone, accessibility, and availability.
- Make preparation notes candidate-visible by default; separate operational notes clearly.
- Support rematch, block, report, escalation, quality calibration, and appeal workflows.

## Completion criteria

Before marking a CR feature complete:

1. Map it to the PRD feature ID and at least one UAT scenario.
2. Implement consent, access, retention, privacy, and preparation-boundary behavior.
3. Exercise success, error, permission, live-assessment denial, and accessibility paths.
4. Update the relevant PRD/UAT/status documentation.
5. Run targeted tests, full tests, build, and dependency audit when packages change.
