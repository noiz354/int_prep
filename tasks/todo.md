# SignalRoom Production Readiness — Task List

**Plan:** See `tasks/plan.md` for architecture decisions, dependency graph, and risks.
**Gap Analysis:** See `docs/GAP-ANALYSIS.md` for full gap details.
**Created:** 2026-08-21

---

## Phase 1: Security Foundation

### Task 1: Add CORS middleware to Express API
**Gap:** GAP-24 (No CORS Allowlist)
**Description:** Add the `cors` npm package to Express HTTP routes. Configure with explicit origin allowlist from `ALLOWED_ORIGINS` env var. Keep existing Socket.IO CORS config.
**Acceptance criteria:**
- [ ] `cors` middleware applied to Express app before routes
- [ ] Origins read from `ALLOWED_ORIGINS` env var (comma-separated)
- [ ] `credentials: true` when origins specified
- [ ] Preflight requests handled for all routes
- [ ] Tests verify CORS headers on API responses

**Verification:**
- Tests pass: `npm test` in apps/api
- Manual check: `curl -I -H "Origin: http://localhost:5190" http://localhost:8787/api/health` returns `Access-Control-Allow-Origin`

**Dependencies:** None
**Files likely touched:** `apps/api/src/server.js`, `apps/api/package.json`
**Estimated scope:** S (1-2 files)

---

### Task 2: Add Helmet security headers middleware
**Gap:** GAP-28 (No Security Headers)
**Description:** Replace manual security header assignments with `helmet` middleware. Configure CSP, HSTS, and other headers appropriately for the interview platform (allow-inline for Vite dev).
**Acceptance criteria:**
- [ ] `helmet()` middleware applied to Express app
- [ ] CSP configured for dev (allow localhost:5190) and prod
- [ ] HSTS enabled with appropriate max-age
- [ ] Existing manual header assignments removed
- [ ] Tests verify security headers present

**Verification:**
- Tests pass: `npm test`
- Manual check: `curl -I http://localhost:8787/api/health` shows Helmet headers (X-Content-Type-Options, X-Frame-Options, etc.)

**Dependencies:** None
**Files likely touched:** `apps/api/src/server.js`, `apps/api/package.json`
**Estimated scope:** S (1-2 files)

---

### Task 3: Replace in-memory rate limiting with express-rate-limit
**Gap:** GAP-25 (No Rate Limiting on API)
**Description:** Replace the custom in-memory token bucket with `express-rate-limit`. Configure per-endpoint limits. Keep the existing rate limit headers pattern.
**Acceptance criteria:**
- [ ] `express-rate-limit` package installed
- [ ] Global rate limiter: 100 req/min per IP
- [ ] Auth endpoints: 10 req/min per IP (stricter)
- [ ] AI endpoints: 20 req/min per tenant
- [ ] Rate limit headers returned (RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset)
- [ ] Tests verify rate limiting triggers at threshold

**Verification:**
- Tests pass: `npm test`
- Manual check: Send 101 requests rapidly, verify 429 response on 101st

**Dependencies:** None
**Files likely touched:** `apps/api/src/server.js`, `apps/api/package.json`
**Estimated scope:** M (3-5 files)

---

### Task 4: Add Redis-backed JWT revocation store
**Gap:** GAP-25 (in-memory revocation lost on restart)
**Description:** Replace the in-memory `Set` for JWT revocation with a Redis-backed store. Add Redis to docker-compose. Fallback to in-memory if Redis unavailable.
**Acceptance criteria:**
- [ ] Redis added to `docker-compose.providers.yml`
- [ ] `ioredis` package installed
- [ ] Revocation store reads/writes to Redis SET
- [ ] Fallback to in-memory if Redis connection fails
- [ ] TTL-based expiry matching JWT max lifetime
- [ ] Tests verify revocation persists across requests

**Verification:**
- Tests pass: `npm test`
- Manual check: Revoke a token, verify it's rejected on next request, verify Redis has the key

**Dependencies:** None
**Files likely touched:** `apps/api/src/auth.mjs`, `apps/api/src/server.js`, `docker-compose.providers.yml`, `apps/api/package.json`
**Estimated scope:** M (3-5 files)

---

### Task 5: Wire coturn TURN server to WebRTC clients
**Gap:** GAP-1 (No TURN Server)
**Description:** Configure the existing coturn container to generate ephemeral credentials. Add TURN config endpoint. Wire TURN credentials into RTCPeerConnection iceServers in the browser.
**Acceptance criteria:**
- [ ] coturn container configured with realm and auth
- [ ] API endpoint `GET /api/media/turn-credentials` returns TURN URLs + ephemeral credentials
- [ ] Credentials have short TTL (1 hour)
- [ ] Browser `rtcMesh.js` and `rtcClient.js` use TURN credentials in iceServers
- [ ] Tests verify credential generation and expiry

**Verification:**
- Tests pass: `npm test`
- Manual check: `curl http://localhost:8787/api/media/turn-credentials` returns iceServers with TURN URLs

**Dependencies:** Task 1 (CORS for API endpoint)
**Files likely touched:** `apps/api/src/server.js`, `apps/api/src/mediaServices.mjs`, `src/lib/rtcMesh.js`, `apps/rtc-interview-web/src/lib/rtcClient.js`, `docker-compose.providers.yml`
**Estimated scope:** M (3-5 files)

---

### Task 6: Add server-side input validation on WebSocket signaling
**Gap:** GAP-26 (No Input Validation on Signaling)
**Description:** Add Zod validation on all incoming WebSocket signals (offer, answer, ICE candidates). Validate payload structure, size limits, and that signals are only relayed to authorized room participants.
**Acceptance criteria:**
- [ ] All signal types validated against Zod schemas on receive
- [ ] Invalid signals rejected with error event (not silently dropped)
- [ ] Signal relay checks sender is a member of the target room
- [ ] Max payload size enforced (8KB)
- [ ] Tests verify valid/invalid signal handling

**Verification:**
- Tests pass: `npm test`
- Manual check: Send malformed signal via console, verify error event returned

**Dependencies:** None
**Files likely touched:** `apps/api/src/server.js`, `apps/api/src/realtimeSignal.mjs`
**Estimated scope:** S (1-2 files)

---

### Task 7: Add comprehensive request body size limits
**Gap:** GAP-27 (No Request Body Size Limits)
**Description:** Configure per-content-type body size limits. Increase from current 300kb for endpoints that need it (file uploads), decrease for others.
**Acceptance criteria:**
- [ ] JSON body limit: 1MB (up from 300kb)
- [ ] File upload endpoints: 10MB
- [ ] URL-encoded body limit: 100kb
- [ ] Tests verify limits are enforced

**Verification:**
- Tests pass: `npm test`
- Manual check: Send oversized payload, verify 413 response

**Dependencies:** None
**Files likely touched:** `apps/api/src/server.js`
**Estimated scope:** XS (1 file)

---

## Checkpoint: Security Foundation
- [ ] All tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] CORS headers present on API responses
- [ ] Rate limiting returns proper headers
- [ ] TURN credentials accessible from client
- [ ] Review with human before proceeding

---

## Phase 2: Observability

### Task 8: Implement OTel bootstrap pattern for Express API
**Gap:** GAP-16 (No OTel SDK Bootstrap Pattern)
**Description:** Create `apps/api/src/instrumentation.js` that initializes OTel SDK before any other code. Update package.json start script to use `-r ./src/instrumentation.js`.
**Acceptance criteria:**
- [ ] `apps/api/src/instrumentation.js` initializes NodeSDK
- [ ] Resource includes service.name, service.version, deployment.environment
- [ ] Auto-instrumentations loaded with selective disable (Express, HTTP manual)
- [ ] `package.json` start script uses `-r ./src/instrumentation.js`
- [ ] Graceful shutdown flushes OTel on SIGTERM

**Verification:**
- Tests pass: `npm test`
- Manual check: Start API, verify OTel spans exported to collector

**Dependencies:** None
**Files likely touched:** `apps/api/src/instrumentation.js` (new), `apps/api/src/server.js`, `apps/api/package.json`
**Estimated scope:** M (3-5 files)

---

### Task 9: Add metrics middleware (request duration, active requests)
**Gap:** GAP-17, GAP-19 (No Custom Metrics, No Metrics Middleware)
**Description:** Create `apps/api/src/metrics.js` with OTel metric instruments. Add middleware that records request duration, status code, route on every request.
**Acceptance criteria:**
- [ ] `http.server.request.duration` histogram (ms)
- [ ] `http.server.requests.total` counter by method/route/status
- [ ] `http.server.requests.active` up-down counter
- [ ] Middleware tracks active requests (increment on start, decrement on finish)
- [ ] Health check endpoints excluded from metrics
- [ ] Tests verify metrics are recorded

**Verification:**
- Tests pass: `npm test`
- Manual check: Send requests, verify metrics appear in Prometheus

**Dependencies:** Task 8 (OTel bootstrap)
**Files likely touched:** `apps/api/src/metrics.js` (new), `apps/api/src/server.js`
**Estimated scope:** M (3-5 files)

---

### Task 10: Configure OTel Collector → Prometheus metrics export
**Gap:** GAP-20 (No LGTM Stack)
**Description:** Update `scripts/otel/config.yaml` to export metrics to Prometheus via `prometheusremotewrite` or `prometheus` exporter.
**Acceptance criteria:**
- [ ] OTel Collector config includes Prometheus exporter
- [ ] Metrics flow from Collector to Prometheus
- [ ] Prometheus scrape config targets the Collector
- [ ] Traces still flow to Jaeger/Tempo

**Verification:**
- Manual check: Open Prometheus UI, query `http_server_request_duration_seconds` and see data

**Dependencies:** None
**Files likely touched:** `scripts/otel/config.yaml`, `scripts/otel/prometheus.yml`, `docker-compose.providers.yml`
**Estimated scope:** S (1-2 files)

---

### Task 11: Deploy Grafana Tempo for distributed tracing
**Gap:** GAP-20 (No LGTM Stack)
**Description:** Add Tempo container to docker-compose. Configure OTel Collector to export traces to Tempo instead of (or in addition to) Jaeger.
**Acceptance criteria:**
- [ ] Tempo container added to docker-compose
- [ ] OTel Collector exports traces to Tempo via gRPC
- [ ] Tempo configured with local storage (for dev)
- [ ] Tempo healthy and receiving traces

**Verification:**
- Manual check: Open Tempo UI, search for traces from API requests

**Dependencies:** None
**Files likely touched:** `docker-compose.providers.yml`, `scripts/otel/config.yaml`, `scripts/otel/tempo.yaml` (new)
**Estimated scope:** M (3-5 files)

---

### Task 12: Configure Grafana datasources (cross-signal correlation)
**Gap:** GAP-20 (No Cross-signal Correlation)
**Description:** Add Grafana provisioning for Tempo and Prometheus datasources. Configure cross-linking: click trace → see metrics, click metric → see traces.
**Acceptance criteria:**
- [ ] Grafana provisioning file for Prometheus datasource
- [ ] Grafana provisioning file for Tempo datasource
- [ ] Tempo configured to link to Prometheus (traces→metrics)
- [ ] Prometheus configured with exemplars linking to Tempo (metrics→traces)
- [ ] Datasources auto-provisioned on Grafana startup

**Verification:**
- Manual check: Open Grafana, see both datasources, click a trace to see correlated metrics

**Dependencies:** Tasks 10, 11
**Files likely touched:** `config/grafana/provisioning/datasources/` (new), `docker-compose.providers.yml`
**Estimated scope:** S (1-2 files)

---

### Task 13: Create SLO dashboards in Grafana
**Gap:** GAP-23 (No SLO Dashboard)
**Description:** Create a pre-provisioned Grafana dashboard with panels for: request latency P50/P90/P99, success rate, error rate by route, active requests, RAG query latency, WebRTC join success rate.
**Acceptance criteria:**
- [ ] Dashboard JSON provisioned in Grafana
- [ ] Panels: latency percentiles, success rate, error rate, active requests
- [ ] Panels: RAG query duration, AI response time
- [ ] Dashboard auto-loaded on Grafana startup

**Verification:**
- Manual check: Open Grafana, see dashboard with live data

**Dependencies:** Tasks 10, 11, 12
**Files likely touched:** `config/grafana/provisioning/dashboards/` (new), `docker-compose.providers.yml`
**Estimated scope:** M (3-5 files)

---

## Checkpoint: Observability
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Metrics visible in Prometheus
- [ ] Traces visible in Tempo
- [ ] Grafana dashboard shows request latency percentiles
- [ ] Review with human before proceeding

---

## Phase 3: RAG Hardening

### Task 14: Integrate Qdrant vector search into Career Vault RAG
**Gap:** GAP-9 (No vector search)
**Description:** Replace keyword-based scoring in `services/career-vault-rag/` with Qdrant vector search. Add embedding generation via Ollama, Qdrant client for insert/search.
**Acceptance criteria:**
- [ ] Ollama embedding model called for document ingestion
- [ ] Qdrant collection created with appropriate dimensions
- [ ] Vector search replaces keyword scoring in retrieval
- [ ] Existing tenant/candidate scoping preserved via Qdrant payload
- [ ] Tests verify vector search returns relevant results

**Verification:**
- Tests pass: `npm test` in services/career-vault-rag
- Manual check: Ingest a document, query it, verify vector search returns results

**Dependencies:** None
**Files likely touched:** `services/career-vault-rag/app/main.py`, `services/career-vault-rag/app/rag/` (new files), `services/career-vault-rag/requirements.txt`
**Estimated scope:** L (5+ files)

---

### Task 15: Add RBAC-aware Qdrant filters from JWT claims
**Gap:** GAP-9 (No RBAC-Aware RAG Retrieval)
**Description:** Add Qdrant `must_filter` on tenant_id + role from JWT. Implement defense-in-depth post-retrieval check.
**Acceptance criteria:**
- [ ] Qdrant queries include `must_filter` with tenant_id from JWT
- [ ] Role-based filter: interviewers see only their interviews, candidates see only their data
- [ ] Post-retrieval filter removes any results that pass Qdrant filter but shouldn't be visible
- [ ] Tests verify cross-tenant isolation
- [ ] Tests verify cross-role isolation

**Verification:**
- Tests pass: `npm test`
- Manual check: Query as interviewer A, verify no results from interviewer B's data

**Dependencies:** Task 14 (Qdrant integration)
**Files likely touched:** `services/career-vault-rag/app/main.py`, `services/career-vault-rag/app/rag/`
**Estimated scope:** M (3-5 files)

---

### Task 16: Implement AI audit logging
**Gap:** GAP-10 (No Audit Logging for AI Queries)
**Description:** Log every AI query: query text, response, retrieved chunks, latency, user identity, tenant. Store in structured format (OTel spans + audit table).
**Acceptance criteria:**
- [ ] Every RAG query logged with: query, response, chunk_ids, latency_ms, user_id, tenant_id
- [ ] Audit log stored in append-only format
- [ ] Audit log queryable by tenant, user, date range
- [ ] PII redacted from logs (no full candidate names in logs)
- [ ] Tests verify audit log captures all fields

**Verification:**
- Tests pass: `npm test`
- Manual check: Make a RAG query, verify audit entry appears in logs/database

**Dependencies:** Task 8 (OTel bootstrap for span creation)
**Files likely touched:** `services/career-vault-rag/app/main.py`, `services/career-vault-rag/app/otel_logging.py`
**Estimated scope:** M (3-5 files)

---

### Task 17: Add citation/provenance tracking
**Gap:** GAP-11, GAP-15 (No Citation Tracking, No Structured Citations)
**Description:** Return structured `Citation` objects with each RAG response. Include citation_id, document_id, section, score, snippet, provenance.
**Acceptance criteria:**
- [ ] `Citation` type defined with: id, document_id, section, score, snippet, page/offset
- [ ] Citations returned in every RAG response
- [ ] Frontend can render citations as clickable source references
- [ ] Provenance ID per chunk (content_hash + chunk_index)
- [ ] Tests verify citation structure and content

**Verification:**
- Tests pass: `npm test`
- Manual check: Query RAG, verify response includes structured citations

**Dependencies:** Task 14 (Qdrant integration)
**Files likely touched:** `services/career-vault-rag/app/main.py`, `services/career-vault-rag/app/rag/`, frontend citation components
**Estimated scope:** M (3-5 files)

---

### Task 18: Build RAG eval framework
**Gap:** GAP-12, GAP-34 (No Eval Framework, No RBAC Eval)
**Description:** Create eval suites: retrieval quality (retrieval_hit), answer correctness (answer_hit), RBAC leak detection (cross-tenant/cross-role queries).
**Acceptance criteria:**
- [ ] Eval test cases defined (10+ queries with expected results)
- [ ] Retrieval eval: check if expected documents are in top-k results
- [ ] Answer eval: check if response matches expected answer
- [ ] RBAC eval: attempt cross-tenant/cross-role queries, verify blocked
- [ ] Eval runs as script: `python -m eval.run`
- [ ] Results reported as metrics (precision, recall, leak rate)

**Verification:**
- Tests pass: `python -m eval.run` produces report
- Manual check: Run eval, see precision/recall metrics

**Dependencies:** Tasks 14, 15, 16
**Files likely touched:** `services/career-vault-rag/eval/` (new directory)
**Estimated scope:** L (5+ files)

---

## Checkpoint: RAG Hardening
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Vector search returns results with RBAC filtering
- [ ] Audit log captures every AI query
- [ ] Citations returned in structured format
- [ ] Eval suite runs and reports metrics
- [ ] Review with human before proceeding

---

## Phase 4: WebRTC Production

### Task 19: Implement connection state monitoring + ICE restart
**Gap:** GAP-2 (No Connection Recovery)
**Description:** Add `onconnectionstatechange` handler that logs state changes, triggers ICE restart on failure, and displays reconnection status to user.
**Acceptance criteria:**
- [ ] `onconnectionstatechange` handler logs all state transitions
- [ ] On `failed` or `disconnected`, trigger ICE restart after 2s delay
- [ ] Max 3 ICE restart attempts before giving up
- [ ] User sees "Reconnecting..." banner during recovery
- [ ] User sees "Connection lost" after max retries
- [ ] Tests verify state machine transitions

**Verification:**
- Tests pass: `npm test`
- Manual check: Simulate network disruption, verify ICE restart triggered

**Dependencies:** Task 5 (TURN server for recovery to work)
**Files likely touched:** `src/lib/rtcMesh.js`, `apps/rtc-interview-web/src/App.jsx`
**Estimated scope:** M (3-5 files)

---

### Task 20: Add cloud recording (WebRTC → S3 upload)
**Gap:** GAP-3 (No Recording with Cloud Storage)
**Description:** Add client-side MediaRecorder to capture WebRTC streams. Upload recorded chunks to S3/MinIO via presigned URLs.
**Acceptance criteria:**
- [ ] MediaRecorder captures both local and remote tracks
- [ ] Recording starts/stops with host controls
- [ ] Recorded chunks uploaded to S3 via presigned URL
- [ ] Recording metadata stored in database (duration, size, URL)
- [ ] Recording accessible via authenticated download URL
- [ ] Tests verify recording lifecycle

**Verification:**
- Tests pass: `npm test`
- Manual check: Start recording, stop, verify file in S3

**Dependencies:** Task 19 (connection monitoring for recording stability)
**Files likely touched:** `src/lib/recordingClient.js` (new), `apps/api/src/server.js`, `apps/rtc-interview-web/src/App.jsx`
**Estimated scope:** L (5+ files)

---

### Task 21: Server-side participant cap enforcement
**Gap:** GAP-4 (No Participant Cap Enforcement)
**Description:** Enforce max participants per room type on the server. Reject additional connections with error.
**Acceptance criteria:**
- [ ] Interview rooms: max 2 participants
- [ ] Panel rooms: max 5 participants
- [ ] Cap checked on socket join, not just admission
- [ ] Excess connections receive `room_full` error event
- [ ] Tests verify cap enforcement

**Verification:**
- Tests pass: `npm test`
- Manual check: Try to join a full room, verify rejection

**Dependencies:** None
**Files likely touched:** `apps/api/src/server.js`
**Estimated scope:** S (1-2 files)

---

### Task 22: Add network quality indicators (getStats → UI)
**Gap:** GAP-8 (No Network Quality Indicators)
**Description:** Use WebRTC `getStats()` to collect RTT, jitter, packet loss. Display as quality indicator in the UI.
**Acceptance criteria:**
- [ ] `getStats()` polled every 3 seconds
- [ ] Metrics: RTT, jitter, packet loss, bitrate
- [ ] Quality indicator: green (>500ms RTT), yellow (500-1000ms), red (>1000ms)
- [ ] Indicator visible in interview room UI
- [ ] Metrics sent to OTel as custom metrics

**Verification:**
- Tests pass: `npm test`
- Manual check: Join call, see quality indicator update in real-time

**Dependencies:** Task 19 (connection monitoring)
**Files likely touched:** `apps/rtc-interview-web/src/lib/rtcClient.js`, `apps/rtc-interview-web/src/App.jsx`
**Estimated scope:** M (3-5 files)

---

### Task 23: Add auth verification on WebSocket signal relay
**Gap:** GAP-5 (No Auth on Signaling)
**Description:** Verify that WebSocket signals are only relayed to authorized room members. Add per-signal authorization check.
**Acceptance criteria:**
- [ ] Signal relay checks sender is a member of the target room
- [ ] Signal relay checks receiver is a member of the same room
- [ ] Unauthorized signals rejected with error event
- [ ] Tests verify signal isolation between rooms

**Verification:**
- Tests pass: `npm test`
- Manual check: Attempt to send signal to another room, verify rejection

**Dependencies:** Task 6 (input validation)
**Files likely touched:** `apps/api/src/server.js`
**Estimated scope:** S (1-2 files)

---

## Checkpoint: WebRTC Production
- [ ] All tests pass
- [ ] Build succeeds
- [ ] Connection state changes logged and displayed
- [ ] ICE restart triggered on failure
- [ ] Recording uploads to S3
- [ ] Participant cap enforced server-side
- [ ] Review with human before proceeding

---

## Phase 5: Testing & Polish

### Task 24: Create production Dockerfiles
**Gap:** GAP-29 (No Docker Production Hardening)
**Description:** Create multi-stage Dockerfiles for API and frontend. Non-root user, healthcheck, minimal image size.
**Acceptance criteria:**
- [ ] `apps/api/Dockerfile`: multi-stage build, non-root user, healthcheck
- [ ] `Dockerfile` (root): multi-stage build for frontend + API
- [ ] Health check endpoint `/health/live` returns 200
- [ ] Image size < 200MB (excluding node_modules)
- [ ] `docker build` succeeds

**Verification:**
- `docker build -t signalroom-api .` succeeds
- `docker run --rm signalroom-api curl localhost:8787/api/health` returns 200

**Dependencies:** None
**Files likely touched:** `Dockerfile` (new), `apps/api/Dockerfile` (new), `.dockerignore` (new)
**Estimated scope:** M (3-5 files)

---

### Task 25: Create integration test environment
**Gap:** GAP-36 (No Integration Test Environment)
**Description:** Create `docker-compose.test.yml` that starts API + frontend + Qdrant + Redis for end-to-end testing.
**Acceptance criteria:**
- [ ] `docker-compose.test.yml` starts all required services
- [ ] API health check passes after startup
- [ ] Qdrant accessible and responsive
- [ ] Redis accessible and responsive
- [ ] Integration tests can run against the stack
- [ ] `docker compose -f docker-compose.test.yml up` works

**Verification:**
- `docker compose -f docker-compose.test.yml up -d && npm test` passes

**Dependencies:** Task 24
**Files likely touched:** `docker-compose.test.yml` (new)
**Estimated scope:** S (1-2 files)

---

### Task 26: Add benchmark suite for RAG + WebRTC
**Gap:** GAP-35 (No Benchmark Suite)
**Description:** Create benchmark scripts that measure: RAG query latency (P50/P90/P99), WebRTC join time, recording upload speed.
**Acceptance criteria:**
- [ ] RAG benchmark: 100 queries, report latency percentiles
- [ ] WebRTC benchmark: measure time from join request to connected state
- [ ] Results saved to JSON file
- [ ] Benchmark script: `npm run benchmark`

**Verification:**
- `npm run benchmark` produces latency report

**Dependencies:** Tasks 14, 19
**Files likely touched:** `scripts/benchmark/` (new directory)
**Estimated scope:** M (3-5 files)

---

### Task 27: Add structured logging with trace correlation
**Gap:** GAP-31, GAP-22 (No Structured Logging, No Trace ID in Errors)
**Description:** Add Pino structured logging to error handler. Include trace_id from OTel span in error responses and logs.
**Acceptance criteria:**
- [ ] Error handler logs via Pino (not console.error)
- [ ] Log includes: error message, stack, method, path, trace_id, tenant_id
- [ ] API error responses include `trace_id` field
- [ ] Log level configurable via `LOG_LEVEL` env var
- [ ] Tests verify structured error logging

**Verification:**
- Tests pass: `npm test`
- Manual check: Trigger error, verify structured log output with trace_id

**Dependencies:** Task 8 (OTel bootstrap for trace context)
**Files likely touched:** `apps/api/src/server.js`, `apps/api/src/errorHandler.js` (new or existing)
**Estimated scope:** S (1-2 files)

---

## Checkpoint: Complete
- [ ] All acceptance criteria met across all phases
- [ ] `npm test` passes
- [ ] `npm run build` succeeds
- [ ] Docker build succeeds
- [ ] Ready for review
