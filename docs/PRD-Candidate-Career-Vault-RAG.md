# Product Requirements Document — Candidate Career Vault & RAG Planner

> **Working name:** SignalRoom Compass Vault  
> **Sharing model:** Candidate-private by default  
> **Initial sources:** Manual/upload plus candidate-consented email and calendar connectors  
> **Status:** Proposed product scope — implementation not started

## 1. Product vision

Give candidates one private place to track their opportunities, application states, feedback, interview notes, practice sessions, coach notes, recordings they are legally allowed to retain, and next actions.

A Retrieval-Augmented Generation layer should help the candidate find patterns across their own information and create an evidence-based preparation or job-search plan.

> The system helps a candidate understand their history and plan next actions. It does not predict or guarantee hiring outcomes.

## 2. Core product principle

**RAG is the reasoning layer, not the system of record.**

The system of record is a structured, time-ordered Candidate Career Timeline. RAG retrieves permitted, relevant, dated evidence from that timeline and its associated artifacts to answer questions and generate plans with citations.

## 3. Ownership and access model

### Default access

- Candidate is the sole default viewer of all Career Vault data.
- No employer, recruiter, interviewer, coach, or program administrator receives access by default.
- Candidate may later share a specific artifact, summary, or coach handoff through a separate, explicit, granular consent flow.

### Data included only when candidate is authorized to retain it

- Candidate-authored notes and reflections
- Candidate-owned portfolio/resume/work samples
- Candidate-entered application status and opportunity data
- Feedback explicitly delivered to the candidate
- Candidate-owned practice recordings and transcripts
- Email/calendar events accessible through the candidate’s OAuth consent
- Video/audio only where candidate has legal/policy permission and all required participant consents

### Data excluded by default

- Private recruiter/interviewer notes not shared with the candidate
- Employer scorecards, confidential hiring deliberation, or internal ranking
- Other candidates’ information
- Confidential assessment prompts or leaked interview material
- Data collected from a real assessment without a clear permission basis

## 4. User problems

Candidates commonly lose track of:

- which roles they applied to and through which source;
- interview dates, recruiters, deadlines, and follow-up actions;
- feedback patterns across mock interviews, coaching, and previous applications;
- recordings, notes, transcripts, portfolio evidence, and preparation plans;
- why they were strong or weak for a role;
- what to practice next and how to prioritize their time.

## 5. Primary user journeys

### Journey A — Track a new opportunity

1. Candidate saves a job manually, via approved email parsing, calendar event, or supported connector.
2. The system captures source, company, role, application state, deadline, and provenance.
3. Candidate confirms or corrects extracted information.
4. Opportunity appears in the Career Timeline and action inbox.

### Journey B — Capture feedback and evidence

1. Candidate adds notes, feedback received, practice session results, or an allowed recording/transcript.
2. The system asks for artifact source, consent, retention, and sharing visibility.
3. Artifact is encrypted, tagged, transcribed when permitted, and linked to the relevant opportunity or readiness plan.
4. Candidate can search, review, export, or delete it.

### Journey C — Ask the RAG Career Coach

Candidate asks:

- “What feedback patterns repeat across my last five practice sessions?”
- “What should I improve before my next frontend interview?”
- “Which portfolio project best demonstrates system design?”
- “Create a seven-day plan based on my Target Company role and recent feedback.”

The answer must cite the candidate-owned sources, dates, artifacts, and confidence limits used.

### Journey D — Create a plan

1. Candidate selects a target opportunity and time budget.
2. RAG retrieves relevant job requirements, feedback, stories, practice scores, and calendar constraints.
3. Planner creates milestones, practice sessions, human-coach suggestions, and reminders.
4. Candidate edits/accepts the plan.
5. The system tracks completion and revises the plan only with evidence shown to the candidate.

## 6. Functional requirements

### A. Candidate Career Timeline

1. Unified timeline for opportunities, applications, interviews, feedback, notes, practice, coaching, and next actions.
2. Manual creation/editing of all events.
3. Provenance labels: candidate entered, email import, calendar import, coach shared, practice artifact, approved connector.
4. Application state transitions with candidate confirmation.
5. Status aging, deadlines, reminders, and follow-up queue.
6. Duplicate detection across manually entered and connector-sourced opportunities.
7. Candidate-managed tags, priority, target company, role family, and search filters.

### B. Artifact Vault

8. Candidate note editor with opportunity and skill tags.
9. Upload of candidate-owned document, audio, video, transcript, or portfolio artifacts.
10. Recording/transcription consent wizard.
11. Encrypted object storage and separate metadata store.
12. Artifact hash, source, date, owner, consent, retention, and sharing metadata.
13. Candidate-controlled transcript corrections.
14. Candidate export, delete, and legal/consent status view.
15. Per-artifact sharing controls; default is private.

### C. Email and calendar connectors

16. Gmail/Microsoft OAuth connector with minimal, clearly disclosed scopes.
17. Candidate chooses which folders/labels/messages are eligible for import.
18. Extract only application receipts, recruiter messages, interview invitations, deadlines, and candidate-selected feedback.
19. Candidate review screen before an email-derived event becomes part of the timeline.
20. Google/Microsoft calendar connector for interviews, coach sessions, deadlines, and follow-up reminders.
21. Connector freshness, permission, disconnect, and re-authentication status.
22. No inbox training use and no forwarding of personal email content to employers.

### D. RAG retrieval and analysis

23. Candidate-tenant isolated vector index.
24. Chunking by artifact type, source, timestamp, opportunity, competency, consent, and sharing policy.
25. Hybrid retrieval: structured filters + vector similarity + recency + source quality.
26. Mandatory citations for every material recommendation, pattern analysis, and plan item.
27. Evidence panel showing source title, date, excerpt, and reason retrieved.
28. Abstention when there is insufficient permitted evidence.
29. Candidate correction, source exclusion, and “do not use for future plans” control.
30. No external model training with vault content unless separate opt-in is given.

### E. Career planning and feedback analysis

31. Feedback-theme clustering: communication, technical depth, evidence, role fit, timing, portfolio, or environment.
32. Candidate-visible pattern summary with links to original feedback.
33. Opportunity-specific readiness gap analysis.
34. Seven-day, thirty-day, and milestone-based preparation plans.
35. Candidate action inbox with prioritized next actions.
36. Story/portfolio recommendation tied to role requirements and candidate-owned evidence.
37. Coach escalation when evidence is conflicting, low confidence, or candidate requests human support.
38. Outcome-neutral reflection after interview or application status change.

### F. Trust and governance

39. Real-assessment lockout for live coaching/answer assistance.
40. Consent and participant-rights control for uploaded recordings.
41. Candidate-private default policy.
42. Audit log for connector imports, retrieval, plan generation, share, export, and delete actions.
43. Tenant isolation and authorization at API, artifact, retrieval, and export boundaries.
44. Data residency, retention, deletion propagation, and backup controls.
45. AI explanation, model version, retrieval confidence, and appeal workflow.

## 7. RAG architecture

```text
Candidate Timeline (structured DB)
        │
        ├── Candidate artifacts (encrypted object storage)
        │       └── Transcript / OCR / metadata extraction when consented
        │
        ├── Connector events (email + calendar, candidate-reviewed)
        │
        └── Retrieval index
                ├── tenantId + candidateId filter
                ├── source/consent/sharing filter
                ├── opportunity/skill/date metadata
                ├── vector embeddings
                └── temporal + source-quality ranking
                         │
                         ▼
                 RAG Career Coach
                         │
          cited answer / plan / abstain / human escalation
```

## 8. RAG answer rules

Every RAG answer must:

1. State that it is based only on available candidate-authorized information.
2. Cite source artifacts and timestamps.
3. Separate fact, candidate reflection, coach feedback, and AI inference.
4. Show confidence and missing evidence.
5. Avoid hidden employer reasoning or unsupported hiring predictions.
6. Offer a candidate-editable next action or human-coach escalation.

## 9. MVP roadmap

| Phase | Scope | Exit condition |
|---|---|---|
| Phase 1 — Timeline | Manual opportunity tracking, notes, feedback, action inbox, source provenance | Candidate can track all information privately |
| Phase 2 — Vault | Candidate-owned artifacts, consent, encrypted storage, transcription metadata, export/delete | Candidate can retain and control their own evidence safely |
| Phase 3 — Connectors | Gmail/Microsoft and calendar OAuth with review-before-import | Candidate can import only chosen application/interview information |
| Phase 4 — RAG | Isolated retrieval, citations, feedback patterns, readiness plans, abstention | Candidate can ask grounded questions and receive cited plans |
| Phase 5 — Sharing | Granular coach handoff, candidate-selected readiness reports, human escalation | Candidate can selectively collaborate without leaking evaluation data |

## 10. Success metrics

- Timeline completeness rate
- Candidate correction rate for imported email/calendar events
- Artifact consent completion rate
- Citation coverage for RAG answers
- RAG abstention correctness rate
- Plan completion and feedback-closure rate
- Candidate-reported clarity and control score
- Export/delete completion rate
- No unauthorized cross-candidate or cross-tenant retrieval event

## 11. Non-goals

- Predicting a candidate’s chance of being hired.
- Accessing employer-private feedback or scorecards.
- Generating answers during a live interview or assessment.
- Recording others without valid consent.
- Scraping personal inboxes, social accounts, or job sources without permission.
