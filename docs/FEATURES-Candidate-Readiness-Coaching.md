# Feature Catalog — Candidate Readiness & Coaching

> **Prefix:** CR = Candidate Readiness  
> **Product boundary:** Preparation and development only; not a covert live-interview assistance product.

## A. Job Description Intelligence & Readiness Planning

| ID | Feature | Description | Phase |
|---|---|---|---|
| CR-01 | Authorized JD intake | Ingest employer-approved, candidate-uploaded, ATS-linked, or template job descriptions with source/permission metadata. | 1 |
| CR-02 | JD structure parser | Extract role, level, skills, tools, responsibilities, qualifications, location, and timeline in a reviewable structure. | 1 |
| CR-03 | Competency map | Convert the authorized JD into candidate-friendly competencies and observable evidence expectations. | 1 |
| CR-04 | Readiness gap map | Compare candidate-provided experience and goals against the competency map without making hiring predictions. | 1 |
| CR-05 | Experience-story inventory | Help candidates capture reusable STAR/CAR stories, projects, measurable outcomes, and evidence. | 1 |
| CR-06 | Candidate goals & constraints | Capture timeline, language, preferred coach mode, time budget, accessibility needs, and privacy choices. | 1 |
| CR-07 | Readiness baseline | Generate a self-assessment and optional practice baseline with candidate-visible assumptions. | 1 |
| CR-08 | Adaptive preparation plan | Create and update milestones, exercises, resources, and deadlines based on progress. | 1 |

## B. Learning & Preparation Experience

| ID | Feature | Description | Phase |
|---|---|---|---|
| CR-09 | Time-boxed planner | Calendar-aware weekly plan with reminders, pause/resume, and preparation deadlines. | 1 |
| CR-10 | Curated learning resources | Surface administrator-approved resources tied to role competency gaps. | 1 |
| CR-11 | Adaptive milestones | Adjust difficulty, pacing, and next steps from practice evidence and candidate feedback. | 1 |
| CR-12 | Practice resource library | Organize sample prompts, coding drills, cases, portfolios, and checklists by role family. | 1 |
| CR-13 | Accessibility accommodations | Support captions, reduced motion, keyboard paths, alternate format, language, and coach accommodation preferences. | 1 |
| CR-14 | Readiness reminders | Consent-aware reminders for milestones, booked sessions, incomplete tasks, and plan changes. | 1 |

## C. AI Coaching

| ID | Feature | Description | Phase |
|---|---|---|---|
| CR-15 | AI coach persona | Candidate-selectable coaching style with fixed safety, fairness, and preparation-only boundaries. | 1 |
| CR-16 | JD-grounded question generation | Generate practice questions only from approved role/rubric content and expose source references. | 1 |
| CR-17 | Multi-format mock practice | Behavioral, technical, system design, case, portfolio, and role-play practice modes. | 1–3 |
| CR-18 | Practice-only live coaching | Real-time hints and follow-ups in a clearly labelled mock session, disabled for live assessment rooms. | 1 |
| CR-19 | Evidence-linked feedback | Feedback on clarity, relevance, structure, technical evidence, and role fit evidence—not protected traits. | 1 |
| CR-20 | Storytelling coach | STAR/CAR narrative structure feedback, impact quantification, and concise-answer coaching. | 1 |
| CR-21 | Coding practice evaluator | Isolated coding practice with visible exercises, hidden tests, static analysis, and resource limits. | 3 |
| CR-22 | Resume & portfolio reviewer | Candidate-controlled feedback on clarity, role relevance, evidence, and presentation. | 2 |
| CR-23 | Knowledge-verification coach | Flags uncertain technical claims and suggests neutral research or follow-up questions. | 2 |
| CR-24 | AI-to-human handoff summary | Candidate-reviewable summary of goals, practice evidence, gaps, and preferences to share with a coach. | 2 |

## D. Human Coaching & Matching

| ID | Feature | Description | Phase |
|---|---|---|---|
| CR-25 | Coach profile & verification | Identity, credentials, specialties, languages, coaching policy acknowledgment, and conflict declaration. | 2 |
| CR-26 | Coach matching engine | Match role expertise, seniority, language, time zone, availability, access needs, and candidate preference. | 2 |
| CR-27 | Coaching mode choice | Candidate chooses AI-only, human-only, hybrid, or no coaching. | 1–2 |
| CR-28 | Coach availability & booking | Availability view, booking, reschedule, cancellation, timezone handling, and calendar sync. | 2 |
| CR-29 | Entitlements & payment policy | Enterprise-sponsored, self-paid, voucher, or program-quota access controls. | 4 |
| CR-30 | Secure coaching room | Video, chat, code, whiteboard, transcript, and shared materials for preparation sessions only. | 2 |
| CR-31 | Candidate-visible session notes | Coach notes are visible to the candidate by default, with controlled private operational notes. | 2 |
| CR-32 | Human action plan | Coach creates next steps, resources, milestones, and practice assignments. | 2 |
| CR-33 | Language & accommodation matching | Match candidate requirements with qualified multilingual/accessibility-aware coaches. | 2 |
| CR-34 | Conflict, safety & rematch workflow | Candidate can report an issue, request rematch, block a coach, or escalate safely. | 2 |

## E. Practice Workspace & Progress

| ID | Feature | Description | Phase |
|---|---|---|---|
| CR-35 | Separate preparation room | Practice rooms are technically and visually separate from hiring assessment rooms. | 1 |
| CR-36 | Practice recording/transcript consent | Granular candidate consent for recording, transcription, AI, and coach sharing. | 1 |
| CR-37 | Progress analytics | Candidate-visible practice trends, completed milestones, evidence coverage, and improvement history. | 2 |
| CR-38 | Candidate preparation portfolio | Candidate-owned collection of stories, practice artifacts, code, plans, and feedback. | 2 |
| CR-39 | Job-specific readiness report | Candidate-readable summary of preparedness, open practice areas, and next steps; never a hiring prediction. | 2 |
| CR-40 | Learning loop after interview | Candidate may add personal reflections after an interview without importing confidential employer evaluation data. | 3 |

## F. Trust, Governance & Operations

| ID | Feature | Description | Phase |
|---|---|---|---|
| CR-41 | Anti-cheating preparation boundary | Prevent live-assessment assistance, confidential-question leakage, and unauthorized employer-content use. | 1 |
| CR-42 | Candidate data controls | Consent, source permissions, retention, export, deletion, and candidate-sharing controls. | 1 |
| CR-43 | Employer/JD confidentiality controls | Tenant isolation, source approval, proprietary-content classification, and permission-filtered retrieval. | 1 |
| CR-44 | AI explainability & limitations | Explain sources, confidence, limitations, model version, and correction/escalation paths. | 1 |
| CR-45 | Coach quality & calibration | Coach training, feedback, calibration, quality review, and suspension workflows. | 3 |
| CR-46 | Human review & appeal | Candidate appeal for harmful/inaccurate AI feedback, coach issue, or content concern. | 2 |
| CR-47 | Program administration | Tenant settings, content approval, coach roster, entitlements, audit search, and usage metrics. | 4 |
| CR-48 | APIs, integrations & exports | Calendar, ATS/HRIS program integration, webhooks, candidate export, and secure reporting. | 4 |

## Feature traceability summary

| Release phase | Features | Primary outcome |
|---|---:|---|
| Phase 1 — AI Readiness MVP | CR-01 to CR-20, CR-27, CR-35, CR-36, CR-41 to CR-44 | Safe JD-grounded AI preparation with candidate controls |
| Phase 2 — Human Coaching | CR-21 to CR-26, CR-28, CR-30 to CR-34, CR-37 to CR-39, CR-46 | Verified human coaching and hybrid support |
| Phase 3 — Advanced Practice | CR-17, CR-21, CR-40, CR-45 | Rich practice modalities and quality calibration |
| Phase 4 — Enterprise Program | CR-29, CR-47, CR-48 | Sponsored programs, administration, integrations, and reporting |

## Feature completion rules

Do not mark a feature complete because its screen exists. Each feature must have:

1. A documented data source and ownership model.
2. Candidate consent and access behavior where personal data is involved.
3. A preparation-versus-live-assessment boundary.
4. Error, empty, accessibility, and privacy behavior.
5. UAT evidence mapped to `docs/UAT-Candidate-Readiness-Coaching.md`.
6. Honest labelling as local, provider-ready, or production deployed.
