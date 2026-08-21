# UAT Plan — Candidate Career Vault & RAG Planner

> **Default model:** Candidate-private, with manual/upload plus candidate-consented email/calendar sources.

## UAT scenarios

| ID | Persona | Scenario | Expected result | Priority |
|---|---|---|---|---|
| CV-01 | Candidate | Add a manual opportunity and application status | Timeline stores source, date, status, and next action | P0 |
| CV-02 | Candidate | Upload own note/feedback artifact | Artifact is private by default and tagged with source/provenance | P0 |
| CV-03 | Candidate | Upload allowed practice recording with transcript consent | Consent is recorded; original and transcript have separate retention controls | P0 |
| CV-04 | Candidate | Attempt to upload a recording without required rights/consent | Upload is blocked or routed to clear consent workflow | P0 |
| CV-05 | Candidate | Connect email account | Minimal scopes are shown; candidate selects eligible folders/labels | P0 |
| CV-06 | Candidate | Import an application receipt from email | Candidate reviews extraction before timeline creation | P0 |
| CV-07 | Candidate | Connect calendar | Only candidate-selected interview/coach/deadline events are imported | P1 |
| CV-08 | Candidate | Ask RAG for repeated feedback themes | Answer cites candidate-owned feedback with dates and excerpts | P0 |
| CV-09 | Candidate | Ask RAG for seven-day preparation plan | Plan cites role, feedback, practice, and calendar evidence | P0 |
| CV-10 | Candidate | Ask a question with insufficient data | RAG abstains and recommends next data/practice/human step | P0 |
| CV-11 | Candidate | Exclude an artifact from future retrieval | Artifact is excluded immediately and audit logged | P0 |
| CV-12 | Candidate | Share a summary with a coach | Candidate selects fields; employer evaluation data remains excluded | P0 |
| CV-13 | Coach | Attempt to access non-shared candidate artifact | Access is denied and audit logged | P0 |
| CV-14 | Candidate | Request data export | Export contains candidate-owned timeline/artifacts/metadata only | P0 |
| CV-15 | Candidate | Request deletion | Deletion propagates through artifact, transcript, index, and derived plan data | P0 |
| CV-16 | Trust reviewer | Attempt cross-tenant/cross-candidate retrieval | Retrieval is denied; no excerpt or embedding is returned | P0 |
| CV-17 | Candidate | Start a real-assessment context | Career Coach/RAG assistance is locked out | P0 |
| CV-18 | Candidate | Review an imported event with wrong extraction | Candidate can correct, reject, or remove the event | P1 |
| CV-19 | Accessibility tester | Use timeline, evidence panel, and RAG answer with keyboard/screen reader | All core flows remain accessible | P0 |
| CV-20 | Security tester | Inspect logs/events after sensitive artifact upload | No raw recording/transcript/email content or secrets are exposed | P0 |

## UAT exit criteria

- All P0 scenarios pass.
- RAG answers have source citations or explicitly abstain.
- Candidate-private default is enforced at every retrieval and artifact boundary.
- Email/calendar import is review-before-save.
- Recording/transcript rights and consent behavior are tested.
- Real-assessment lockout cannot be bypassed.
- Export/delete and retrieval exclusion propagation are verified.
