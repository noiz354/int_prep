# Product Requirements Document — Candidate Readiness & Coaching

> **Product name (working):** SignalRoom Ready  
> **Status:** Separate bounded-context local MVP implemented — provider-backed Phase 1 completion still pending  
> **Audience:** Candidates, human coaches, talent teams, program administrators, and trust/compliance operators

## 1. Product vision

Help a candidate prepare effectively for a specific job description through a transparent, personalized pathway that can be led by an AI coach, a verified human coach, or a controlled hybrid handoff.

The product must improve readiness, confidence, clarity, and job-relevant practice. It must **not** promise an outcome, leak confidential employer interview content, provide live covert assistance during an assessment, or automate hiring decisions.

## 2. Problem statement

Candidates often receive a job description but lack a structured way to understand the required competencies, identify meaningful gaps, practice evidence-based answers, or find the right human expert. Existing generic preparation tools are not grounded in the target role, do not preserve context between AI and human support, and can create fairness or integrity concerns.

Hiring organizations also need a defensible approach when offering candidate preparation: the experience must be inclusive, consent-driven, privacy-safe, role-relevant, and clearly separated from the actual hiring evaluation.

## 3. Goals

1. Convert an authorized job description into an understandable competency map and preparation plan.
2. Let candidates choose AI-only, human-only, or hybrid coaching.
3. Match candidates to qualified human coaches based on role, discipline, language, availability, accessibility needs, and conflicts of interest.
4. Provide structured, role-relevant practice with evidence-linked feedback.
5. Preserve a strict boundary between preparation and live hiring assessment.
6. Give candidates ownership of their data, progress, consent choices, and preparation artifacts.
7. Give administrators safe controls, quality assurance, and outcome-neutral effectiveness metrics.

## 4. Non-goals

- Guaranteeing that a candidate will receive an interview, pass an interview, or receive an offer.
- Providing hidden real-time assistance during a live employer interview or assessment.
- Revealing confidential interview questions, scoring thresholds, hiring committee feedback, or other candidates’ information.
- Inferring protected characteristics or using emotion/integrity signals to judge employability.
- Replacing a licensed career counselor, immigration advisor, legal advisor, or mental-health professional.

## 5. Personas

| Persona | Needs | Primary value |
|---|---|---|
| Candidate | Understand a role, prepare efficiently, practice safely, find support | Personal plan, realistic practice, choice of AI/human help |
| Human coach | Deliver structured, ethical preparation | Qualified matching, schedule, session tools, action plans |
| Employer/talent program admin | Offer preparation without compromising fairness or assessment integrity | Approved content, governance, aggregate reporting |
| Coach operations lead | Maintain coach quality and safety | Verification, calibration, feedback, incident workflows |
| Trust/compliance operator | Protect candidate and employer data | Consent, retention, access, audit, boundary controls |

## 6. Core user journeys

### Journey A — AI-first preparation

1. Candidate imports or selects an authorized job description.
2. The system explains the role, competencies, level, and evidence expected.
3. Candidate enters goals, timeline, experience, language, and accessibility preferences.
4. AI creates a preparation plan and mock-practice sequence grounded only in approved materials.
5. Candidate practices, receives evidence-linked feedback, and tracks progress.
6. Candidate may request a human coach at any point.

### Journey B — Human-coach preparation

1. Candidate completes a readiness baseline.
2. Matching service recommends verified coaches and explains why each match is suitable.
3. Candidate selects a coach, books a session, gives consent, and attends a preparation session.
4. Coach records candidate-visible notes, action plan, and optional practice feedback.
5. Candidate owns the resulting preparation artifacts and can continue with AI practice.

### Journey C — Hybrid handoff

1. AI prepares a concise candidate-controlled handoff summary.
2. Candidate reviews and chooses what to share with the human coach.
3. Coach receives only approved information, not private employer evaluation data.
4. Human coach continues from the plan and writes an updated action plan.
5. Candidate returns to AI practice with the coach-approved goals.

## 7. Functional requirements

### 7.1 Job-description understanding

- Accept job descriptions from approved employer content, candidate upload, ATS link, or administrator-created template.
- Classify the source and permission level before processing.
- Extract role title, level, required competencies, preferred skills, responsibilities, tools, location/time-zone constraints, and interview stages when authorized.
- Explain role requirements in candidate-friendly language.
- Flag missing, ambiguous, discriminatory, or inconsistent job-description language for administrator review.

### 7.2 Personalized readiness plan

- Capture candidate goals, target date, current experience, self-assessed confidence, language, time budget, and accessibility preferences.
- Generate milestones, practice modules, resource recommendations, and time-boxed study plans.
- Adapt the plan based on practice outcomes and candidate feedback.
- Let candidates edit, pause, reset, export, and delete their plan.

### 7.3 AI coaching

- Generate only role-relevant practice questions grounded in approved job/rubric materials.
- Support behavioral, technical, system design, case, portfolio, and coding-practice modes.
- Give actionable feedback tied to observable evidence, not personality or protected traits.
- Provide a clear explanation, confidence level, source/rubric reference, and next practice step.
- Detect low-confidence scenarios and route the candidate to a human coach or administrator-approved resource.
- Keep AI coaching visibly labelled as preparation-only.

### 7.4 Human coaching and matching

- Verify coach identity, background, certifications, languages, specialties, and conflict-of-interest declarations.
- Match candidates by role/domain expertise, seniority, language, time zone, accessibility needs, availability, and candidate preferences.
- Explain matching factors and allow candidate choice or rematch.
- Support AI-only, human-only, and hybrid sessions.
- Provide booking, calendar synchronization, session reminders, secure preparation room, notes, feedback, and action-plan workflows.
- Prevent coaches from accessing confidential employer evaluation data unless explicitly authorized and disclosed.

### 7.5 Practice workspace

- Provide a practice-only room that is visually and technically distinct from a real interview room.
- Support mock interview video, transcript, captions, screen share, whiteboard, coding task, portfolio walkthrough, and time-boxed prompts where enabled.
- Make recording/transcription optional and consent-driven.
- Store practice artifacts separately from hiring evaluation artifacts.
- Allow candidates to download, delete, or selectively share their preparation artifacts.

### 7.6 Trust, fairness, and safety

- Enforce a preparation-versus-assessment boundary.
- Show clear notices that no coaching tool may be used covertly during a real employer assessment.
- Prevent employer-specific confidential questions or scoring criteria from entering the preparation corpus without authorization.
- Provide reporting/appeal paths for unsafe coach behavior, biased content, inaccurate AI feedback, data misuse, or conflict concerns.
- Retain auditable records of access, consent, source approval, coach matching, AI version, and overrides.

## 8. Success metrics

### Candidate metrics

- Job description to readiness-plan completion rate
- Practice session completion rate
- Candidate-reported clarity and confidence change
- Human coach satisfaction and rematch rate
- Accessibility accommodation fulfillment rate
- Candidate data export/deletion completion rate

### Quality and trust metrics

- Grounded AI feedback rate
- Low-confidence escalation rate
- Coach verification and calibration completion rate
- Boundary violation rate
- Consent capture and withdrawal propagation rate
- Cross-tenant/data-access incident count

### Business/program metrics

- Time from job selection to first practice session
- Candidate plan completion by role family
- Coach utilization and availability coverage
- Aggregate, outcome-neutral candidate experience score

Do not use offer rate, rejection rate, sentiment, protected traits, or integrity signals as standalone success metrics for coaching quality.

## 9. Phased release scope

| Phase | Scope | Exit outcome |
|---|---|---|
| Phase 1 — AI Readiness MVP | Authorized JD intake, competency map, readiness plan, AI mock practice, feedback, consent, preparation boundary | Candidate can prepare safely with AI for one role family |
| Phase 2 — Human Coaching | Coach verification, matching, booking, hybrid handoff, secure coaching room, coach notes/action plan | Candidate can choose and work with an appropriate verified human coach |
| Phase 3 — Advanced Practice | Coding/portfolio/case practice, progress analytics, multilingual support, accommodations, integrations | Multi-format, inclusive readiness program |
| Phase 4 — Enterprise Program | ATS/HRIS integration, employer program controls, billing/entitlements, quality calibration, aggregate reporting | Governed multi-tenant coaching program |

## 10. High-level integration model

SignalRoom Ready extends the existing platform but keeps data boundaries distinct:

- **Candidate Readiness domain:** candidate-owned preparation plan, practice artifacts, coaching preferences, and consent.
- **Hiring Evaluation domain:** recruiter/interviewer scorecards, live assessment artifacts, and hiring decisions.
- No default data flow from candidate readiness into hiring evaluation.
- Any optional candidate-shared readiness artifact must be explicit, granular, revocable where legally possible, and auditable.

## 11. Acceptance principles

A feature is considered ready for UAT only if it:

1. Is grounded in authorized role materials.
2. Preserves consent, access, tenant, and retention controls.
3. Provides candidate-visible explanation and correction paths.
4. Does not create a hidden live-assessment assistance route.
5. Has test coverage for success, error, permission, privacy, and accessibility states.
6. Is honestly labelled as AI-assisted, human-led, local adapter, or provider-backed.
