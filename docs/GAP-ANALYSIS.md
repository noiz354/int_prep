# SignalRoom Production Readiness Gap Analysis

**Date:** 2026-08-21
**Scope:** SignalRoom vs 10 reference projects across WebRTC, RAG/AI, and Observability domains

---

## Executive Summary

SignalRoom has solid architectural foundations (adapter-ready PRD, bounded contexts, demo flows) but lacks production hardening across all domains. The reference projects reveal **37 specific gaps** that must be closed before production. The most critical gaps are: no TURN server, no OTel SDK instrumentation, no RBAC-aware RAG retrieval, and no connection recovery/reconnection logic.

---

## 1. WebRTC / Video Interview Gaps

### Reference Projects Analyzed
| Project | Approach | Key Strength |
|---------|----------|--------------|
| VirtualHire | P2P (raw RTCPeerConnection) | Subtitles via Web Speech API |
| TalentIQ | SFU (Stream Video SDK) | Full Clerk auth + Inngest background jobs |
| HireLink | SFU (Stream Video SDK) | Session lifecycle with cleanup |
| mockpad | P2P + Yjs CRDT signaling | Memory management, room TTLs, health endpoints |

### Critical Gaps

#### GAP-1: No TURN Server (Critical)
- **All repos except Stream-based ones:** STUN-only → will fail behind corporate NATs/firewalls
- **Stream-based repos:** Managed TURN (vendor dependency)
- **SignalRoom:** No TURN/STUN config at all
- **Required:** Deploy coturn or use Twilio TURN. For enterprise interviews behind corporate firewalls, TURN is non-negotiable.

#### GAP-2: No Connection Recovery / Reconnection (Critical)
- **VirtualHire:** Socket.IO auto-reconnect only, no ICE restart
- **TalentIQ/HireLink:** Stream SDK handles internally
- **mockpad:** Yjs auto-reconnect + stuck detection (8s timeout) + reconnection banner
- **SignalRoom:** No `onconnectionstatechange` handler, no ICE restart logic
- **Required:** Implement connection state monitoring, ICE restart on failure, user-visible reconnection status.

#### GAP-3: No Recording with Cloud Storage (High)
- **All repos:** None implement cloud-recorded video
- **mockpad:** Client-side MediaRecorder (webm download)
- **Required:** Cloud recording (S3) for compliance, review, and audit. WebRTC recording → upload → S3 with presigned URLs.

#### GAP-4: No Participant Cap Enforcement (Medium)
- **TalentIQ/HireLink:** 2 participants enforced
- **mockpad:** 8 per room enforced
- **VirtualHire:** Unlimited (no enforcement)
- **SignalRoom:** No cap enforcement
- **Required:** Server-side participant limit per room type.

#### GAP-5: No Auth on WebSocket Signaling (High)
- **VirtualHire:** No auth on socket connection
- **mockpad:** No auth (sessionStorage UUID)
- **TalentIQ/HireLink:** Stream tokens server-generated
- **SignalRoom:** Needs authenticated signaling with JWT verification on socket connect

#### GAP-6: No Rate Limiting on Signaling (Medium)
- **mockpad:** MAX_ROOMS=40, MAX_CONN_PER_ROOM=8, MAX_TOTAL_CONN=80
- **All others:** No rate limiting
- **Required:** Server-side rate limits on room creation, connection attempts

#### GAP-7: No Screen Sharing (Medium)
- **None of the repos** implement screen sharing
- **Required:** For enterprise interviews, screen sharing is a key feature

#### GAP-8: No Network Quality Indicators (Low)
- **None of the repos** show connection quality to users
- **Required:** WebRTC getStats() → display quality indicator

### What SignalRoom Already Has (vs references)
- ✅ P2P WebRTC with Socket.IO signaling (matches VirtualHire pattern)
- ✅ Candidate portal with consent flow (better than all references)
- ✅ Interview CRUD with status lifecycle (matches TalentIQ/HireLink)
- ✅ Code editor integration (matches mockpad/VirtualHire)

---

## 2. RAG / AI Gaps

### Reference Projects Analyzed
| Project | LLM | Vector DB | Key Strength |
|---------|-----|-----------|--------------|
| airgapped-rag | Ollama + LiteLLM gateway | Qdrant | Langfuse audit, rate limiting |
| RAG-Enterprise | eullm (Ollama-compatible) | Qdrant + gRPC | Provenance IDs, benchmarking |
| ragdemo | Ollama / OpenAI-compatible | Qdrant | RBAC filters, eval framework, citations |
| Multi-Tenant-Platform | Ollama | Qdrant | Team-based Qdrant filters, JWT |
| rbac-rag-assistant-demo | Ollama | Qdrant/Chroma | Department RBAC, defense-in-depth, eval |

### Critical Gaps

#### GAP-9: No RBAC-Aware RAG Retrieval (Critical)
- **ragdemo:** Qdrant payload filter `(department, permission_level)` during ANN search
- **rbac-rag-assistant-demo:** Department-based must-filter + defense-in-depth post-filter
- **Multi-Tenant:** Team-based Qdrant filter (JWT carries team)
- **SignalRoom:** No tenant/role-aware vector search filters
- **Required:** Qdrant `must_filter` on tenant_id + role from JWT. Post-retrieval defense-in-depth check.

#### GAP-10: No Audit Logging for AI Queries (Critical)
- **airgapped-rag:** Langfuse `CallbackHandler` on every RAG chain invocation
- **RAG-Enterprise:** SQLite + structured tracing
- **ragdemo:** SQLite `QueryLog` table (query, answer, retrieved_chunks, latencies)
- **rbac-rag-assistant-demo:** Session-local analytics + `AccessDecisionTrace`
- **SignalRoom:** No structured audit of AI queries
- **Required:** Log every query, response, retrieved chunks, latency, and user identity to an audit table.

#### GAP-11: No Citation/Provenance Tracking (High)
- **ragdemo:** Numbered citations [1][2] in prompt, source/page in context
- **RAG-Enterprise:** Deterministic `provenance_id` per chunk (content_sha256 + chunk_index + config_version)
- **rbac-rag-assistant-demo:** Structured `Citation` objects with citation_id, document_id, department, section, score, snippet
- **SignalRoom:** No citation system
- **Required:** Track chunk provenance, return citations with responses, enable source verification.

#### GAP-12: No Evaluation Framework (High)
- **ragdemo:** `retrieval_hit` + `answer_hit` metrics via `EvalRecord` table
- **rbac-rag-assistant-demo:** 7-suite deterministic eval (correctness, cross-department, prompt_injection, indirect_requests, mixed_scope, citation_integrity, thread_isolation)
- **RAG-Enterprise:** `--bench` mode profiles all stages
- **SignalRoom:** No eval framework
- **Required:** Automated eval for retrieval quality, answer correctness, RBAC leak detection.

#### GAP-13: No LiteLLM Gateway (Medium)
- **airgapped-rag:** LiteLLM proxy at `localhost:4000` with rate limiting (120 RPM chat, 2000 RPM embeddings)
- **SignalRoom:** Direct Ollama calls without rate limiting or provider abstraction
- **Required:** LiteLLM or similar gateway for rate limiting, failover, cost tracking.

#### GAP-14: No Chunking Strategy Optimization (Medium)
- **airgapped-rag:** 350 chars, 50 overlap (small chunks for precision)
- **RAG-Enterprise:** 1000 chars, 100 overlap (larger chunks for context)
- **ragdemo:** 500 chars, 80 overlap (balanced)
- **rbac-rag-assistant-demo:** 800 words (~6400 chars), 150 overlap (large for context-rich retrieval)
- **SignalRoom:** Unknown chunking strategy
- **Required:** Benchmark different chunk sizes for interview transcripts. Consider interview-specific chunking (by turn/topic).

#### GAP-15: No Structured Citation Objects (Medium)
- **ragdemo:** `Citation` objects with citation_id, document_id, section, score
- **RAG-Enterprise:** Provenance IDs with byte offsets
- **SignalRoom:** No structured citation return format
- **Required:** Return structured citations that the frontend can render as clickable source references.

---

## 3. Observability / OTel Gaps

### Reference Project Analyzed
| Project | Stack | Key Strength |
|---------|-------|--------------|
| otel-example-nodejs | Grafana Alloy + Tempo + Mimir + Loki | Full LGTM stack, cross-signal correlation, SLO dashboards |

### Critical Gaps

#### GAP-16: No OTel SDK Bootstrap Pattern (Critical)
- **otel-example-nodejs:** `-r ./src/instrumentation.js` loads OTel before any other code
- **SignalRoom:** No OTel bootstrap pattern documented
- **Required:** Implement `node -r ./src/instrumentation.js` pattern for Express API.

#### GAP-17: No Custom Metrics Module (Critical)
- **otel-example-nodejs:** Centralized `metrics.js` with histograms, counters, up-down counters, observable gauges
  - `http.server.request.duration` (histogram)
  - `http.server.requests.total` (counter)
  - `http.server.requests.active` (up-down counter)
  - `db.query.duration` (histogram)
  - `db.queries.total` / `db.errors.total` (counters)
  - `process.memory.usage` (observable gauge)
- **SignalRoom:** No custom metrics definitions
- **Required:** Define SLO-relevant metrics for interview platform: join latency, recording duration, AI response time, RAG query latency.

#### GAP-18: No Selective Auto-Instrumentation (Medium)
- **otel-example-nodejs:** Disables Express, HTTP, MySQL2 auto-instrumentations and configures manually with custom hooks (request/response body size, health check filtering)
- **SignalRoom:** No selective instrumentation
- **Required:** Disable noisy auto-instrumentations, add custom hooks for domain-specific attributes.

#### GAP-19: No Metrics Middleware (Medium)
- **otel-example-nodejs:** `metricsMiddleware.js` tracks active requests, records duration on `res.on('finish')`, structured logging
- **SignalRoom:** No request-level metrics collection
- **Required:** Implement middleware that records request duration, status code, route to OTel metrics.

#### GAP-20: No LGTM Stack (High)
- **otel-example-nodejs:** Full Grafana stack (Alloy → Tempo + Mimir + Loki + MinIO)
  - Cross-signal correlation: metrics → traces → logs navigation
  - SLO dashboards: P50/P90/P99 latency, success rate, DB performance
  - Health check filtering to prevent span explosion
- **SignalRoom:** No observability stack deployed
- **Required:** Deploy OTel Collector + Tempo + Grafana at minimum. Add Mimir + Loki for full observability.

#### GAP-21: No Graceful Shutdown for OTel (Medium)
- **otel-example-nodejs:** Two-layer shutdown: OTel SDK first, then HTTP server + DB pool, with 30s hard timeout
- **SignalRoom:** No OTel shutdown handling
- **Required:** Implement proper shutdown ordering to flush pending spans/metrics.

#### GAP-22: No Trace ID in Error Responses (Low)
- **otel-example-nodejs:** Returns `traceId` in error responses for support correlation
- **SignalRoom:** No trace correlation in errors
- **Required:** Include trace ID in API error responses for debugging.

#### GAP-23: No SLO Dashboard (Medium)
- **otel-example-nodejs:** Pre-provisioned Grafana dashboard with 14 panels covering traffic, latency percentiles, error rates, DB performance, memory, uptime
- **SignalRoom:** No SLO dashboards
- **Required:** Create dashboards for interview platform SLOs: join success rate, call duration, AI response time, RAG latency.

---

## 4. Security & Compliance Gaps (Cross-cutting)

#### GAP-24: No CORS Allowlist (High)
- **VirtualHire:** `origin: "*"` (dangerous)
- **TalentIQ/HireLink:** `credentials: true`, explicit origin
- **otel-example-nodejs:** Helmet + explicit CORS allowlist
- **SignalRoom:** Needs explicit CORS origin configuration

#### GAP-25: No Rate Limiting on API (High)
- **None of the repos** implement API rate limiting
- **airgapped-rag:** LiteLLM rate limiting (120 RPM)
- **Required:** Express rate limiting middleware (express-rate-limit or similar)

#### GAP-26: No Input Validation on Signaling (Medium)
- **All raw WebRTC repos:** No validation on WebSocket messages
- **otel-example-nodejs:** Joi validation on API inputs
- **Required:** Validate all signaling messages (offer/answer/ICE candidates) server-side

#### GAP-27: No Request Body Size Limits (Low)
- **otel-example-nodejs:** `express.json({ limit: '10mb' })`
- **SignalRoom:** Needs explicit body size limits

#### GAP-28: No Security Headers (Low)
- **otel-example-nodejs:** Helmet with CSP, HSTS, etc.
- **SignalRoom:** Needs Helmet or equivalent

---

## 5. Infrastructure & Deployment Gaps

#### GAP-29: No Docker Production Hardening (High)
- **otel-example-nodejs:** Multi-stage build, non-root user, healthcheck, dependency ordering
- **SignalRoom:** Needs production Dockerfiles with security hardening

#### GAP-30: No Health Check Endpoints (Medium)
- **mockpad:** `/health` returns rooms/connections/heap/rss/uptime
- **otel-example-nodejs:** `/health/live` + `/health/ready`
- **SignalRoom:** Needs liveness + readiness probes

#### GAP-31: No Structured Logging (Medium)
- **otel-example-nodejs:** Pino with service metadata, trace correlation
- **ragdemo:** SQLite query logging
- **SignalRoom:** Needs structured JSON logging with service context

#### GAP-32: No Database Connection Pool Management (Medium)
- **otel-example-nodejs:** Explicit pool close on shutdown, connection tracking metrics
- **SignalRoom:** Needs pool monitoring and graceful shutdown

#### GAP-33: No Backup Strategy (Low)
- **RAG-Enterprise:** Daily SQLite + Qdrant snapshot backups
- **SignalRoom:** No backup strategy documented

---

## 6. Testing & Quality Gaps

#### GAP-34: No RBAC Eval Framework (High)
- **rbac-rag-assistant-demo:** 7-suite eval: correctness, cross-department leak, prompt injection, indirect requests, mixed scope, citation integrity, thread isolation
- **ragdemo:** `retrieval_hit` + `answer_hit` metrics
- **SignalRoom:** No automated RBAC/security eval

#### GAP-35: No Benchmark Suite (Medium)
- **RAG-Enterprise:** `--bench` profiles extraction, chunking, embedding, upsert, prefill, decode per document
- **SignalRoom:** No performance benchmarks

#### GAP-36: No Integration Test Environment (Medium)
- **ragdemo:** Docker Compose with qdrant + backend + frontend for end-to-end testing
- **SignalRoom:** Needs docker-compose for integration testing

#### GAP-37: No Contract Tests for Signaling (Low)
- **None of the repos** have signaling protocol tests
- **Required:** Test offer/answer/ICE candidate exchange flows

---

## Priority Matrix

### P0 — Must Fix Before Production (Security/Data Loss Risk)
| Gap | Domain | Effort |
|-----|--------|--------|
| GAP-1: TURN Server | WebRTC | Medium |
| GAP-2: Connection Recovery | WebRTC | High |
| GAP-9: RBAC-Aware RAG | RAG/AI | High |
| GAP-10: AI Audit Logging | RAG/AI | Medium |
| GAP-16: OTel Bootstrap | Observability | Low |
| GAP-24: CORS Allowlist | Security | Low |
| GAP-25: API Rate Limiting | Security | Low |

### P1 — Should Fix Before Beta (Quality/Compliance)
| Gap | Domain | Effort |
|-----|--------|--------|
| GAP-3: Cloud Recording | WebRTC | High |
| GAP-5: Auth on Signaling | WebRTC | Medium |
| GAP-11: Citation Tracking | RAG/AI | Medium |
| GAP-12: Eval Framework | RAG/AI | High |
| GAP-17: Custom Metrics | Observability | Medium |
| GAP-20: LGTM Stack | Observability | High |
| GAP-29: Docker Hardening | Infrastructure | Medium |

### P2 — Nice to Have (Polish)
| Gap | Domain | Effort |
|-----|--------|--------|
| GAP-4: Participant Cap | WebRTC | Low |
| GAP-6: Signaling Rate Limits | WebRTC | Low |
| GAP-7: Screen Sharing | WebRTC | High |
| GAP-8: Network Quality | WebRTC | Medium |
| GAP-13: LiteLLM Gateway | RAG/AI | Medium |
| GAP-14: Chunking Optimization | RAG/AI | Medium |
| GAP-15: Structured Citations | RAG/AI | Medium |
| GAP-18-23: OTel refinements | Observability | Low-Medium |
| GAP-26-37: Infrastructure/testing | Cross-cutting | Low-Medium |

---

## Recommended Implementation Order

### Phase 1: Security Foundation (Week 1-2)
1. Deploy coturn TURN server
2. Add CORS allowlist + rate limiting + Helmet
3. Add JWT verification on WebSocket connect
4. Implement graceful shutdown for all services

### Phase 2: Observability (Week 2-3)
1. Implement OTel bootstrap pattern (`-r instrumentation.js`)
2. Deploy OTel Collector + Tempo + Grafana
3. Add custom metrics module (request duration, RAG latency, join success)
4. Create SLO dashboards

### Phase 3: RAG Hardening (Week 3-4)
1. Add Qdrant tenant/role filters from JWT
2. Implement audit logging for all AI queries
3. Add citation/provenance tracking
4. Build eval framework (retrieval + RBAC leak detection)

### Phase 4: WebRTC Production (Week 4-5)
1. Implement connection state monitoring + ICE restart
2. Add cloud recording (S3 upload)
3. Server-side participant caps
4. Network quality indicators

### Phase 5: Testing & Polish (Week 5-6)
1. Docker production hardening (multi-stage, non-root, healthchecks)
2. Integration test environment (docker-compose)
3. Benchmark suite for RAG + WebRTC
4. Structured logging with trace correlation

---

## Reference Project Quality Ranking

### WebRTC (production-readiness)
1. **mockpad** — Best P2P patterns (memory mgmt, room lifecycle, health, CRDT signaling)
2. **TalentIQ/HireLink** — Best managed approach (Stream SDK, Inngest, Clerk auth)
3. **VirtualHire** — Reference only (lacks TURN, auth, error handling)

### RAG/AI (production-readiness)
1. **ragdemo** — Best RBAC + eval + citations
2. **rbac-rag-assistant-demo** — Best defense-in-depth + eval suites
3. **RAG-Enterprise** — Best provenance tracking + benchmarking
4. **airgapped-rag** — Best governance (Langfuse + LiteLLM)
5. **Multi-Tenant-Platform** — Best team isolation pattern

### Observability (production-readiness)
1. **otel-example-nodejs** — Only reference, but production-grade (full LGTM stack, SLOs, cross-signal correlation)
