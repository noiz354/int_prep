# SignalRoom Architecture

## Delivery shape

```text
┌──────────────────────────────── Browser / React ────────────────────────────────┐
│ Responsive interview UX · live studio · scorecards · AI copilot · governance   │
│ src/lib/platformApi.js     src/lib/eventBus.js      src/data/features.js        │
└───────────────────────────────┬────────────────────────────────────────────────┘
                                │ HTTPS / WebSocket / signed media controls
┌───────────────────────────────▼────────────────────────────────────────────────┐
│ Node / Express control plane                                                    │
│ Identity + tenant context · interview lifecycle · scorecards · webhooks         │
│ Repository interface: in-memory demo → MongoDB production adapter               │
└───────────┬───────────────────────────────┬─────────────────────────────────────┘
            │                               │
┌───────────▼────────────┐       ┌──────────▼───────────────────────────────────┐
│ Event gateway          │       │ Python AI gateway                             │
│ Contract validation    │       │ transcription / copilot / integrity adapters │
│ Mock bus → Kafka       │       │ consent checks + human-review metadata       │
└───────┬────────────────┘       └──────────────────────────────────────────────┘
        │
┌───────▼────────────────────────────────────────────────────────────────────────┐
│ Kafka + governed data platform (production)                                      │
│ Schema registry → stream processing → lakehouse → feature store → semantic BI   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## Bounded contexts

| Domain | User-facing area | Backend / data boundary | Current vertical-slice implementation |
|---|---|---|---|
| AI Agent | Live Studio + AI Intelligence | `services/ai` | Consent-aware deterministic adapter, evidence UX, human override language |
| Data Engineering | Data Pulse | `services/event-gateway` | Versioned event envelope, tenant field, idempotency and memory bus |
| Frontend | All screens | React components + local adapters | Fully interactive product prototype and responsive design system |
| Backend Platform | Interview lifecycle | `apps/api` | Express routes, lifecycle record shape, scorecard service and repository seam |
| Security & Trust | Trust Center | API middleware + policy contracts | Tenant checks, mutation idempotency, headers, consent boundary, audit UX |
| DevOps & Reliability | Reliability | deployment contracts | SLO/runbook/release UI; service code is designed for deployment adapters |
| Enterprise Operations | Integrations | connector/webhook contracts | Connector management and no-code workflow UX with labeled mocks |
| Candidate Readiness | `apps/candidate-readiness-web` | `services/candidate-readiness-api`, `services/candidate-coaching-ai`, `packages/candidate-readiness-domain` | Preparation-only readiness plans, practice, verified coach matching, handoff; in-memory policy scaffold |
| Career Vault & RAG | `apps/career-vault-web` | `services/career-vault-api`, `services/career-vault-rag`, `packages/career-vault-domain` | Candidate-private timeline + artifact vault + deterministic cited RAG coach; connector/vector seams labeled |
| RTC Interview | `apps/rtc-interview-web`, Live Studio | `apps/api` media control plane + Socket.IO | User-triggered WebRTC (getUserMedia + local loopback negotiation), consent-gated, media quality telemetry; SFU provider seam labeled |

## Event contract

Every server event is an envelope with:

```json
{
  "eventId": "uuid",
  "type": "scorecard.submitted",
  "contractVersion": "1.0",
  "occurredAt": "2026-08-20T02:43:09.000Z",
  "idempotencyKey": "scorecard:northstar:int-2048:uuid",
  "payload": {
    "tenantId": "northstar",
    "interviewId": "int-2048"
  }
}
```

Required invariants:

1. Tenant context is mandatory; consumers may never infer a tenant from an unscoped topic.
2. Producers provide idempotency keys; consumers deduplicate before side effects.
3. Contract versions are explicit and schema-registry compatible in the Kafka implementation.
4. Consent status is captured as an event and must be evaluated before processing media, transcripts, AI, or exports.

## Provider boundaries to wire for production

| Need | Adapter boundary | Production decision needed |
|---|---|---|
| Video rooms | Media-session orchestration / SFU control plane | LiveKit, Daily, Twilio, Agora, or self-hosted SFU; region and recording policy |
| Real-time events | `KafkaProducerAdapter` | Kafka provider, schema registry, topic ACLs, retention, DLQ/replay policies |
| Persistent documents | `MongoInterviewRepository` | MongoDB topology, encrypted fields, backups, migration strategy |
| AI assistance | `services/ai/main.py` | Approved provider/model, RAG store, data-processing agreement, red-team evaluation |
| Identity | Express authentication middleware | OIDC/SAML provider, SCIM, RBAC/ABAC policies |
| ATS/HRIS | Integration connector layer | Provider app registrations, field maps, retry/reconciliation policy |

## Local provider adapters (Docker, opt-in)

`docker-compose.providers.yml` provides lightweight, profile-gated containers that
stand in for the production providers so each boundary is runnable and testable
locally. They are **provider-ready adapters, not production deployments** — the
control plane still enforces consent, tenant isolation, authorization, and audit
on top of them.

| Profile | Service | Host port | Replaces (production) |
|---|---|---|---|
| identity | Keycloak (OIDC/SAML/SCIM/MFA) | `8781` | Okta/Auth0/EntraID |
| data | HashiCorp Vault (KMS/transit) | `8780` | Cloud KMS/HSM |
| data | MongoDB (encrypted at rest) | `8782` | Atlas/self-managed MongoDB |
| data | Redpanda (Kafka + Schema Registry) | `8790` / `8791` | Confluent/MSK |
| data | MinIO (S3, lakehouse landing) | `8792` / `8793` | S3/lakehouse |
| media | mediasoup SFU harness | `8794` / `8796` | LiveKit/Daily/Twilio |
| media | coturn (TURN) | `8797` | Managed TURN |
| media | docker:dind isolated code sandbox | `8795` | Firecracker/gVisor |
| ai | Ollama (Windows-host native, WSL via gateway IP) | `172.24.16.1:11434` | OpenAI/Anthropic gateway |
| ai | Qdrant (vector store / RAG) | `8799` | Pinecone/Weaviate |
| integrations | WireMock (ATS/HRIS/calendar/comms OAuth) | `8800` | Workday/Greenhouse/Google/MS |
| delivery | OTel Collector (OTLP) | `8785` | Vendor OTLP ingest |
| delivery | Prometheus / Jaeger / Grafana | `8784` / `8786` / `8783` | Managed monitoring |

Start nothing by default — each profile is explicit:

```bash
docker compose -f docker-compose.providers.yml --profile <identity|data|media|ai|integrations|delivery> up -d
```

AI evaluation, red-team, and human-review operations remain application-level
guards in `services/ai` (consent checks, `requires_human_judgment`, tenant
mismatch rejection); the Docker services only provide the model/vector/KMS/
streaming backends. WireMock stubs live in `scripts/mocks/wiremock/`.

## Foundation Batch 01 — implemented service boundaries

### Identity, tenancy, and authorization

- `apps/api/src/auth.mjs` signs and verifies short-lived local demo JWTs with tenant, organization, roles, and attributes.
- `apps/api/src/authorization.mjs` applies permission checks and assignment-aware candidate rules at each route and realtime room join.
- `apps/api/src/organization.mjs` models the tenant hierarchy independently from the UI workspace selector.
- The demo login is a development seam, **not** a production identity system. Use OIDC/SAML validation, SCIM provisioning, MFA, and KMS-backed key management before deployment.

### Consent and audit integrity

- `POST /api/interviews/:id/consent` persists a versioned choice record, writes a `consent.updated` event, and appends an audit entry.
- `AuditLedger` uses a separate SHA-256 append-only chain per tenant. It exposes a verification endpoint and freezes records after append.
- Candidate preflight encrypts only non-sensitive recovery state using Web Crypto AES-GCM with a session-scoped key; recordings, tokens, credentials, and transcript text are deliberately excluded.

### Realtime and observability

- Socket.IO handles authenticated room presence, permission-checked joins, lightweight device-state signaling, and a short connection recovery window.
- `services/event-gateway` remains the durable-event boundary; replace the memory adapter with a Kafka producer/consumer and schema registry in production.
- `apps/api/src/telemetry.mjs` initializes OpenTelemetry SDK hooks and uses named spans/counters around control-plane actions. Configure the production exporter through environment/deployment settings.

## 50% foundation control plane

`apps/api/src/platformServices.mjs` is the local implementation seam for the second delivery batch. It keeps workflow, rubric, code-evaluation, model, artifact, job, schema, data-quality, feature-flag, SLO, incident, analytics, security-policy, and webhook behavior in an explicit in-memory boundary.

The React **Control Center** (`src/components/FoundationHub.jsx`) drives those APIs with tenant-scoped authenticated requests when `VITE_USE_API=true`, and uses the same-shaped local fixtures otherwise. This preserves a functional demo without misrepresenting an external provider as present.

### Production replacement map

| Local foundation | Production replacement |
|---|---|
| Static code evaluator | Isolated multi-language sandbox, hidden tests, resource caps, malware policy |
| In-memory jobs | Durable queue/workers with retries, DLQ, scheduling, and monitoring |
| In-memory schemas/catalog | Kafka Schema Registry plus managed catalog/lineage store |
| Local AES-GCM key | KMS/HSM-backed envelope encryption, rotation, access policies, CMK support |
| Static SLO/analytics data | Real telemetry, warehouse semantic model, alert routing, RBAC dashboards |
| Test webhook registration | Provider delivery workers, signing keys, retry/reconciliation, delivery logs |

## 100% provider-ready completion layer

`apps/api/src/completionServices.mjs` contains the final 50 safe local/provider-ready adapters. Its seven domains cover AI automation, data platform, media experience, scheduling, trust/risk, delivery/SRE, and enterprise ecosystem needs.

The React **Enterprise Scale** surface (`src/components/CompletionHub.jsx`) invokes `POST /api/completion/:domain/:action`. The generic action boundary is deliberately constrained:

1. Resolve a pre-declared capability/action; arbitrary code or URLs are not accepted.
2. Require an authenticated principal and domain-specific permission.
3. Accept only a small object payload.
4. Require an idempotency key, append an audit entry, and publish a contract event.
5. Return a deterministic local result that explains its provider-production dependency.

This lets all PRD capabilities be reviewed, demonstrated, tested, and integrated without embedding vendor credentials or pretending that a provider exists.

## Performance and accessibility guardrails

- Keep the initial product shell below **120 KB gzipped JavaScript** and **25 KB gzipped CSS**; enforce via CI bundle budgets.
- Lazy-load large, infrequently visited enterprise areas (analytics, recording playback, admin reports) after product routing is added.
- Respect `prefers-reduced-motion`; do not rely on color alone for trust or connection state.
- Use native buttons, labels, and inputs before adding abstraction; all interactive elements require keyboard/focus behavior.
- Measure Web Vitals with real-user monitoring and tie long-task/reconnect events to the interview session trace.

## Security controls to retain during implementation

- Require authenticated user + tenant scope for every API action and WebSocket room event.
- Use signed, short-lived media URLs and one-time interview admission tokens.
- Keep recordings, transcript raw data, and AI prompts out of general application logs.
- Apply authorization again at search/export/render boundaries—not solely at route entry.
- Make integrity signals advisory and reviewable; never auto-disposition a candidate from a model output.
