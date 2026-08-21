# SignalRoom Mock, Stub, and Adapter Audit

> **Audit purpose:** Give a future coding agent a precise, honest baseline before replacing demo behavior with production-capable implementations.  
> **Audited scope:** Main interview platform plus the separate Candidate Readiness & Coaching scaffold.  
> **Important:** A UI is not considered implemented merely because a screen, API route, or deterministic response exists.

## Classification rules

| Classification | Meaning |
|---|---|
| **Mocked frontend** | UI renders seeded/static information or a simulated state rather than a persisted/provider-backed result. |
| **Deterministic stub** | An API/service returns a fixed, heuristic, or simulated response without the promised external capability. |
| **Local adapter** | Has useful contract/policy behavior but uses in-memory state, a development identity, or no actual provider. |
| **Partially functional** | Real browser/local behavior exists, but the end-to-end production capability is incomplete. |
| **Production-ready** | Not currently claimed anywhere in this audit. Requires real identity, persistence, provider, observability, security, and operational validation. |

---

## 1. Mocked frontend inventory

### 1.1 Main product static data sources

| Audit ID | File(s) | Current behavior | Classification | Required replacement |
|---|---|---|---|---|
| FE-M-01 | `src/data/platformData.js` | **U2:** Dashboard/Interviews use the API when `VITE_USE_API=true` (empty/loading/error). Seed remains only for local demo mode. Live Studio/Intelligence/Integrations still seeded. | Partial | Remaining screens in U3–U6 |
| FE-M-02 | `src/data/foundationData.js` | Fixed workflows, requisitions, jobs, schemas, quality, flags, SLOs, analytics, policy, model data | Mocked frontend fallback | Remove as default source; use real control-plane API and persisted data |
| FE-M-03 | `src/data/completionData.js` | Fixed catalog of final 50 provider-ready actions | Mocked frontend fallback | Replace with actual provider capability/configuration registry and deployment status |
| FE-M-04 | `src/lib/platformApi.js` | `VITE_USE_API` defaults to local fallback; many actions fabricate local IDs/results after delays | Local adapter | Make real API the normal path; preserve a clearly labelled dev fixture mode only |
| FE-M-05 | `src/lib/session.js` | **U1:** no auto Maya login. LoginGate + labelled demo or OIDC. Logout revokes JWT `jti`. | Local session | Wire running Keycloak; drop demo when IdP is required |

### 1.2 Main product screens using seeded/simulated content

| Audit ID | Screen/file | Mocked or partial behavior | Required replacement |
|---|---|---|---|
| FE-M-06 | `Dashboard.jsx` | Schedule, metrics, AI briefing, platform health are static | Authenticated dashboard APIs, analytics warehouse, live health telemetry |
| FE-M-07 | `Interviews.jsx` | Agenda, candidate readiness, panel, status filters are seeded | Persistent interview/scheduling/calendar API and real permissions |
| FE-M-08 | `LiveStudio.jsx` | CSS avatar video tiles, seeded transcript/copilot, textarea instead of collaboration, local media controls | SFU/WebRTC provider, real tracks, transcript stream, CRDT/Monaco, sandbox, actual collaboration |
| FE-M-09 | `Intelligence.jsx` | Evidence, confidence, model stats, prompt actions are mostly fixed UI values | Actual AI gateway, retrieval evidence, model registry, review queue, evaluation telemetry |
| FE-M-10 | `DataPulse.jsx` | Event feed, topics, quality, lineage, retention are static/local control data | Kafka, schema registry, lakehouse/catalog, real quality and lineage APIs |
| FE-M-11 | `TrustCenter.jsx` | Audit/control cards and policy switches are presentation-heavy | Real policy store, audit query, DLP/KMS/residency controls, immutable audit backend |
| FE-M-12 | `Operations.jsx` | Service map, SLOs, release list, recovery drill visual state are simulated | OTLP, real SLO/alert service, CI/CD provider, DR execution evidence |
| FE-M-13 | `Integrations.jsx` | Greenhouse/Google/Slack/Workday connection status is hard-coded | OAuth, secure secrets, field mapping, sync/reconciliation, webhooks/delivery logs |
| FE-M-14 | `FoundationHub.jsx` | Real local API may respond, but jobs/artifacts/data quality/flags/SLO/integrations remain in-memory contracts | Durable queue/storage/provider wiring and real operations data |
| FE-M-15 | `CompletionHub.jsx` | Provider-ready completion actions return deterministic local results | Replace one action/domain at a time with real provider implementation and status |
| FE-M-16 | `FeatureCatalog.jsx` | All 100 PRD IDs display as implemented foundations | Reclassify each feature truthfully: mocked, local, provider-ready, staging, production |

### 1.3 Candidate Portal and Candidate Readiness scaffold

| Audit ID | File(s) | Current behavior | Classification | Required replacement |
|---|---|---|---|---|
| CR-M-01 | `src/components/CandidatePortal.jsx` | Candidate and interview details are fixed; consent can use local fallback | Partial browser feature + mock content | Real candidate identity, scheduled interview, consent service, accommodation workflow |
| CR-M-02 | `apps/candidate-readiness-web/src/data/demo.js` | Job, competencies, coaches, scores, availability are fixed | Mocked frontend | Authorized JD ingestion, persisted plans, coach directory/matching/booking APIs |
| CR-M-03 | `apps/candidate-readiness-web/src/App.jsx` | Readiness journey is a polished demo with no real auth, progress, coach booking, or handoff | Mocked frontend scaffold | Routed authenticated app, API state, accessibility tests, real plan/practice/coach workflows |
| CR-M-04 | `apps/candidate-readiness-web/src/lib/readinessApi.js` | Defaults to demo mode and uses header-based API only when remote | Local adapter | OIDC session, relative deployment routing/proxy, retry/error states, real data ownership controls |

---

## 2. Mocked API, persistence, and platform-service inventory

| Audit ID | File(s) | Current behavior | Classification | Required replacement |
|---|---|---|---|---|
| BE-M-01 | `apps/api/src/repositories.mjs` | **U1:** file-backed store (`data/signalroom-store.json`) is the default; survives restart. Mongo adapter still unwired (no Docker here). | Local durable file | MongoDB when `MONGO_URL` is reachable |
| BE-M-02 | `apps/api/src/auth.mjs`, `apps/api/src/server.js` | Seeded users and HMAC JWT demo login | Development auth stub | OIDC/SAML/SCIM, verified claims, MFA/passkey, logout/revocation, tenant/group mapping |
| BE-M-03 | `apps/api/src/platformServices.mjs` | Workflows, rubrics, models, flags, requisitions, jobs, analytics, schemas, policy are in-memory/static | Local control-plane adapter | Durable services/repositories, configuration management, provider integrations |
| BE-M-04 | `apps/api/src/completionServices.mjs` | Final 50 capabilities return deterministic provider-ready records | Deterministic stub layer | Replace per domain with real provider implementation; delete simulated result after each replacement |
| BE-M-05 | `apps/api/src/server.js` | API mutating data and idempotency response cache live in memory | Local adapter | Durable idempotency store, job queue, outbox/event publication, distributed rate limiting |
| BE-M-06 | `apps/api/src/organization.mjs` | Single static Northstar organization | Demo tenancy | Persistent multi-tenant organization hierarchy with delegated admin and ABAC |
| BE-M-07 | `apps/api/src/telemetry.mjs` | OpenTelemetry hooks exist, but no configured production exporter/SLO backend | Partial observability | OTLP exporter, secret config, sampling, dashboards, alerts, trace retention |
| BE-M-08 | `apps/api/src/auditLedger.mjs` | Hash-chained audit is process-local | Partial security control | Durable append-only/auditable store, key management, retention/legal hold, independent verification |

---

## 3. Mocked data engineering inventory

| Audit ID | File(s) | Current behavior | Required replacement |
|---|---|---|---|
| DE-M-01 | `services/event-gateway/src/eventBus.mjs` | `MemoryEventBus` is the active event path; Kafka adapter is interface-only | Kafka cluster/provider, topic ACLs, schema registry, consumer groups, DLQ, replay operations |
| DE-M-02 | `apps/api/src/platformServices.mjs` | Schema registry is a local `Map`; quality/cdc/lakehouse/catalog output is static | Real schema registry, CDC connector, data catalog, lineage, quality framework |
| DE-M-03 | `apps/api/src/platformServices.mjs` | Jobs are an in-memory array; replay/deletion/backup are queue-shaped records only | Durable orchestrator/workers, retry policy, DLQ, backfill, legal hold, deletion verification |
| DE-M-04 | `src/data/foundationData.js`, `DataPulse.jsx` | Topic throughput, lag, quality, retention, lineage visuals are seeded | Live Kafka metrics, stream processor data, lakehouse metadata, governed BI APIs |
| DE-M-05 | `completionServices.mjs` | CDC, lakehouse, ETL, feature store, backup, semantic metrics return planned/advisory objects | Actual storage, transform, feature-store, backup, warehouse, semantic layer implementation |

---

## 4. Mocked AI inventory

| Audit ID | File(s) | Current behavior | Required replacement |
|---|---|---|---|
| AI-M-01 | `services/ai/main.py` | Deterministic keyword/rule responses; no actual ASR/LLM/RAG call | Approved tenant-isolated model/ASR/RAG gateway, provider keys server-side, evaluation suite |
| AI-M-02 | `services/candidate-coaching-ai/app/main.py` | Deterministic practice questions/feedback/handoff summary | Approved coaching model/RAG adapter, source approval, safety evals, human-review routing |
| AI-M-03 | `platformServices.mjs` | Follow-up, code evaluation, debrief, model registry use fixed heuristics/static data | Grounded retrieval, sandboxed code execution, durable model registry, reviewer queue |
| AI-M-04 | `completionServices.mjs` | Interviewer/resume/behavior/sentiment/claim/integrity/language actions are simulated | Real model or deterministic approved policy engine, source evidence, fairness testing, escalation ops |
| AI-M-05 | `src/data/platformData.js`, `Intelligence.jsx`, `LiveStudio.jsx` | Transcript, copilot, evidence, confidence, integrity, model metrics are seeded | Streaming transcription, real AI outputs, source citations, confidence/evaluation telemetry |

---

## 5. Browser/media/realtime gaps

| Audit ID | Current behavior | Required replacement |
|---|---|---|
| RT-M-01 | Socket.IO authenticates a demo JWT and shares presence/action state | Real identity, durable room state, authorized signaling, provider media lifecycle |
| RT-M-02 | Live Studio renders CSS people, not real remote/local media streams | SFU SDK, device track lifecycle, TURN, ICE restart, adaptive bitrate, audio-only fallback |
| RT-M-03 | Screen sharing/whiteboard/AV enhancement are configuration results only | `getDisplayMedia`, whiteboard CRDT, browser capability checks, policy consent, recording control |
| RT-M-04 | Code editor is a textarea; evaluator is heuristic | Monaco/CRDT, isolated sandbox, hidden tests, resource/network controls |
| RT-M-05 | Device preflight is partially real browser behavior, but network readiness is heuristic | Provider preflight, TURN reachability, end-to-end media diagnostics, support workflow |

---

## 6. Candidate Readiness & Coaching gaps

| Audit ID | Current behavior | Required replacement |
|---|---|---|
| CR-M-05 | Domain service stores jobs, plans, coaches, and handoffs in `Map` objects | Persistent repository, tenant isolation, audit/events, retention/export/deletion |
| CR-M-06 | API trusts development headers for tenant, actor, and role | Signed OIDC claims, RBAC/ABAC, session lifecycle, step-up verification |
| CR-M-07 | AI coaching is deterministic and lacks authorized retrieval/model evaluation | Model/RAG provider, source approval, evaluation/red-team, review queue |
| CR-M-08 | Coach matching checks simple specialty/language/timezone overlap | Verified coach directory, availability, conflict engine, booking/calendar, rematch/safety workflows |
| CR-M-09 | No real preparation room, practice artifacts, booking, payment/entitlements, or progress analytics | Separate preparation media room, storage, calendar, billing, analytics, candidate-controlled sharing |

---

## 7. Truth-label corrections required

**U0 done.** Canonical schema: `src/data/capabilityRegistry.js` (`mocked`, `local_only`, `provider_wired`, `staging_verified`, `production_deployed`, `blocked_on_decision`). Feature Catalog, Control Center, Enterprise Scale, Ready Trust, Vault Trust, `docs/CAPABILITY-REGISTRY.md`, and `progess.md` consume it. No ID is `production_deployed`.

## 8. Completion order recommendation

1. Establish production decisions and a truthful status registry.
2. Replace identity, persistence, durable jobs/outbox, audit storage, and event infrastructure.
3. Replace seeded dashboard/interview/control data with authenticated APIs.
4. Integrate real SFU/media, calendar, notification, search, storage, and code sandbox.
5. Integrate Kafka/CDC/lakehouse/feature store/analytics.
6. Integrate approved AI/RAG/ASR with evaluation and human review.
7. Complete Candidate Readiness as its own product domain.
8. Add CI/CD, IaC, monitoring, security/compliance, migration, and UAT evidence.

## 9. Minimum verification after each replacement

- Unit and contract tests for real and failure paths
- Tenant isolation and unauthorized-access tests
- Consent and deletion propagation tests where personal data is involved
- Provider sandbox/staging smoke test
- Observability, rollback, retry, and timeout behavior
- Accessibility and responsive UI validation
- Documentation/status update using the truthful state model
