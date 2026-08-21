# Implementation Plan: SignalRoom Production Readiness

## Overview

Close 37 gaps identified in the gap analysis across 6 domains (WebRTC, RAG/AI, Observability, Security, Infrastructure, Testing) to bring SignalRoom from adapter-ready to production-ready. Work is organized into 5 phases with vertical slicing — each phase delivers a working, testable capability.

## Architecture Decisions

### 1. TURN Server: Self-hosted coturn
- **Decision:** Deploy coturn alongside existing infrastructure (already in `docker-compose.providers.yml`)
- **Rationale:** Enterprise interviews behind corporate firewalls require TURN. coturn is the standard. Container already exists but is not wired to clients.
- **Alternative considered:** Twilio TURN (managed, costs scale) — rejected for self-hosted control.

### 2. Observability: Extend existing OTel setup
- **Decision:** Build on the existing `packages/observability` and `scripts/otel/` infrastructure rather than replacing it
- **Rationale:** OTel SDK, auto-instrumentations, and structured logging already exist. Missing: Collector→Prometheus export, Tempo, Grafana datasource config, metrics middleware.
- **Alternative considered:** Full LGTM stack like otel-example-nodejs — too heavy for initial deployment; start with Tempo + Grafana.

### 3. RAG: Add vector search to existing Career Vault
- **Decision:** Extend `services/career-vault-rag/` with Qdrant integration and RBAC filters
- **Rationale:** The RAG service already has tenant scoping, citation logic, and abstention. Needs real vector search, audit logging, and eval.
- **Alternative considered:** Replace with ragdemo-style FastAPI — rejected; too much rework.

### 4. WebRTC: Enhance existing P2P mesh
- **Decision:** Keep P2P mesh, add TURN, connection recovery, recording
- **Rationale:** P2P is already implemented with Socket.IO signaling. SFU (LiveKit) is blocked on provider decision. Maximize P2P production readiness.
- **Alternative considered:** Switch to Stream SDK — rejected; vendor lock-in and cost.

### 5. Security: Layer on top of existing patterns
- **Decision:** Add CORS middleware, Helmet, rate limiting library, JWT revocation via Redis
- **Rationale:** Manual security headers exist but are incomplete. In-memory rate limiting doesn't scale. Need proper middleware stack.

### 6. Infrastructure: Docker-first, no K8s yet
- **Decision:** Production Dockerfiles + docker-compose for app. No Kubernetes yet.
- **Rationale:** App has no Dockerfile at all. Start with containerization before orchestration.

## Dependency Graph

```
Phase 1: Security Foundation
    │
    ├── CORS middleware + Helmet (no deps)
    ├── Rate limiting with express-rate-limit (no deps)
    ├── JWT revocation via Redis (needs Redis in compose)
    └── TURN server wiring (needs coturn container)
    │
Phase 2: Observability (depends on Phase 1 for CORS/security)
    │
    ├── OTel bootstrap pattern (no deps beyond Phase 1)
    ├── Metrics middleware (depends on OTel bootstrap)
    ├── Collector → Prometheus export (no deps)
    ├── Tempo deployment (no deps)
    ├── Grafana datasource config (depends on Tempo + Prometheus)
    └── SLO dashboards (depends on Grafana)
    │
Phase 3: RAG Hardening (depends on Phase 2 for audit logging)
    │
    ├── Qdrant vector search integration (no deps beyond Qdrant)
    ├── RBAC filters from JWT (depends on Qdrant integration)
    ├── AI audit logging (depends on OTel from Phase 2)
    ├── Citation/provenance tracking (depends on Qdrant)
    └── Eval framework (depends on all above)
    │
Phase 4: WebRTC Production (depends on Phase 1 for auth, Phase 2 for metrics)
    │
    ├── TURN server wiring to clients (depends on Phase 1)
    ├── Connection state monitoring + ICE restart (no deps)
    ├── Cloud recording to S3 (needs MinIO/S3)
    ├── Participant cap enforcement (no deps)
    └── Network quality indicators (depends on connection monitoring)
    │
Phase 5: Testing & Polish (depends on all above)
    │
    ├── Docker production hardening (no deps)
    ├── Integration test environment (depends on Docker)
    ├── Benchmark suite (depends on RAG + WebRTC being functional)
    └── Structured logging with trace correlation (depends on Phase 2)
```

## Task List

### Phase 1: Security Foundation (7 tasks)
- [ ] Task 1: Add CORS middleware to Express API
- [ ] Task 2: Add Helmet security headers middleware
- [ ] Task 3: Replace in-memory rate limiting with express-rate-limit
- [ ] Task 4: Add Redis-backed JWT revocation store
- [ ] Task 5: Wire coturn TURN server to WebRTC clients
- [ ] Task 6: Add server-side input validation on WebSocket signaling
- [ ] Task 7: Add comprehensive request body size limits

### Checkpoint: Security Foundation
- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] CORS headers present on API responses
- [ ] Rate limiting returns proper headers
- [ ] TURN credentials accessible from client
- [ ] Review with human before proceeding

### Phase 2: Observability (6 tasks)
- [ ] Task 8: Implement OTel bootstrap pattern for Express API
- [ ] Task 9: Add metrics middleware (request duration, active requests)
- [ ] Task 10: Configure OTel Collector → Prometheus metrics export
- [ ] Task 11: Deploy Grafana Tempo for distributed tracing
- [ ] Task 12: Configure Grafana datasources (Tempo + Prometheus cross-correlation)
- [ ] Task 13: Create SLO dashboards in Grafana

### Checkpoint: Observability
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Metrics visible in Prometheus
- [ ] Traces visible in Tempo
- [ ] Grafana dashboard shows request latency percentiles
- [ ] Review with human before proceeding

### Phase 3: RAG Hardening (5 tasks)
- [ ] Task 14: Integrate Qdrant vector search into Career Vault RAG
- [ ] Task 15: Add RBAC-aware Qdrant filters from JWT claims
- [ ] Task 16: Implement AI audit logging (query, response, chunks, latency, user)
- [ ] Task 17: Add citation/provenance tracking with structured citation objects
- [ ] Task 18: Build RAG eval framework (retrieval + RBAC leak detection)

### Checkpoint: RAG Hardening
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Vector search returns results with RBAC filtering
- [ ] Audit log captures every AI query
- [ ] Citations returned in structured format
- [ ] Eval suite runs and reports metrics
- [ ] Review with human before proceeding

### Phase 4: WebRTC Production (5 tasks)
- [ ] Task 19: Implement connection state monitoring + ICE restart
- [ ] Task 20: Add cloud recording (WebRTC → S3 upload)
- [ ] Task 21: Server-side participant cap enforcement
- [ ] Task 22: Add network quality indicators (getStats → UI)
- [ ] Task 23: Add auth verification on WebSocket signal relay

### Checkpoint: WebRTC Production
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Connection state changes logged and displayed
- [ ] ICE restart triggered on failure
- [ ] Recording uploads to S3
- [ ] Participant cap enforced server-side
- [ ] Review with human before proceeding

### Phase 5: Testing & Polish (4 tasks)
- [ ] Task 24: Create production Dockerfiles (multi-stage, non-root, healthcheck)
- [ ] Task 25: Create integration test environment (docker-compose)
- [ ] Task 26: Add benchmark suite for RAG + WebRTC
- [ ] Task 27: Add structured logging with trace correlation to error handler

### Checkpoint: Complete
- [ ] All acceptance criteria met across all phases
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] Docker build succeeds
- [ ] Ready for review

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| TURN server config complexity | High | Start with coturn defaults, test behind corporate NAT |
| Qdrant migration from keyword search | High | Run both keyword and vector in parallel, compare results |
| OTel Collector config errors | Medium | Use proven configs from otel-example-nodejs reference |
| S3 recording storage costs | Medium | Implement recording retention policy, configurable per tenant |
| Redis dependency for JWT revocation | Medium | Fallback to in-memory if Redis unavailable (degraded mode) |
| Docker build breaks existing dev flow | Low | Keep `npm run dev` as primary dev path, Docker for prod only |

## Open Questions

- [ ] Should we use LiveKit SFU when available, or stay P2P-only for v1?
- [ ] What's the S3 bucket strategy: shared bucket with key prefix vs per-tenant bucket?
- [ ] Should eval framework run in CI or as manual script?
- [ ] Do we need browser-side OTel (frontend tracing) in v1?
