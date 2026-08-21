# Observability Runbook — SignalRoom Ready + Compass Vault

## On-call questions this telemetry answers

1. Which route/operation failed, for which tenant, with what error? → trace + structured log by `request_id`
2. Is error rate / latency elevated on vault or readiness APIs? → RED metrics (`http.server.requests/errors/duration`)
3. Where did time go across vault-api → RAG/import in one request? → distributed trace (Jaeger)
4. Is RAG abstaining more than expected? → `career_vault.rag.abstentions` counter by reason

## Start the observability stack

```bash
# OTLP collector (8785), Jaeger UI (8786:16686), Prometheus (8784), Grafana (8783)
docker compose -f docker-compose.providers.yml up -d otel-collector jaeger prometheus grafana
```

> **Note:** the `delivery` profile also includes `coraza` (WAF) and `gitea`.
> `coraza/coraza-waf:latest` is not available on Docker Hub, and
> `otel/opentelemetry-collector-contrib:0.126.1` is not a published tag. Until the
> compose file pins reachable images, start the four services above explicitly.

## Run a service with tracing

```bash
OTEL_ENABLED=true \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
PORT=8792 node services/career-vault-api/src/server.mjs

OTEL_ENABLED=true \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
PORT=8790 node services/candidate-readiness-api/src/server.mjs
```

Protocol defaults to OTLP/HTTP protobuf on `/v1/traces`. For JSON debugging, set
`OTEL_EXPORTER_OTLP_PROTOCOL=http/json`.

## Verify telemetry is flowing

```bash
# Jaeger: list services
curl -s http://localhost:8786/api/services

# Find a trace for the vault API
curl -s "http://localhost:8786/api/traces?service=career-vault-api&limit=5"

# Structured request logs (each line is JSON with request_id, route, status_class, tenant hash)
# tail the service stdout — events: http.request, rag.ask/plan, email_import
```

## Where to look when something breaks

| Symptom | First query | Next step |
|---|---|---|
| RAG returning abstention unexpectedly | `career_vault.rag.abstentions{reason="low_grounding"}` in Prometheus | Check evidence coverage; candidate added enough notes? |
| Vault API 5xx | `http.server.errors{route="/v1/rag/ask"}` | Open Jaeger trace by `request_id`; check span status |
| Slow email import | `http.server.duration` histogram p95 on `/v1/email/import` | Trace the import span; provider decision? |
| Cross-service latency | Jaeger trace across `career-vault-api` → RAG | Look at span durations per hop |
| RTC interview audio/video problems | `media.rtc.latency_ms`, `media.rtc.packet_loss_percent`, `media.rtc.jitter_ms` p95/p99 | Open `media.session.provisioned` / `media.ice_restart` traces; check ICE state |
| Media session provisioning failures | `media.session.joins` error rate + `http.server.errors{route="/api/media/sessions"}` | Trace provision span; SFU provider decision pending |
| Room join failures | `realtime.room.joins` counter + `signalroom.room.joins` | Check Socket.IO auth + interview permission |

## Media quality telemetry (RTC interview)

The RTC interview app (`apps/rtc-interview-web`, port 5192) samples `RTCPeerConnection.getStats()`
every 2s and posts to `/api/data/telemetry`, which records `media.rtc.latency_ms`,
`media.rtc.packet_loss_percent`, and `media.rtc.jitter_ms` histograms (labeled by interview).
Live Studio also offers a user-triggered real-camera preview (`requestDeviceTracks`) with
tracks stopped on leave; media consent is always user-triggered per the project rules.

SLOs for media (see `scripts/otel/slo.yml`): `room_join_success` (99.9%), `api_availability`
(99.95%). A `media_rtc_quality` SLO (p95 latency < 250ms, packet loss < 2%) is the natural
next addition once the SFU provider is selected.

## SLOs (scripts/otel/slo.yml)

- `api_availability` 99.95% — error rate page alert (Platform SRE)
- `rag_abstention` (new) — ticket when abstention rate high (AI Systems)
- Existing room_join / transcript / scorecard SLOs unchanged.

## Guardrails

- No PII, transcripts, raw email bodies, or access tokens in logs/spans/attributes.
- Tenant IDs are emitted as a stable 12-char SHA-256 hash (`tenant` field).
- Labels are bounded: route template, status class (2xx/4xx/5xx), abstention reason.
- Telemetry is fail-soft: `OTEL_ENABLED=false` or `NODE_ENV=test` disables the SDK;
  a down collector never takes the service down.
- Python services emit structured JSON logs (stdlib `logging`); OTLP for Python is a
  follow-up (would add `opentelemetry-python` deps).
