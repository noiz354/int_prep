# SignalRoom — Enterprise Interview Intelligence Platform

A polished, runnable **100-feature foundation** for the enterprise video-interviewing PRD. Every PRD item has a local implementation boundary or provider-ready adapter; external providers remain intentionally unconfigured until production decisions are approved. The platform uses a React/Vite experience, Express control plane, Python AI adapter, and contract-first Kafka-compatible event adapter.

> **What is runnable now:** the responsive React product experience and interactive workflows. The API and Python service are runnable locally as realistic, privacy-aware mocks. They intentionally do not claim to be live WebRTC, Kafka, ATS, SSO, or model-provider deployments.

## Experience included

- Interview operations dashboard with schedules, role briefs, health, and live-session entry.
- A responsive **Live Studio** with simulated WebRTC room state, transcript controls, private AI copilot, independent scorecard, collaborative code workspace, and optional Socket.IO room presence.
- A consent-aware **Candidate Portal** with browser-controlled camera/microphone preflight, connection state, accommodation guidance, and encrypted, time-limited offline setup recovery.
- AI intelligence, Kafka/data pulse, trust center, reliability, integrations, **Control Center**, **Enterprise Scale**, and a searchable catalog covering all **100 PRD features** (100 marked as local foundations/provider-ready adapters).
- Keyboard command menu (`Cmd/Ctrl + K`), dark mode, responsive navigation, semantic controls, focus states, and reduced-motion support.
- Signed local demo sessions, tenant/role authorization, hash-chained audit entries, consent API, browser event bus, and scorecard persistence seams.

## Run the app

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The development server is configured to bind to `0.0.0.0` for a hosted workspace preview.

### Run the authenticated/realtime local path

```bash
# Terminal 1 — Express + JWT demo adapter + Socket.IO + OpenTelemetry hooks
npm run api

# Terminal 2 — browser routes its relative /api and /socket.io requests through Vite
VITE_USE_API=true npm run dev
```

The development login is intentionally restricted to seeded demo identities. Replace it with an approved OIDC/SAML/SCIM provider before any real deployment.

### Optional Python AI adapter

```bash

# Python AI adapter (Python 3.11+ recommended)
python -m venv .venv
. .venv/bin/activate
pip install -r services/ai/requirements.txt
AI_PORT=8788 uvicorn services.ai.main:app --host 0.0.0.0 --port 8788
```

### Optional local provider adapters (Docker)

Lightweight, opt-in containers that stand in for the production-backlog
providers so each capability has a runnable local boundary. Nothing runs by
default; start only the profile you need:

```bash
# Identity: OIDC/SAML/SCIM/MFA (Keycloak)
docker compose -f docker-compose.providers.yml --profile identity up -d

# Data: encrypted MongoDB + Vault (KMS) + Redpanda (Kafka/Schema Registry) + MinIO (lakehouse)
docker compose -f docker-compose.providers.yml --profile data up -d

# Media: SFU harness + coturn (TURN) + recording storage + isolated code sandbox
docker compose -f docker-compose.providers.yml --profile media up -d

# AI/RAG: Qdrant (vector store) in Docker; Ollama runs natively on the Windows host
#   (OLLAMA_HOST=0.0.0.0) and is reachable from WSL at the gateway IP — see .env.example
docker compose -f docker-compose.providers.yml --profile ai up -d

# Integrations: WireMock stubs for ATS/HRIS/calendar/comms OAuth
docker compose -f docker-compose.providers.yml --profile integrations up -d

# Delivery: OTel Collector + Prometheus + Jaeger + Grafana
docker compose -f docker-compose.providers.yml --profile delivery up -d
```

These are **provider-ready local adapters** — the SignalRoom control plane still
enforces consent, tenant isolation, authorization, and audit on top of them.
They are intentionally not production deployments.

### Ports

| Service | Port |
|---|---|
| Vite dev server | `5190` |
| Vite preview | `4190` |
| Express API (`npm run api`) | `8787` |
| Python AI adapter | `8788` |
| Local providers (Docker) | `8780`–`8802` (see `docker-compose.providers.yml`) |

Run the contract and domain tests:

```bash
npm test
```

Generate the browser-safe feature dataset again after editing either PRD part:

```bash
node scripts/generate-feature-data.mjs
```

## Repository map

```text
src/                              React experience and local demo adapters
  components/                     Product domains, Control Center, Enterprise Scale, reusable UI
  data/features.js                Generated catalog of all 100 PRD capabilities
  data/implementationStatus.js    Canonical 100-feature foundation registry
  lib/                            Browser event, scorecard, and API adapters
apps/api/                         Express API + repository, foundation, and completion domain seams
services/ai/                      Consent-aware FastAPI adapter
services/event-gateway/           Event envelope + in-memory/Kafka-style adapters
docs/                             PRD, architecture, API, and implementation status
```

## Engineering posture

This implementation follows a performance- and user-centered approach:

- **Progressive complexity:** native controls, no heavy UI framework, and a fast static initial shell.
- **Measured budget:** current production build is approximately **119 KB gzipped JavaScript** and **21 KB gzipped CSS** (before browser compression variations); the Socket.IO client is only activated when `VITE_USE_API=true`.
- **Accessibility:** keyboard navigation, semantic tabs and dialogs, clear focus styling, responsive layouts, live-status messaging, browser-native device permission prompts, and `prefers-reduced-motion` support.
- **Trust by design:** signed tenant sessions, explicit consent controls, permission checks, hash-chained audit entries, tenant context in event contracts, human-review language, and idempotent mutation seams.
- **No fake production claims:** integrations and media/AI event flows use labeled mocks/adapters until a provider, credentials, and deployment environment are chosen.

See [Architecture](docs/ARCHITECTURE.md), [API contract](docs/API.md), [Tech stack & feature map](docs/TECH-STACK.md), [Foundation Batch 01](docs/FOUNDATION-BATCH-01.md), [50% feature delivery](docs/BATCH-50-FEATURES.md), [100% feature delivery](docs/BATCH-100-FEATURES.md), and [implementation status](docs/IMPLEMENTATION-STATUS.md) for the production handoff.

Coding-agent prompts:

- [Finish stubs (Phases 0–5, done)](PROMPT-FINISH-STUBS-PHASED.md) — adapter boundaries only.
- [User-usable production path (Phases U0–U7)](PROMPT-USER-USABLE-PRODUCTION.md) — wire providers + replace mocked UI so a human can actually complete journeys. Start at **Phase U0**.
