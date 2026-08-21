# Prompt — Finish Backend, Data, and AI Stubs Phase by Phase

## Current state

SignalRoom has 100% PRD **foundation coverage**, but not all foundations are production implementations.

The remaining work includes:

- **20 pure stubs** across Backend, Data Engineering, and AI Agent domains
  - Backend: 6
  - Data Engineering: 7
  - AI Agent: 7
- **24 local adapters/partial implementations** in the same domains that need real provider, persistence, reliability, and security hardening.

Do not describe a feature as production complete merely because it has a demo UI, in-memory implementation, deterministic adapter, or mock response.

---

## Copy-ready prompt

Act as a Staff Platform Engineer, Principal Data Engineer, AI Safety Architect, Security Engineer, SRE, and Product Delivery Lead for the SignalRoom enterprise interview platform.

Your goal is to replace the backend, data-engineering, and AI-agent stubs with genuinely deployable implementations in deliberate phases. Work only one phase at a time. At the end of every phase, provide a concise delivery report and stop for approval before beginning the next phase.

### Read before taking action

Read these files first:

1. `AGENTS.md`
2. `progess.md`
3. `docs/PRD-100-Features.md`
4. `docs/BATCH-50-FEATURES.md`
5. `docs/BATCH-100-FEATURES.md`
6. `docs/ARCHITECTURE.md`
7. `docs/API.md`
8. `docs/IMPLEMENTATION-STATUS.md`

### Required project skills

Use the narrowest relevant local skill before each task:

| Work type | Required skills |
|---|---|
| Scope, dependencies, sequencing | `project-orientation`, `documentation-progress` |
| API, tenancy, auth, audit, secrets | `api-auth-security`, `dependency-security` |
| Calendar, scheduling, invitations, notification, search | `api-auth-security`, `testing-quality` |
| WebRTC/SFU, presence, media orchestration | `realtime-socketio`, `observability-sre`, `candidate-portal-accessibility` |
| Kafka, CDC, lakehouse, feature store, DR | `event-data-engineering`, `observability-sre`, `dependency-security` |
| Transcription, LLM, RAG, scoring, integrity, fairness | `ai-governance`, `api-auth-security`, `testing-quality` |
| CI/CD, IaC, performance, resilience | `observability-sre`, `performance-bundle`, `dependency-security` |
| Browser/API test coverage | `testing-quality`, `react-experience` |

### Global rules

1. Never install arbitrary skills, MCP servers, shell scripts, or dependencies. Use official documentation, verified publishers, supported licenses, and dependency audit checks.
2. Never hard-code credentials, private keys, API keys, recording URLs, or real candidate data.
3. Preserve tenant isolation, authorization, consent, idempotency, audit trail, data residency, retention, and human-review boundaries.
4. AI output must remain assistive. Do not automatically hire, reject, infer protected traits, or treat integrity/sentiment output as deterministic.
5. Use real provider integrations only after provider selection, credentials, legal/privacy review, and deployment settings are available.
6. If a required decision or credential is missing, build only the tested adapter boundary and label it clearly as **blocked on provider decision**. Do not mark it production complete.
7. Run all relevant tests, build, security audit, and provider integration smoke tests before claiming any phase complete.
8. Update `progess.md`, `docs/API.md`, `docs/ARCHITECTURE.md`, `docs/IMPLEMENTATION-STATUS.md`, and the Feature Catalog status after each approved phase.

---

## Phase 0 — Production decision brief

### Objective

Resolve provider and deployment decisions before implementation.

### Scope

Do not write implementation code in this phase.

### Required decisions

- Cloud and region strategy, including data residency and disaster-recovery region
- Identity provider for OIDC/SAML/SCIM, MFA/passkeys, and privileged step-up access
- MongoDB, object storage, KMS/HSM, secret vault, and backup provider
- WebRTC/SFU, TURN, recording, and media-region provider
- Calendar, email, SMS, Slack/Teams, ATS, and HRIS providers
- Kafka, schema registry, CDC, lakehouse, warehouse, catalog, and feature-store stack
- ASR/transcription, LLM, RAG/vector store, model evaluation, and AI review workflow
- Observability, OTLP, CI/CD, artifact signing, WAF, and incident-management provider
- Compliance targets and retention/legal-hold/deletion policy

### Deliverable

Provide a decision matrix containing recommended options, trade-offs, cost/risk impact, missing credentials, and a proposed production architecture.

### Gate

Stop and wait for approval of the provider matrix.

---

## Phase 1 — Backend product services

### Target stub features

- BE-03 Availability and scheduling engine
- BE-04 Calendar synchronization service
- BE-05 Secure interview invitation service
- BE-12 Unified search and retrieval service
- BE-13 Notification preference and escalation engine

### Upgrade partial foundations

- Replace in-memory interview repository with persistent tenant-scoped storage
- Replace demo session assumptions with selected identity provider integration path
- Add durable scheduling, invitation, notification, webhook, and search job boundaries

### Required outcomes

- Availability matching with time zone, panel skill, buffers, conflicts, and SLA rules
- Two-way calendar sync with reconciliation and cancellation/reschedule behavior
- Expiring invitation links, delivery status, localization, and audit trail
- Permission-filtered search over allowed entities and artifacts
- Consent-aware notifications with quiet hours, retries, escalation, and delivery tracking

### Phase exit criteria

- Real persistence and migration plan are implemented
- Integration tests cover authorization, tenant isolation, retries, idempotency, conflicts, and webhook delivery
- No invitation, calendar, notification, or search result leaks cross-tenant information

### Gate

Stop and wait for approval.

---

## Phase 2 — Media control plane and interview runtime

### Target stub features

- BE-07 Media-session orchestration
- FE-01 Resilient WebRTC interview room
- FE-07 Screen sharing and collaborative whiteboard
- FE-10 Audio/video enhancement controls

### Required outcomes

- Selected SFU/WebRTC provider integration behind existing media adapter
- Region-aware room provisioning, TURN credentials, role permissions, recording policy, and admission controls
- Reconnect, ICE restart, adaptive bitrate, audio-only fallback, and network-quality telemetry
- Consent-aware screen sharing and whiteboard collaboration
- User-controlled blur/noise/echo preferences with browser capability fallback

### Phase exit criteria

- Multi-browser media integration tests pass in the selected provider’s supported environments
- Media permissions are user-triggered and all tracks/resources are cleaned up
- No browser calls use localhost; all provider credentials remain server-side
- Join success, reconnect, recording completion, and media quality telemetry are observable

### Gate

Stop and wait for approval.

---

## Phase 3 — Data engineering platform

### Target stub features

- DE-04 Change data capture
- DE-06 Lakehouse ingestion zones
- DE-07 Secure media/artifact ingestion
- DE-08 ETL/ELT orchestration
- DE-11 Online/offline feature store
- DE-14 Backup/disaster recovery/auditability
- DE-15 Semantic analytics layer

### Upgrade partial foundations

- Replace memory event adapter with Kafka and schema registry
- Replace static quality/catalog data with real pipeline metadata and metrics

### Required outcomes

- CDC with checkpointing, replay safety, backfill, and schema evolution
- Immutable raw ingestion, consent-aware silver data, and governed gold metrics
- Object-storage references with hashes, malware scan, retention tags, and encryption
- Orchestrated pipelines with retries, dependency tracking, quality checks, DLQ, and alerts
- Versioned online/offline feature definitions with training-serving skew tests
- Restore-tested backups, RPO/RTO evidence, and audit exports
- Tenant-safe semantic metrics for funnel, calibration, time-to-feedback, candidate experience, and platform reliability

### Phase exit criteria

- Schema compatibility, data quality, replay, deletion propagation, and restore tests pass
- Data classification, ownership, lineage, retention, and access policy are documented
- Dashboards use governed semantic metrics rather than direct operational collections

### Gate

Stop and wait for approval.

---

## Phase 4 — AI agent productionization

### Target stub features

- AI-02 AI interviewer agent
- AI-05 Resume and portfolio intelligence
- AI-08 Communication and behavioral signal analysis
- AI-09 Sentiment and engagement trends
- AI-11 Technical answer verification
- AI-12 Interview integrity anomaly detection
- AI-13 Inclusive-language and interviewer-bias coach

### Upgrade partial foundations

- AI-01 transcription
- AI-03 adaptive follow-ups
- AI-04 rubric grounding
- AI-06 explainable scoring
- AI-07 interviewer copilot
- AI-10 coding evaluation
- AI-14 debrief
- AI-15 model governance

### Required outcomes

- Approved ASR, LLM, RAG, and model-provider gateway with tenant isolation
- Source-grounded prompts, versioned rubrics, retrieval references, and confidence metadata
- Human takeover for virtual interviewer and mandatory human approval for recommendations
- Resume PII minimization, factual validation workflow, and candidate-access policy
- Behavioral/engagement/integrity outputs limited to advisory signals with bias/fairness monitoring
- Isolated, resource-limited, network-disabled code sandbox with hidden tests
- Prompt/model/rubric/retrieval versioning, evaluation suite, drift monitoring, red-team tests, and appeal workflow

### Phase exit criteria

- Consent gates and data-processing purpose are enforced before model calls
- Evaluation suite covers grounding, hallucination, bias, unsafe recommendation, and low-confidence routing
- No model output can auto-disposition a candidate
- Model, prompt, evidence, override, and reviewer actions are auditable

### Gate

Stop and wait for approval.

---

## Phase 5 — Security, SRE, and production readiness

### Required cross-cutting work

- Real OIDC/SAML/SCIM and MFA/passkeys
- KMS/HSM-backed encryption, vault-based secret rotation, WAF, DLP, and forensic media access
- IaC, CI/CD, signed artifacts, SBOM, dependency scanning, canary/rollback, and environment parity
- OTLP telemetry, SLO alerting, synthetic/RUM, capacity/cost, on-call, incident communication, and DR drills
- Accessibility, privacy, load, chaos, penetration, and provider interoperability tests

### Phase exit criteria

- Threat model, privacy impact assessment, data-processing agreements, and compliance evidence are reviewed
- Production runbooks, ownership, RTO/RPO, alerts, escalation, rollback, and support processes exist
- Staging and production acceptance tests pass against real providers
- Each capability is reclassified accurately as production deployed, provider-ready, or blocked

### Gate

Stop and wait for approval before any production release.

---

## Required report format after every phase

Return only:

1. Phase name and status
2. PRD IDs completed, provider-ready, blocked, or deferred
3. Decisions made and credentials/configuration still required
4. Security/privacy/AI-risk impact
5. Tests, build, audit, and smoke-test results
6. Updated documentation files
7. Explicit approval question for the next phase

Do not silently proceed to the next phase.
