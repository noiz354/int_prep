# API Contract — Foundation Batch 01

Base URL for the local Express adapter: `http://localhost:8787`
Base URL for the Python AI adapter: `http://localhost:8788`

## Authentication and tenant boundary

The local vertical slice uses a **signed, seeded demo session** so auth, tenant, role, and realtime flows can be exercised without a third-party identity account.

```http
POST /api/auth/demo-login
Content-Type: application/json

{ "email": "maya@northstar.example" }
```

The returned `accessToken` is a four-hour JWT with a tenant, organization, roles, and ABAC attributes. Send it on protected requests:

```http
Authorization: Bearer <accessToken>
X-Tenant-Id: northstar
```

Every mutation also requires an `Idempotency-Key` header. The demo identity adapter must be replaced by an approved OIDC/SAML/SCIM integration in production.

## Public bootstrap endpoints

| Endpoint | Description |
|---|---|
| `GET /api/health` | Service health, event adapter, and authentication mode. |
| `POST /api/auth/demo-login` | Exchanges a seeded local identity for a signed demo session. |

## Protected endpoints

| Method | Endpoint | Permission | Purpose |
|---|---|---|---|
| `GET` | `/api/auth/session` | authenticated | Returns the current signed principal. |
| `GET` | `/api/organization/current` | `organization:read` | Returns the current tenant hierarchy and data region. |
| `GET` | `/api/features` | `feature:read` | Returns all 100 generated PRD feature records. |
| `GET` | `/api/interviews` | `interview:read` | Lists tenant-scoped interviews. |
| `POST` | `/api/interviews` | `interview:create` | Creates an interview and publishes `interview.created`. |
| `GET` | `/api/interviews/:id` | resource-aware `interview:read` | Returns an assigned or authorized interview. |
| `POST` | `/api/interviews/:id/scorecards` | `scorecard:submit` | Calculates and saves a human-review scorecard. |
| `POST` | `/api/interviews/:id/consent` | resource-aware `consent:write` | Captures processing choices and publishes `consent.updated`. |
| `GET` | `/api/audit` | `audit:read` | Returns the tenant’s append-only audit entries. |
| `GET` | `/api/audit/verify` | `audit:read` | Recomputes the tenant’s SHA-256 audit chain. |
| `GET` | `/api/events` | `event:read` | Lists event-adapter entries by offset/type. |

## Consent request

```http
POST /api/interviews/int-2048/consent
Authorization: Bearer <accessToken>
X-Tenant-Id: northstar
Idempotency-Key: consent-int-2048-001
Content-Type: application/json
```

```json
{
  "recording": true,
  "transcription": true,
  "aiProcessing": false,
  "integrityProcessing": false,
  "legalNoticeVersion": "candidate-notice-2026.08"
}
```

The server stores a timestamped consent version, creates a `consent.updated` event, and appends a hash-chained audit entry. It does not make processing decisions on the client’s behalf.

## Realtime presence and signaling seam

Socket.IO uses the same JWT during its authenticated handshake:

```js
socket.emit('room.join', { interviewId: 'int-2048' }, callback);
socket.emit('room.action', {
  interviewId: 'int-2048',
  action: 'microphone.changed',
  value: false,
}, callback);
```

The server checks room permission, emits `presence.updated` only to the interview room, and keeps a limited connection-recovery window. This is the signaling/presence layer—not a substitute for a production SFU/media provider.

## 50% foundation control-plane routes

All routes below require the authenticated tenant session, relevant permission, and an `Idempotency-Key` for mutations.

| Area | Routes | Purpose |
|---|---|---|
| Workflow | `POST /api/interviews/:id/transition`, `GET /api/workflows`, `GET /api/requisitions` | Valid lifecycle transitions and approved hiring loops |
| Artifacts/jobs | `GET/POST /api/interviews/:id/artifacts`, `GET /api/jobs` | Controlled artifact metadata and local job orchestration |
| AI | `GET /api/rubrics`, `POST /api/ai/follow-up`, `POST /api/ai/code-evaluation`, `GET/POST /api/ai/models`, `POST /api/interviews/:id/debrief` | Grounded assistant, safe local code evaluation, model/debrief controls |
| Data | `GET /api/data/schemas`, `POST /api/data/schema-validate`, `POST /api/data/telemetry`, `GET /api/data/quality`, `GET /api/data/catalog`, `POST /api/data/replay`, `POST /api/data/deletion` | Contracts, telemetry, quality, lineage, audited replay/deletion jobs |
| Release/SRE | `GET/POST /api/feature-flags`, `GET /api/operations/slo`, `GET/POST /api/operations/incidents` | Progressive delivery, SLO state, controlled incident records |
| Security | `GET /api/security/policy`, `POST /api/privacy/redact`, `POST /api/security/envelope-encrypt` | Residency, encryption boundary, PII preview, API protection evidence |
| Integration | `GET/POST /api/webhooks` | Event allowlist and signing-reference webhook registration |
| Analytics | `GET /api/analytics/overview` | Funnel, calibration, NPS, and feedback timing metrics |

### Safe code-evaluation contract

`POST /api/ai/code-evaluation` intentionally performs **static, local heuristics only**. It does not execute candidate code. A production evaluator must run language-specific code in an isolated, resource-limited sandbox with hidden tests, network isolation, retention controls, and auditing.

## Phase 1 backend product-service routes

All routes require the authenticated tenant session, the listed permission, and an `Idempotency-Key` for mutations. Tenant mismatch returns `403`.

| Area | Routes | Permission | Purpose |
|---|---|---|---|
| Availability (BE-03) | `POST /api/availability` | `schedule:read` | Business-hours, panel-conflict, buffer-aware slot search |
| Scheduling (BE-03) | `GET/POST /api/schedules` | `schedule:read` / `schedule:write` | Confirm and list tenant-scoped interview schedules |
| Calendar sync (BE-04) | `POST /api/calendar/sync`, `POST /api/calendar/sync/:id/reconcile` | `calendar:sync` | Two-way provider sync seam with reconciliation |
| Invitations (BE-05) | `GET/POST /api/invitations`, `GET /api/invitations/verify` | `invitation:read` / `invitation:write` | Expiring links, delivery status, locale, verification |
| Unified search (BE-12) | `POST /api/search` | `search:read` | Permission-filtered search over interviews/artifacts/catalog |
| Notifications (BE-13) | `POST /api/notifications`, `POST /api/notifications/:id/attempt`, `GET /api/notifications/:id` | `notification:write` / `notification:read` | Quiet hours, retries, escalation, delivery tracking |

Example — availability:

```json
POST /api/availability
{ "panelIds": ["panel-ada"], "durationMinutes": 60, "from": "2026-08-24T00:00:00Z", "to": "2026-08-31T00:00:00Z" }
```

Example — invitation verify:

```http
GET /api/invitations/verify?token=inv_<token>
```

## Phase 2 media control-plane routes

All routes require the authenticated tenant session and listed permission. Tenant mismatch returns `403`; mutations require `Idempotency-Key`.

| Area | Routes | Permission | Purpose |
|---|---|---|---|
| Session provisioning (BE-07) | `POST /api/media/sessions`, `GET /api/media/sessions/:id` | `media:provision` / `media:join` | Region-aware room provision with TURN/recording policy contract |
| Connection state (FE-01) | `POST /api/media/sessions/:id/state`, `POST /api/media/sessions/:id/ice-restart` | `media:control` | Reconnect, adaptive bitrate, audio-only fallback, ICE restart |
| Admission (BE-07) | `POST /api/media/admission` | `media:join` | Host-gated waiting-room admission |
| Whiteboard (FE-07) | `POST /api/media/whiteboards`, `POST /api/media/whiteboards/:id/action`, `POST /api/media/whiteboards/:id/stop` | `whiteboard:control` | Consent-gated screen share, annotations, host stop/revoke |
| AV enhancement (FE-10) | `POST /api/media/enhancement` | `media:enhance` | User-controlled blur/noise/echo with browser fallback |

The SFU/WebRTC provider remains an adapter seam (`providerState: blocked-on-provider-decision`) until a Phase 0 provider decision is approved.

## Phase 3 data-platform routes

All routes require the authenticated tenant session and `data:operate` permission. Tenant mismatch returns `403`; mutations require `Idempotency-Key`.

| Area | Routes | Purpose |
|---|---|---|
| CDC (DE-04) | `POST /api/data/cdc/streams`, `POST /api/data/cdc/ingest`, `POST /api/data/cdc/replay`, `POST /api/data/cdc/backfill` | Checkpointed change-data capture with safe replay and schema-versioned backfill |
| Lakehouse (DE-06) | `POST /api/data/lakehouse/ingest`, `GET /api/data/lakehouse/zones` | Immutable bronze → consent-aware silver → governed gold zones |
| Secure ingestion (DE-07) | `POST /api/data/ingest-artifact`, `GET /api/data/ingestions` | Content hash, malware scan, retention tags, encryption, quarantining |
| ETL (DE-08) | `POST /api/data/pipelines`, `POST /api/data/pipelines/:id/run`, `GET /api/data/pipelines` | Task dependency, retries, DLQ, completion events |
| Feature store (DE-11) | `POST /api/data/features`, `GET /api/data/features`, `GET /api/data/features/skew` | Versioned online/offline definitions + training-serving skew test |
| Backup/DR (DE-14) | `POST /api/data/backup`, `POST /api/data/backup/:id/restore-test`, `GET /api/data/backup/evidence` | RPO/RTO records, restore-tested evidence |
| Semantic metrics (DE-15) | `POST /api/data/semantic-metrics`, `GET /api/data/semantic-metrics` | Governed, tenant-safe workforce metrics |

Kafka/schema-registry and lakehouse engine remain adapter seams (`blocked-on-provider-decision`) pending Phase 0 provider decisions.

## Phase 4 AI governance routes

All routes require the authenticated tenant session, `ai:use` permission, explicit consent in the body, and `Idempotency-Key`. Missing consent returns `409`; tenant mismatch returns `403`. Every result is `requiresHumanReview: true` — no output auto-dispositions a candidate or infers protected traits.

| Area | Routes | Purpose |
|---|---|---|
| AI interviewer (AI-02) | `POST /api/ai/interviewer/plan` | Approved-rubric plan with human takeover and handoff rule |
| Resume intelligence (AI-05) | `POST /api/ai/resume/parse` | PII-minimized profile with validation prompts |
| Behavior signals (AI-08) | `POST /api/ai/behavior/analyze` | Advisory signals; protected-trait inference excluded |
| Engagement trends (AI-09) | `POST /api/ai/engagement/analyze` | Aggregate trends with confidence bounds, no individual labeling |
| Claim verification (AI-11) | `POST /api/ai/claim/verify` | Grounded in approved knowledge sources |
| Integrity review (AI-12) | `POST /api/ai/integrity/review` | Reviewable signals; `automatedDecision: false` |
| Language coach (AI-13) | `POST /api/ai/language/coach` | Private interviewer coaching, never shared with candidate |
| Explainable scoring (AI-06) | `POST /api/ai/score/explain` | Evidence-linked per-competency explanation |
| Grounded follow-up (AI-03) | `POST /api/ai/follow-up-grounded` | Rubric/retrieval-grounded follow-up |
| Debrief (AI-14) | `POST /api/ai/debrief/generate` | Editable draft, human approval required |
| Governance (AI-15) | `GET /api/ai/governance`, `GET /api/ai/evaluations` | Model/prompt/rubric versioning + evaluation suite (grounding, privacy, harmful rejection, low-confidence) |

Model/RAG/ASR providers remain adapter seams (`blocked-on-provider-decision`); Ollama local (`172.24.16.1:11434`) is available for local model calls.

## Phase 5 security & production-readiness routes

All routes require the authenticated tenant session, listed permission, and `Idempotency-Key` for mutations.

| Area | Routes | Permission | Purpose |
|---|---|---|---|
| Step-up MFA (SC-03) | `POST /api/security/step-up`, `POST /api/security/step-up/verify` | `security:stepup` | Expiring step-up challenge (passkey/TOTP), verified or expired |
| Secret rotation (SC-12) | `POST /api/security/secrets/rotate`, `GET /api/security/secrets/policy` | `security:rotate` / `security:read` | 30-day rotation window, least privilege, never exposed in response |
| Envelope key rotation (SC-04) | `POST /api/security/envelope-rotate` | `security:rotate` | KMS-wrapped AES-256-GCM key versioning |
| DLP (SC-09) | `POST /api/security/dlp/scan` | `security:dlp` | PII detection (email/phone), mask-in-export, watermark policy |
| WAF policy | `POST /api/security/waf/policy`, `GET /api/security/waf/policies` | `security:waf` / `security:read` | OWASP CRS + default-block + rule allowlist |
| Compliance evidence (SC-13) | `POST /api/security/evidence`, `GET /api/security/evidence` | `security:evidence` | Auditor-scoped SOC2/ISO/GDPR evidence bundle |
| Supply chain (DO-12) | `GET /api/security/supply-chain` | `security:read` | SBOM, provenance, audit status, script policy |
| IaC (DO-01) | `POST /api/delivery/iac-plan` | `delivery:iac` | Module plan with environment parity + drift detection |
| Release pipeline (DO-04) | `POST /api/delivery/release-pipeline` | `delivery:release` | Canary/rollback stages, signed artifact, release-manager gate |
| DR drill (DO-11) | `POST /api/security/dr/drill` | `security:dr` | Restore/failover drill with RPO/RTO targets + corrective tracking |

**Security hardening added:** CSP + HSTS + Permissions-Policy headers on all responses; SSRF guard on webhook creation (https-only, private/loopback/link-local and cloud-metadata IPs rejected); webhook schema requires event types ≥ 3 chars. See `docs/THREAT-MODEL.md` for the STRIDE analysis.

### 100% completion adapter routes

### `GET /api/completion`

Returns the seven completion domains, their 50 remaining PRD IDs, local activity, connector configuration records, and saved preferences.

### `POST /api/completion/:domain/:action`

Runs a pre-declared provider-ready adapter. The request uses the normal authenticated tenant session and `Idempotency-Key` header.

```json
{
  "payload": {
    "text": "Candidate described an offline editing strategy.",
    "provider": "Configured provider adapter"
  }
}
```

Available domains are:

- `ai-advanced`
- `data-platform`
- `media-experience`
- `platform-operations`
- `trust-risk`
- `delivery-sre`
- `enterprise-ecosystem`

The server rejects unknown domains/actions, oversized/non-object payloads, unauthorized principals, and repeated side effects. It records the action in the audit/event boundary and returns a deterministic result that states whether human review or external provider setup is required.

## Candidate Readiness API

Separate bounded context under `services/candidate-readiness-api/` (port `8790`). See
`docs/IMPLEMENTATION-CANDIDATE-READINESS.md` for the honest status. Routes use the same
header identity seam (`X-Tenant-Id`, `X-Actor-Id`, `X-Actor-Role`) and require
`Idempotency-Key` for mutations. Boundary: `preparation_only`.

| Area | Routes | Purpose |
|---|---|---|
| Profiles | `POST /v1/profiles` | Candidate preferences, skills, languages, time zone, accessibility |
| Job descriptions | `POST /v1/job-descriptions`, `GET /v1/job-descriptions/:jobId/intelligence` | Authorized JD intake and role intelligence pack |
| Readiness plans | `POST /v1/readiness-plans`, `GET /v1/readiness-plans/:planId`, `POST /v1/readiness-plans/:planId/milestones`, `POST /v1/readiness-plans/:planId/device-ready` | Plan, milestones, device checklist |
| Practice | `POST /v1/stories`, `POST /v1/practice-sessions` | Evidence library and preparation-only practice feedback |
| Coaches | `POST /v1/coaches`, `POST /v1/coach-matches`, `POST /v1/coach-bookings`, `POST /v1/handoffs` | Verified coach directory, matching, booking, candidate-controlled handoff |
| Opportunities | `POST /v1/opportunities`, `POST /v1/applications`, `POST /v1/campaigns` | Opportunity tracking, review-before-send applications, safe campaigns |
| Trust | `POST /v1/consents`, `GET /v1/dashboard`, `GET /v1/data-export`, `GET /v1/audit` | Consent, dashboard, export, audit |

## Candidate Career Vault & RAG API

Separate bounded context under `services/career-vault-api/` (port `8792`). Same header
identity seam and `Idempotency-Key` requirement. Boundary: `candidate_private_default`;
every artifact is private to the candidate by default, and `live_assessment` context is
rejected. Connectors and vector retrieval are `blocked-on-provider-decision` seams; the RAG
service (`services/career-vault-rag/`, port `8002`) is a deterministic, cited-retrieval
scaffold.

| Area | Routes | Purpose |
|---|---|---|
| Timeline | `GET/POST /v1/timeline` | Time-ordered candidate career events with provenance |
| Opportunities | `GET/POST /v1/opportunities`, `POST /v1/opportunities/:id/status` | Manual opportunity tracking, status transitions, duplicate detection |
| Artifact vault | `GET/POST /v1/artifacts`, `GET /v1/artifacts/:id`, `POST /v1/artifacts/:id/exclude` | Candidate-owned notes/feedback/recordings, consent + retention, retrieval exclusion |
| Email import | `POST /v1/email/import`, `GET /v1/email/imports`, `POST /v1/email/imports/:id/review` | Review-before-save import of application receipts; approve/reject/correct per message |
| Consent & sharing | `POST /v1/consents`, `POST /v1/connectors`, `POST /v1/shares` | Consent choices, review-before-import connector registration, granular sharing |
| RAG Career Coach | `POST /v1/rag/ask`, `POST /v1/rag/plan` | Cited answers and seven-day plans over candidate-owned artifacts (deterministic scaffold) |
| Data rights | `GET /v1/dashboard`, `POST /v1/data-export`, `POST /v1/data-deletion`, `GET /v1/audit` | Candidate dashboard, export, deletion propagation, audit |
| Provider connections | `GET /v1/providers`, `POST /v1/providers/:id` | List disable/connect/blocked status; enable or disable a connection (candidate-controlled) |

Provider connection model: every external capability is an opt-in connection.
`GET /v1/providers` returns the catalog with `enabled`, `available`, `action`
(`disable` | `connect` | `blocked`), and a truthful `reason`. Enabling a
`blocked_on_provider_decision` provider returns `422` until a provider is selected.
Disabling a connection takes effect immediately: `email` disabled blocks
`POST /v1/email/import` (`409`); `rag_coach` disabled blocks `POST /v1/rag/ask` and
`/v1/rag/plan` (`409`). Enable/disable is audit logged.

Email import contract: every message is held `awaiting_review`; only an explicit
`approve` (or `correct` with title/company overrides) creates an opportunity and timeline
event. `reject` creates nothing. Raw email bodies are never written to audit logs; a
connector is required (`POST /v1/connectors`) with candidate-selected eligible folders and
consent before any import is accepted.

### RAG Career Coach (Python, port `8002`)

| Endpoint | Gate | Behavior |
|---|---|---|
| `POST /v1/rag/ask` | candidate + tenant + career-planning context | Cited answer over candidate-owned evidence, or abstention with next step |
| `POST /v1/rag/plan` | candidate + tenant + career-planning context | Seven-day preparation plan grounded in role/feedback/practice/calendar evidence |

Every RAG response carries `modelVersion`, `confidence`, `requiresHumanJudgment: true`,
mandatory citations (or an explicit `abstention`), and separates fact, reflection, and
inference. `live_assessment` returns `409`.

## Python AI adapter

Base URL: `http://localhost:8788`

| Endpoint | Consent gate | Behavior |
|---|---|---|
| `POST /v1/copilot/suggest` | `consent_for_ai` | Returns a neutral, grounded follow-up suggestion + confidence. |
| `POST /v1/transcription/segment` | `consent_for_transcription` | Accepts a media reference and returns an async job contract. |
| `POST /v1/integrity/analyze` | `consent_for_integrity_processing` | Returns an advisory review level; never an automated decision. |

All endpoints support `X-Tenant-Id`; a mismatched tenant is rejected.
