# UAT evidence — Phase U5 (self-hosted)

> Automated contract evidence for Candidate Readiness and Career Vault P0 scenarios that do **not** need Gmail/MS OAuth, payments, or an SFU.  
> Date: 21 August 2026. Environment: local file store, labelled demo JWT (Alex). Not staging.

| ID | Result | How |
|---|---|---|
| UAT-01 | **pass (local_only)** | Create JD + plan via domain/API; dashboard returns the plan |
| UAT-02 | **pass (local_only)** | `sourceApproval: confidential` throws / not approved |
| UAT-04 | **pass (local_only)** | Plan stores language + accessibilityPreferences |
| UAT-05 / UAT-06 | **pass (local_only)** | Practice session with consent persists guidance |
| UAT-07 | **pass (local_only)** | `sessionContext: live_assessment` rejected (409/error) |
| UAT-08 | **blocked_on_decision** | Isolated coding sandbox not provisioned (CR-21) |
| UAT-09 | **partial** | Matching works on persisted verified coaches; roster empty until created via API |
| UAT-11 | **pass (local_only)** | Handoff requires candidateApprovedAt + sharedFields |
| UAT-15 | **partial** | Keyboard/reduced-motion exist; no axe pack |
| UAT-16 | **pass (local_only)** | Consent update persists |
| UAT-17 | **pass (local_only)** | Cross-tenant getDashboard/getPlan returns empty/not found |
| UAT-18 | **pass (local_only)** | Export + delete endpoints persist/propagate in-memory/file |
| UAT-21 / UAT-22 | **pass (local_only)** | Copilot/RAG abstain + human-review flags from U4 |
| UAT-25 | **pass (local_only)** | JWT required when ALLOW_DEV_HEADERS=false |
| CR-29 / CR-30 / CR-48 | **blocked_on_decision** | Payments, prep SFU, ATS |
| CV-01 | **pass (local_only)** | Manual opportunity persists |
| CV-02 | **pass (local_only)** | Private artifact + provenance |
| CV-03 / CV-04 | **pass (local_only)** | Recording/transcript consent gates |
| CV-05 / CV-07 | **blocked_on_decision** | Gmail / calendar OAuth |
| CV-06 / CV-18 | **pass (local_only)** | Paste import + review-before-save (after Email connection enabled) |
| CV-08 / CV-09 / CV-10 | **pass (local_only)** | Cited RAG or abstain |
| CV-11 | **pass (local_only)** | Retrieval exclusion |
| CV-12 / CV-13 | **pass (local_only)** | Explicit share; private default |
| CV-14 / CV-15 | **pass (local_only)** | Export / delete |
| CV-16 / CV-17 | **pass (local_only)** | Cross-tenant denial; live-assessment lockout |
| CV-19 | **partial** | Keyboard paths; no UAT a11y pack |
| CV-20 | **pass (local_only)** | Audit omits raw bodies in tests |

P0 items that still fail the *production* bar remain **local_only**, not staging_verified.
