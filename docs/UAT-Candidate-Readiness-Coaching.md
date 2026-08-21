# UAT Plan — Candidate Readiness & Coaching

> **Product:** SignalRoom Ready  
> **Scope:** Candidate preparation with AI, verified human coaches, or hybrid handoff  
> **Purpose:** Validate usefulness, safety, privacy, accessibility, and the preparation-versus-assessment boundary before release.

## 1. UAT objectives

1. Confirm candidates can understand an authorized job description and create a personalized plan.
2. Confirm AI practice is relevant, grounded, explainable, and clearly limited to preparation.
3. Confirm human coach pairing is transparent, safe, and practical.
4. Confirm candidate data, consent, accessibility, and employer confidentiality controls work as designed.
5. Confirm no workflow enables covert live-assessment assistance or hiring-decision automation.

## 2. UAT roles

| Role | Responsibilities |
|---|---|
| Candidate tester | Creates plans, practices, books coaches, reviews feedback, exercises privacy controls |
| Verified coach tester | Sets profile, availability, runs coaching session, creates action plan, handles candidate visibility |
| Talent program admin | Approves JD/source, manages coach roster, views aggregate program data |
| Trust/compliance tester | Tests consent, tenant isolation, retention, appeal, confidentiality, and audit behavior |
| Accessibility tester | Tests keyboard, screen reader, captions, contrast, reduced motion, language, and accommodation flows |
| Engineering observer | Captures defects, telemetry, performance, and integration failures |

## 3. Test environment and data

- Use synthetic candidates, synthetic resumes, synthetic job descriptions, and test coach profiles.
- Do not use real candidate data, confidential interview questions, live employer scorecards, or production credentials.
- Configure one candidate tenant, one employer program tenant, and one coach operations tenant.
- Use test integrations only for calendar, email, video, AI, storage, and identity providers.
- Capture test evidence in a restricted UAT folder with defect IDs and screenshots/logs where permitted.

## 4. Entry criteria

- Approved JD source/permission policy is configured.
- AI provider/model, prompt, retrieval collection, and human-review policy are identified for test use.
- Coach verification criteria and conflict-of-interest policy are approved.
- Candidate privacy notice, consent text, retention, and deletion behavior are reviewed.
- Accessibility baseline is available.
- No P0 security, tenant-isolation, or authentication defects are open.

## 5. UAT scenarios

| UAT ID | Persona | Scenario | Expected result | Priority |
|---|---|---|---|---|
| UAT-01 | Candidate | Select an approved JD and create a readiness plan | Role/competency map is clear, candidate can edit goals and plan | P0 |
| UAT-02 | Candidate | Upload an unapproved/confidential JD | System requests source approval or blocks processing; no corpus leakage | P0 |
| UAT-03 | Candidate | Review JD parser output | Candidate sees role, level, skills, responsibilities, and ambiguities with correction path | P1 |
| UAT-04 | Candidate | Enter time budget, language, and access needs | Plan adapts without exposing sensitive preferences to unauthorized users | P0 |
| UAT-05 | Candidate | Start AI mock behavioral practice | Questions are grounded in approved JD/rubric and labelled as preparation-only | P0 |
| UAT-06 | Candidate | Receive AI feedback | Feedback cites observable evidence, sources, confidence, and next step; no protected-trait claim | P0 |
| UAT-07 | Candidate | Ask AI for help during a simulated live employer interview | System refuses covert/live-assessment assistance and explains the boundary | P0 |
| UAT-08 | Candidate | Run a coding-practice task | Code runs only in isolated test environment; resource limits and hidden-test behavior are visible | P0 |
| UAT-09 | Candidate | Request a human coach | Candidate sees suitable coach matches, matching rationale, language, availability, and rematch option | P0 |
| UAT-10 | Candidate | Choose AI-only, human-only, and hybrid modes | Candidate can change mode; consent and sharing controls are clear | P1 |
| UAT-11 | Candidate | Share AI handoff summary with coach | Candidate selects exactly what is shared; coach sees no hidden employer evaluation data | P0 |
| UAT-12 | Coach | Create a coach profile and availability | Verification, specialties, languages, conflicts, and capacity are validated | P0 |
| UAT-13 | Coach | Run a practice session and write notes | Candidate-visible notes/action plan are saved; private operational notes are clearly separated | P0 |
| UAT-14 | Candidate | Report coach conflict or request rematch | Candidate can safely report, block, or rematch; escalation is audit logged | P0 |
| UAT-15 | Candidate | Enable captions, keyboard navigation, reduced motion, and accommodation settings | Experience remains usable and settings persist appropriately | P0 |
| UAT-16 | Candidate | Consent to transcript/recording/AI, then withdraw optional consent | Processing changes propagate; candidate receives clear impact explanation | P0 |
| UAT-17 | Trust tester | Attempt cross-tenant access to JD, plan, coach note, or artifact | Access is denied, logged, and no data is returned | P0 |
| UAT-18 | Trust tester | Request export and deletion of preparation data | Export/deletion follows policy, derived artifacts are included, and result is auditable | P0 |
| UAT-19 | Admin | Review JD source approval and proprietary-content classification | Admin can approve/reject content and see source/audit lineage | P1 |
| UAT-20 | Admin | View aggregate program metrics | Metrics are tenant-safe and outcome-neutral; no individual hiring decision data leaks | P1 |
| UAT-21 | AI reviewer | Force a low-confidence or unsupported AI response | System identifies uncertainty and routes to human/resource fallback | P0 |
| UAT-22 | AI reviewer | Test bias/integrity/sentiment edge cases | System uses advisory language, no automatic employability outcome, escalation is human-reviewed | P0 |
| UAT-23 | Engineer | Simulate provider timeout, calendar failure, and reconnect | Candidate sees safe retry/fallback behavior; no loss of consent or plan state | P1 |
| UAT-24 | Coach operations | Review coach quality/calibration workflow | Feedback, training, suspension, and appeal paths are traceable | P1 |
| UAT-25 | Security tester | Attempt token, URL, transcript, or recording access outside permission | Access is rejected; secrets and sensitive artifacts are not exposed | P0 |
| UAT-26 | Candidate | Complete post-practice readiness report | Report is candidate-readable, action-oriented, and explicitly not a hiring prediction | P1 |

## 6. Critical negative tests

The following must fail safely:

- Candidate tries to invoke preparation AI in a real assessment room.
- Coach tries to access another candidate’s data or confidential employer evaluation information.
- Administrator imports unapproved proprietary interview questions.
- AI returns a hiring recommendation, protected-trait inference, or high-confidence unsupported claim.
- Media, transcript, source document, or access token is exposed through logs, browser storage, URL, export, or event stream.
- Calendar/integration retry creates duplicate bookings or duplicate notifications.
- Candidate withdrawal/deletion leaves derived training, search, or analytics artifacts behind.

## 7. UAT acceptance criteria

Release cannot proceed if any of the following is true:

- Any P0 UAT scenario fails.
- Preparation and live-assessment boundaries can be bypassed.
- Consent, tenant isolation, authorization, deletion, or audit behavior fails.
- AI feedback can auto-disposition a candidate or infer protected traits.
- Accessibility testers identify blocking keyboard, caption, screen-reader, contrast, or motion issues.
- Coach matching lacks conflict, qualification, candidate-choice, or escalation controls.
- Provider timeout/retry causes loss of candidate plan, consent, booking, or artifact state.

## 8. Exit deliverables

- Signed UAT report with passed/failed cases and defect disposition
- Privacy/security/AI governance sign-off
- Accessibility report and remediation status
- Coach operations and program-admin sign-off
- Provider integration test report
- Candidate-facing help, consent, and boundary copy
- Production rollout/rollback plan and support runbook

## 9. Traceability

- Product requirements: `docs/PRD-Candidate-Readiness-Coaching.md`
- Feature list: `docs/FEATURES-Candidate-Readiness-Coaching.md`
- Existing platform architecture: `docs/ARCHITECTURE.md`
- Existing platform trust boundaries: `docs/API.md` and `docs/IMPLEMENTATION-STATUS.md`
