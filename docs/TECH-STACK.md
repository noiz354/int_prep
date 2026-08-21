# SignalRoom — Tech Stack & Feature Map

> Dokumen ini menjelaskan tech stack dan fitur per area engineering: frontend,
> backend, data analytics, data engineering, machine learning, dan AI agent.
> Status semua fitur: **local foundation / provider-ready adapter** — bukan
> klaim production. Lihat `progess.md` untuk status delivery resmi.

## Gambaran arsitektur

```text
┌────────────────────────── Browser / React ──────────────────────────┐
│  src/  · React 19 · Vite 8 · responsive · a11y · Web Crypto         │
│  Dashboard · Live Studio · Candidate Portal · AI Intelligence       │
│  Data Pulse · Trust Center · Reliability · Control Center           │
│  Enterprise Scale · Integrations · Feature Catalog                  │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ relative /api + /socket.io (Vite proxy)
┌───────────────────────────────▼─────────────────────────────────────┐
│  apps/api/  · Express 5 · JWT (jose) · Socket.IO 4 · Zod            │
│  Auth/tenant/RBAC · audit hash-chain · idempotency · rate limit     │
│  Interview lifecycle · scorecard · consent · artifacts · jobs       │
│  Platform services (50 fitur) · Completion services (50 fitur)      │
│  OpenTelemetry hooks                                                │
└──────────┬──────────────────────────────┬───────────────────────────┘
           │                              │
┌──────────▼────────────┐   ┌─────────────▼───────────────────────────┐
│ services/event-gateway │   │ services/ai/  · Python FastAPI          │
│ Event envelope v1.0    │   │ Copilot · transcription · integrity     │
│ MemoryEventBus → Kafka │   │ consent-gated · human-review metadata   │
└────────────────────────┘   └─────────────────────────────────────────┘
```

## 1. Frontend (React / Vite)

### Tech stack
| Lapisan | Teknologi | Catatan |
|---|---|---|
| Framework | React 19 (`react`, `react-dom`) | Function components + hooks |
| Build tool | Vite 8 (rolldown) | Dev `:5190`, preview `:4190` |
| Bahasa | JavaScript (JSX, ESM) | `src/**/*.jsx` |
| Styling | CSS custom (design tokens) | `dist` ~105 KB CSS / ~407 KB JS (minified) |
| Testing | Vitest 4 + jsdom + Testing Library | Browser utility tests |
| Realtime | `socket.io-client` (hanya saat `VITE_USE_API=true`) | Presence + signaling |
| Browser API | Web Crypto (AES-GCM), MediaDevices preflight | Consent-aware |

### Fitur & komponen
| Komponen | Fitur |
|---|---|
| `Sidebar.jsx` | Navigasi utama, workspace switcher (Northstar Systems), badge live/batch |
| `Dashboard.jsx` | Overview: jadwal interview, role brief, health, live-session entry |
| `Interviews.jsx` | Daftar interview, status lifecycle, detail |
| `LiveStudio.jsx` | Room state simulasi WebRTC, kontrol transcript, AI copilot privat, scorecard, code workspace |
| `CandidatePortal.jsx` | Consent flow, media preflight, koneksi, aksesibilitas, encrypted offline draft |
| `Intelligence.jsx` | AI intelligence view (AI Agent domain) |
| `DataPulse.jsx` | Data engineering view: schemas, quality, catalog, replay |
| `TrustCenter.jsx` | Security/privacy/compliance: consent, audit, DLP, residency |
| `Operations.jsx` | Reliability: SLO, incident, runbook |
| `FoundationHub.jsx` | Control Center — 50 fitur batch pertama |
| `CompletionHub.jsx` | Enterprise Scale — 50 fitur batch kedua |
| `Integrations.jsx` | Connector & workflow marketplace (label mocks) |
| `FeatureCatalog.jsx` | Katalog 100 fitur PRD yang bisa dicari |
| `Topbar.jsx` / `Icon.jsx` | Shell UI, ikon, Cmd+K command menu |

### Prinsip
- Responsive, keyboard navigation, semantic HTML, focus states, `prefers-reduced-motion`.
- Media permission hanya via user gesture; stop tracks setelah preflight.
- Draft offline dienkripsi AES-GCM session-scoped; tidak menyimpan token/media/transkrip.

## 2. Backend (Express control plane)

### Tech stack
| Lapisan | Teknologi |
|---|---|
| Runtime | Node.js 22 (ESM) |
| Framework | Express 5 |
| Auth/session | `jose` (JWT) — demo login → OIDC/SAML adapter |
| Validation | Zod schemas |
| Realtime | Socket.IO 4 (auth middleware, connection recovery 120s) |
| Observability | `@opentelemetry/api`, `sdk-node`, auto-instrumentations |
| Repository | `MemoryInterviewRepository` → MongoDB adapter production |
| Event | `MemoryEventBus` → Kafka adapter production |

### Boundary keamanan (non-negotiable)
- **Auth**: `POST /api/auth/demo-login` → JWT 4 jam; semua `/api/*` wajib auth (`requireAuthentication`).
- **Tenant**: `X-Tenant-Id` dicek vs principal (`tenantFor`), mismatch → 403.
- **RBAC/ABAC**: `hasPermission`/`requirePermission` per route + resource-scoped (interviewId).
- **Idempotency**: header `Idempotency-Key` wajib untuk mutation; replay dideteksi.
- **Rate limit**: 120 req/menit per principal.
- **Audit**: `AuditLedger` SHA-256 hash-chain per tenant, bisa diverifikasi (`/api/audit/verify`).
- **Consent**: endpoint consent versioned; event `consent.updated`.
- **Security headers**: nosniff, X-Frame-Options DENY, Referrer-Policy, no-store, Permissions-Policy.
- **Telemetry**: spans/counters bernama di action material.

### API surface (ringkas)
| Area | Endpoint |
|---|---|
| Health/auth | `/api/health`, `/api/auth/demo-login`, `/api/auth/session` |
| Organization | `/api/organization/current` |
| Features | `/api/features` (100 item) |
| Interviews | CRUD, `transition`, `artifacts`, `scorecards`, `consent`, `debrief` |
| AI | `/api/ai/follow-up`, `/api/ai/code-evaluation`, `/api/ai/models` |
| Data | `/api/data/schemas`, `schema-validate`, `telemetry`, `quality`, `catalog`, `replay`, `deletion` |
| Platform | `/api/workflows`, `requisitions`, `analytics/overview`, `jobs`, `feature-flags` |
| Ops | `/api/operations/slo`, `incidents` |
| Security | `/api/security/policy`, `envelope-encrypt`, `/api/privacy/redact` |
| Webhooks | CRUD webhook |
| Completion | `/api/completion/:domain/:action` (50 fitur Enterprise Scale) |
| Audit/events | `/api/audit`, `/api/audit/verify`, `/api/events` |
| Realtime | Socket.IO `room.join`, `room.action`, `presence.updated` |

### Ports
| Service | Port |
|---|---|
| Express API | `8787` |
| Vite dev / preview | `5190` / `4190` |

## 3. Data Analytics

### Tech stack (saat ini local foundation)
| Lapisan | Teknologi |
|---|---|
| Event source | `services/event-gateway` envelope v1.0 (tenant + idempotency wajib) |
| Store | In-memory event log (`MemoryEventBus`) → Kafka/Redpanda + lakehouse |
| Analytics API | `platformServices.mjs` → `platform.analytics()`, `dataQuality()`, `dataCatalog()` |
| Visualisasi | React `DataPulse.jsx` |
| Vector store (RAG) | Qdrant (`:8799`) — provider adapter opsional |

### Fitur analytics
- **Overview analytics**: metrik agregat interview/scorecard (weighted, evidence-aware).
- **Data quality**: validasi schema, profil kualitas data, catalog dataset.
- **Telemetry analytics**: latency, packet loss, jitter per interview (`/api/data/telemetry`).
- **Semantic metrics**: scorecard berbobot dengan completeness + evidence (lihat `scorecard.js`).
- **Unified search**: katalog fitur + data catalog yang bisa dicari.
- **Export/reporting**: batch reporting adapter (Enterprise Scale).

## 4. Data Engineering

### Tech stack
| Lapisan | Teknologi |
|---|---|
| Contract | Event envelope v1.0, `allowedEventTypes` (19 jenis event) |
| Adapter saat ini | `MemoryEventBus` (in-memory, dedup by idempotency key) |
| Adapter produksi | `KafkaProducerAdapter` → Redpanda/Kafka + Schema Registry (`:8790`/`:8791`) |
| Object store | MinIO (`:8792`) — lakehouse landing / recording storage |
| Vector store | Qdrant (`:8799`) |
| KMS | Vault (`:8780`) untuk envelope encryption |
| DB produksi | MongoDB terenkripsi (`:8782`) |

### Fitur data engineering
- **Contract-first events**: `createEvent` memvalidasi tipe, tenant, idempotency; versi eksplisit.
- **CDC / ingestion**: adapter secure ingestion (Enterprise Scale), event envelope stabil.
- **Schema Registry boundary**: `KafkaProducerAdapter` + topic resolver; schema validation via Zod.
- **Replay**: `POST /api/data/replay` — replay offset dari event log.
- **Deletion (GDPR)**: `POST /api/data/deletion` — privacy deletion job.
- **Feature store**: adapter di `platformServices` (features, flags).
- **Lakehouse**: MinIO landing; pipeline ETL adapter (Enterprise Scale).
- **Backup/restore**: MinIO replication + restore adapter (Enterprise Scale).
- **Lineage**: catalog + lineage metadata di `dataCatalog()`.

## 5. Machine Learning

> Catatan jujur: **tidak ada model ML yang dilatih/dijalankan di sini.** Yang ada
> adalah boundary adapter yang siap dihubungkan ke provider model. Evaluasi,
> red-team, dan human review tetap di layer aplikasi.

### Tech stack
| Lapisan | Teknologi |
|---|---|
| Model provider lokal | Ollama di Windows host (`172.24.16.1:11434`) — `granite3.1-dense:2b`, `llama3.1`, `qwen3`, `nomic-embed-text` |
| RAG vector store | Qdrant (`:8799`) |
| AI adapter | `services/ai/main.py` — FastAPI, Pydantic, deterministic rules |
| Model registry | `platform.modelRegistry()`, `stageModel()` — staging lifecycle |

### Fitur ML (provider-ready)
- **Model registry & staging**: daftar model, stage/rollback, versioning.
- **Embedding**: `nomic-embed-text` (768-dim) via Ollama — terverifikasi dari WSL.
- **RAG**: Qdrant sebagai vector store; grounding tenant-isolated (AI-04).
- **Evaluation harness**: adapter evaluasi model (Enterprise Scale) — menunggu provider.
- **Red-team**: adapter red-team (Enterprise Scale) — menunggu provider.
- **Human-review**: semua output AI wajib `requires_human_judgment: true`; tidak ada auto-disposition.

## 6. AI Agent

### Tech stack
| Lapisan | Teknologi |
|---|---|
| Adapter | `services/ai/main.py` (FastAPI, consent-gated, tenant-checked) |
| AI di API | `platformServices.mjs` — follow-up suggestion, code evaluation, debrief |
| UI | `Intelligence.jsx` + `LiveStudio.jsx` (AI copilot panel) |
| Events | `ai.copilot.followup.created`, `ai.code.evaluated` |

### Fitur AI Agent
| Fitur | Endpoint / behavior |
|---|---|
| Streaming multilingual transcription (AI-01) | `POST /v1/transcription/segment` → async job contract |
| AI interviewer agent (AI-02) | Enterprise Scale adapter (menunggu provider) |
| Adaptive follow-up engine (AI-03) | `POST /api/ai/follow-up` — neutral question + confidence |
| Job-description & rubric grounding (AI-04) | Grounded in approved rubric/transcript |
| Resume & portfolio intelligence (AI-05) | Enterprise Scale adapter |
| Explainable competency scoring (AI-06) | `calculateScorecard` + `explainScorecard` — per-competency + excerpt link |
| Live interviewer copilot (AI-07) | Panel AI copilot di Live Studio |
| Behavioral signal analysis (AI-08) | Enterprise Scale adapter — tanpa inferensi protected traits |
| Code evaluation (AI-09) | `POST /api/ai/code-evaluation` — static heuristic local adapter |
| Debrief generation | `POST /api/interviews/:id/debrief` — coverage + high-priority review job |

### Governance (non-negotiable)
- **Consent-gated**: tiap endpoint AI wajib consent (`consent_for_ai`, `consent_for_transcription`, `consent_for_integrity_processing`).
- **Tenant-checked**: `X-Tenant-Id` mismatch → 403.
- **No automated disposition**: output selalu advisory (`requires_human_judgment: true`), `automated_decision: false`.
- **No protected-trait inference**: signal analysis mengecualikan inferensi trait dilindungi.
- **Evidence-linked**: scorecard terhubung ke transcript excerpt, rubric criteria, confidence.

## Referensi lanjutan
- `docs/ARCHITECTURE.md` — arsitektur sistem & provider replacement map
- `docs/API.md` — kontrak API lengkap
- `docs/PRD-100-Features.md` — 100 fitur PRD
- `docs/BATCH-100-FEATURES.md` — batch final 50 fitur
- `progess.md` — status delivery & verifikasi
- `docker-compose.providers.yml` — provider adapter lokal (Docker opt-in)
