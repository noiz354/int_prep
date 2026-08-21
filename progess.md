# SignalRoom — Project Progress

> **Last updated:** 21 August 2026 (WIB)  
> **PRD feature-foundation coverage:** **100 / 100 (100%)**  
> **Delivery truth:** Every PRD item has a tested local foundation or provider-ready adapter. This does **not** mean external vendors are already production deployed.

## SignalRoom Ready — Candidate Readiness & Coaching (new bounded context)

A separate candidate-owned preparation product is now scaffolded in this repository
(`candidate-readiness/`, `apps/candidate-readiness-web/`,
`services/candidate-readiness-api/`, `services/candidate-coaching-ai/`,
`packages/candidate-readiness-domain/`). It is **preparation-only**: it never operates in
a live assessment, never auto-dispositions a candidate, and keeps preparation data separate
from hiring-evaluation data by default.

| Area | Status | Production replacement required |
|---|---|---|
| Domain service (plans, practice, coaches, handoff, opportunities, consent, export) | ✅ Local in-memory policy scaffold (6 tests) | Persistent tenant-scoped repository + migrations |
| Readiness API (17 routes) | ✅ Development scaffold (header identity, idempotency, audit) | OIDC/SAML middleware, durable persistence, event gateway |
| AI coaching (FastAPI) | ✅ Deterministic consent/boundary-safe scaffold | Approved model/RAG/ASR provider, evaluation + human review |
| Readiness web (6 screens) | ✅ Standalone Vite build (69.5 KB gzip JS) | Approved design-system/API auth integration |
| Docs (PRD, FEATURES, UAT, IMPLEMENTATION) | ✅ Ported and traceable to CR-01…CR-48 / UAT-01…UAT-26 | — |

Feature-level truth labels live in `docs/IMPLEMENTATION-CANDIDATE-READINESS.md` and
`docs/MOCK-STUB-AUDIT.md`; UAT P0 scenarios are not yet executed against real providers.

## Compass Vault — Candidate Career Vault & RAG Planner (new bounded context)

A second candidate-owned product is scaffolded: a private, time-ordered **Career Timeline**
(system of record) plus an **Artifact Vault** and a deterministic **RAG Career Coach**
(`docs/PRD-Candidate-Career-Vault-RAG.md`, `docs/UAT-Candidate-Career-Vault-RAG.md`).
Candidate-private by default; sharing is explicit, granular, and audited. Live-assessment
lockout is enforced at every API/AI boundary.

| Area | Status | Production replacement required |
|---|---|---|
| Domain (timeline, vault, consent, retention, export/delete, audit) | ✅ Local in-memory policy scaffold (14 tests) | Persistent tenant-scoped repository + migrations |
| Email import (review-before-save, CV-05/06/18/20) | ✅ Local scaffold (7 tests) | Gmail/Microsoft OAuth connector + real inbox parsing |
| RAG Career Coach (JS domain + FastAPI) | ✅ Deterministic cited-retrieval scaffold (9 JS + 9 Python tests) | Approved vector store + model/RAG gateway, evaluation suite |
| Career Vault API (Express, 8792) | ✅ Development scaffold (header identity, idempotency, audit; rag + email routes) | OIDC/SAML middleware, durable persistence, event gateway |
| Career Vault web (4 screens) | ✅ Standalone Vite build (67.1 KB gzip JS) | Approved design-system/API auth integration |
| Provider connections (disable/connect/blocked) | ✅ Candidate-controlled registry + API + UI; gates RAG & email import | Real provider credentials/decisions |
| Docs (PRD, UAT) | ✅ Ported; traceable to CV-01…CV-20 | — |

Email/calendar OAuth connectors and encrypted object storage remain
`blocked-on-provider-decision` seams (review-before-import contract is implemented and
tested). UAT P0 scenarios are not yet executed against real providers.

## Observability & tracing (new)

Both candidate-facing APIs are now instrumented via a shared `packages/observability`
package: OpenTelemetry SDK (auto-instrumentation + manual business spans), structured JSON
request logs with correlation IDs (`x-request-id`), RED metrics, and a
`career_vault.rag.abstentions` counter. Python RAG/coaching services emit structured JSON
logs (stdlib). Verified end-to-end: real spans (`career_vault.rag.ask`,
`career_vault.rag.plan`) were received by an OTLP endpoint. Runbook:
`scripts/otel/README-observability.md`.

| Area | Status |
|---|---|
| `packages/observability` (startTelemetry, inSpan, requestLogger, recordRed) | ✅ 4 unit tests; fail-soft when collector down |
| career-vault-api spans + request-id + RED | ✅ Verified OTLP export of RAG spans |
| candidate-readiness-api spans + request-id + RED | ✅ Practice submit span + structured logs |
| Python services structured logs | ✅ No PII; tenant hashed; OTLP noted as follow-up |
| Jaeger/Prometheus/Grafana stack | ⚠️ Docker images `coraza-waf`/`otel-collector-contrib:0.126.1` not pullable — pinned runbook workaround; see `scripts/otel/README-observability.md` |

## Observability — core interview flows + RTC interview app (new)

The main control plane (`apps/api`) now emits correlation IDs (`x-request-id`) and structured
JSON logs on every request, plus business spans (`media.session.provisioned`,
`media.ice_restart`, `scorecard.submit`, `interview.create`, `room.join`) and media quality
metrics (`media.rtc.latency_ms`, `media.rtc.packet_loss_percent`, `media.rtc.jitter_ms`) fed
from `/api/data/telemetry`.

A new **RTC Interview app** (`apps/rtc-interview-web`, port 5192) provides a real WebRTC
interview room: user-triggered `getUserMedia` (consent-gated, tracks stopped on leave),
RTCPeerConnection local-loopback negotiation with ICE/connection state, live media quality
panel (RTT/jitter/packet loss → `media.rtc.*` metrics), and authenticated Socket.IO room
presence. Live Studio also gained a user-triggered real-camera preview with graceful
fallback to the simulated room. SFU provider remains `blocked-on-provider-decision`.

| Area | Status |
|---|---|
| Core API correlation IDs + structured logs | ✅ Verified `x-request-id` + JSON log lines |
| Media/room/scorecard spans | ✅ `media.session.provisioned`, `media.ice_restart`, `room.join`, `scorecard.submit` |
| Media quality metrics | ✅ `/api/data/telemetry` → `media.rtc.*` histograms |
| RTC Interview web app | ✅ Build 75.0 KB gzip; consent → denial fallback verified in headless CDP |
| Live Studio real-camera preview | ✅ User-triggered, tracks stopped on leave, fallback preserved |
| SFU/WebRTC production provider | ⚠️ Seam labeled; local loopback only until provider decision |

## Executive status

| Metric | Current value |
|---|---:|
| PRD capabilities documented | 100 |
| Local foundation/provider-ready adapters | **100** |
| Remaining PRD feature IDs | **0** |
| Automated tests | **56 passing** (54 Node contract/service + 2 browser utility) |
| Production build | Passing |
| Frontend output | ~119 KB gzipped JavaScript · ~21 KB gzipped CSS |
| High-severity production dependency findings | 0 |
| Project-local coding-agent skills | 36 validated |

## Milestones

| Milestone | Status | Evidence |
|---|---|---|
| 100-feature PRD | ✅ Complete | `docs/PRD-100-Features.md` |
| Initial product vertical slice | ✅ Complete | Dashboard, Live Studio, Candidate Portal, AI/Data/Trust/Ops/Integration views |
| Foundation Batch 01 — 10 features | ✅ Complete | Auth, tenant, consent, audit, preflight, realtime, offline state, OTel |
| 50% feature foundation | ✅ Complete | `docs/BATCH-50-FEATURES.md`, Control Center |
| 100% feature foundation | ✅ Complete | `docs/BATCH-100-FEATURES.md`, Enterprise Scale control center |
| Coding-agent skill pack | ✅ Complete | `.agents/skills/` (36 skills), `AGENTS.md`, `references/`, Claude/Copilot/Cursor compatibility |
| External provider production rollout | ⏳ Pending | Requires vendor accounts, secrets, cloud infrastructure, and approval |

## Coverage by PRD domain

| Domain | PRD count | Foundation status | Delivery surface |
|---|---:|---:|---|
| AI Agent Features | 15 | ✅ 15 / 15 | Intelligence, Control Center, Enterprise Scale adapters |
| Data Engineering | 15 | ✅ 15 / 15 | Data Pulse, schemas, quality, catalog, replay/recovery adapters |
| Frontend | 15 | ✅ 15 / 15 | Live Studio, Candidate Portal, responsive/accessibility/media adapters |
| Backend & Platform | 14 | ✅ 14 / 14 | Lifecycle, workflows, jobs, artifacts, scheduling, search, notifications |
| Security/Trust | 14 | ✅ 14 / 14 | Auth, consent, audit, encryption, DLP, residency, compliance adapters |
| DevOps/Reliability | 14 | ✅ 14 / 14 | Flags, OTel, SLO, incident, IaC/CD/DR/supply-chain adapters |
| Enterprise Operations | 13 | ✅ 13 / 13 | Requisition, interviewer, ATS/HRIS/comms, admin, billing, support adapters |
| **Total** | **100** | **✅ 100 / 100** | Feature Catalog, Control Center, Enterprise Scale |

## New completion-batch delivery

### Enterprise Scale control center

The sidebar now includes **Enterprise scale**, which exposes runnable, tenant-aware local adapters for the final 50 PRD capabilities across seven domains:

1. AI automation & safeguards
2. Data platform & recovery
3. Media & candidate experience
4. Scheduling & platform workflow
5. Trust, compliance & risk
6. Delivery & reliability engineering
7. Enterprise ecosystem

Each completed action goes through an authenticated, rate-limited, tenant-scoped API path with payload validation, idempotency, audit recording, and a contract event.

### New platform controls

- AI interviewer simulation, resume intelligence, behavioral/advisory engagement, claim verification, integrity review, and inclusive-language coaching
- CDC, lakehouse, secure ingestion, ETL, feature store, backup/restore, semantic analytics adapters
- WebRTC/SFU provisioning contracts, layout, whiteboard, AV enhancement, localization preferences
- Availability, calendar sync, secure invitation, media orchestration, unified search, notification routing
- Step-up challenge, DLP, media token/watermark, secret rotation, compliance evidence, fairness appeal
- IaC, scaling, failover, CI/CD, quality matrix, synthetic monitoring, capacity, DR, supply-chain, model deployment
- Interviewer directory, ATS/HRIS/comms connectors, marketplace workflow, tenant admin, white-label, usage, support export

## Engineering verification

```bash
npm run skills:check
npm test
npm run build
npm audit --omit=dev --audit-level=high
```

Latest verification:

- [x] 36 project-local skills validated (`npm run skills:check`)
- [x] 54 Node contract/service tests passing (Phases 1–5: product, media, data platform, AI governance, security/SRE)
- [x] 2 browser utility tests passing
- [x] Canonical registry validates exactly 100 valid PRD IDs
- [x] API smoke paths tested for foundation actions and protected services
- [x] Authenticated Socket.IO room join tested through Vite proxy
- [x] Production Vite build passing
- [x] High-severity production dependency audit clean

> **Reproduction note:** run the suite with `NODE_ENV=development` (or unset
> `NODE_ENV`). With `NODE_ENV=production` in the environment, `npm ci`/`npm
> install` skip devDependencies (`vitest`, `jsdom`, Testing Library) and the
> browser utility tests cannot run.

## Documentation map

| Document | Purpose |
|---|---|
| `docs/PRD-100-Features.md` | Original 100-feature product requirement catalog |
| `docs/BATCH-50-FEATURES.md` | First 50 implemented feature foundations |
| `docs/BATCH-100-FEATURES.md` | Final 50 provider-ready foundations and completion boundary |
| `docs/API.md` | Authenticated API and control-plane contract |
| `docs/ARCHITECTURE.md` | System/provider replacement architecture |
| `docs/IMPLEMENTATION-STATUS.md` | Domain-level delivery status |

## Coding-agent skill pack

36 project-local skills: the 12 SignalRoom-specific skills below plus 24
production-grade workflow skills from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills)
(MIT), with shared checklists in `references/`.

| Skill | Primary use |
|---|---|
| `project-orientation` | PRD-driven planning and scoping |
| `react-experience` | React UX, responsiveness, accessibility |
| `candidate-portal-accessibility` | Consent, media preflight, offline recovery, accommodations |
| `api-auth-security` | JWT, tenant/RBAC, consent, audit, idempotency |
| `realtime-socketio` | Presence/signaling/reconnect safeguards |
| `ai-governance` | Evidence-linked, human-reviewed AI |
| `event-data-engineering` | Contracts, Kafka boundary, lineage, privacy propagation |
| `testing-quality` | Test selection and regression gates |
| `observability-sre` | OTel, SLO, resilience, incidents |
| `performance-bundle` | Runtime/bundle discipline |
| `documentation-progress` | PRD/API/architecture/status hygiene |
| `dependency-security` | Safe package, tool, MCP, and remote-skill evaluation |

## Production deployment backlog

All PRD features have local foundation coverage. What remains is vendor-backed deployment and certification. Lightweight **local provider adapters** for every category below are available opt-in via `docker-compose.providers.yml` (profile-gated; see README and `docs/ARCHITECTURE.md`):

1. Identity: OIDC/SAML/SCIM/MFA (Keycloak `8781`), secret rotation (Vault `8780`), real tenant provisioning.
2. Data: encrypted MongoDB (`8782`), object storage (MinIO `8792`), Kafka/Schema Registry (Redpanda `8790`/`8791`), CDC, lakehouse, feature store, backup/retention/legal hold.
3. Media: SFU/WebRTC (mediasoup harness `8794`/`8796`), TURN (coturn `8797`), regional media routing, recording, browser/device matrix, isolated code sandbox (`8795`).
4. AI: approved model provider (Ollama native on Windows host — `172.24.16.1:11434`, WSL-accessible), RAG store (Qdrant `8799`), evaluation/red-team suite, review queue, observability, fairness governance operations.
5. Delivery: IaC, CI/CD, artifact signing, WAF, OTLP (`8785`), alerting (Prometheus `8784` / Jaeger `8786` / Grafana `8783`), DR exercises, support/on-call.
6. Ecosystem: real ATS/HRIS/calendar/comms OAuth connectors (WireMock mocks `8800`), reconciliation, billing and support tooling.

## Definition of done for a production rollout

A provider-backed capability may only move from **adapter-ready** to **production deployed** after it has:

1. Approved vendor/account/region and credentials managed outside application code
2. Threat model, privacy/legal review, retention/deletion and access policy
3. Tenant isolation, authorization, audit, observability, backup, and rollback plan
4. Accessibility, load, security, resilience, and integration validation in target environment
5. Runbook, ownership, SLO, alert route, and incident communications plan
