# UAT evidence — self-hosted local path (U5–U7)

> Not staging. Not production. Date: 21 August 2026.  
> Environment: file stores, labelled demo JWT, no Docker providers in this sandbox.  
> Automated evidence: `npm test` (contract + UI). Human path: `npm run start:usable` + `docs/USER-RUNBOOK.md`.

## Interview product (A / B journeys)

| Scenario | Result | Evidence |
|---|---|---|
| Sign-in gate, no auto Maya | **pass (local_only)** | `LoginGate`; `auth.test.mjs`; `ALLOW_DEMO_LOGIN` |
| File persistence survives reload | **pass (local_only)** | `durableStore.test.mjs`; `data/signalroom-store.json` |
| Recruiter create/schedule/invite | **pass (local_only)** | `productServices.test.mjs` |
| Invitation public consent | **pass (local_only)** | public invitation routes + Candidate Portal |
| Two peers same room (P2P) | **pass (local_only)** | `rtcMesh.test.js`; Live Studio banner “not LiveKit” |
| Copilot consent / abstain / fallback | **pass (local_only)** | `modelGateway.test.mjs`, `aiServices.test.mjs` |
| Ops health honesty | **pass (local_only)** | `providerHealth.test.mjs` — never “Connected to Greenhouse” |
| Support trace id on API errors | **pass (local_only)** | `x-trace-id`; UI `ErrorNote` |
| ASR captions | **fail / mocked** | FE-05 seeded transcript |
| Monaco/CRDT coding | **fail / mocked** | FE-06 textarea |
| Executive analytics | **fail / mocked** | EO-09 seeded |
| Keycloak as default login | **blocked_on_decision** | Docker IdP not running |
| LiveKit/TURN | **blocked_on_decision** | P2P only |

## Candidate Readiness P0 (no Gmail)

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
| UAT-12…14 | **deferred** | Coach ops UI not a live roster product |
| UAT-15 | **partial** | Keyboard/reduced-motion exist; no axe pack |
| UAT-16 | **pass (local_only)** | Consent update persists |
| UAT-17 | **pass (local_only)** | Cross-tenant getDashboard/getPlan returns empty/not found |
| UAT-18 | **pass (local_only)** | Export + delete endpoints persist/propagate in-memory/file |
| UAT-21 / UAT-22 | **pass (local_only)** | Copilot/RAG abstain + human-review flags from U4 |
| UAT-25 | **pass (local_only)** | JWT required when ALLOW_DEV_HEADERS=false |
| CR-29 / CR-30 / CR-48 | **blocked_on_decision** | Payments, prep SFU, ATS |

## Career Vault P0 (no Gmail)

| ID | Result | How |
|---|---|---|
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

## Phase U6 addendum

| Check | Result |
|---|---|
| Event plane | memory unless Redpanda ApiVersions succeeds |
| Schema registry | registers JSON contracts when `REDPANDA_SCHEMA_REGISTRY` is up |
| Integrations UI | Greenhouse/Workday = Sandbox mock or Not connected |
| Ops health | `/api/ops/health` last success / last error |
| Trace id | `x-trace-id` on responses |
| OTLP | exporter wired when `OTLP_ENDPOINT` set; collector down here |

## Phase U7 launch bar

| Check | Result |
|---|---|
| One command | `npm run start:usable` boots interview + Ready + Vault (`START_READY_VAULT=false` skips companions) |
| README | “What is runnable now” lists working / mocked / blocked journeys |
| Registry | `staging_verified` = 0, `production_deployed` = 0, `userUsable` = 0 (`u7LaunchBar.test.mjs`) |
| Threat model / honest limitations | Unchanged in spirit — local controls only |
| Companion builds | Ready / Vault / RTC Vite builds pass locally |
| CI | existing quality job; workflow file not updated here (GitHub App lacks `workflows` permission) |

P0 items that still fail the *production* bar remain **local_only**, not staging_verified.
