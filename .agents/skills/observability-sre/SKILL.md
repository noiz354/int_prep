---
name: observability-sre
description: Add or review OpenTelemetry, service health, SLO, incident, reliability, and deployment behavior for SignalRoom.
---

# Observability and SRE

1. Name spans by business operation, not HTTP implementation alone (for example `scorecard.submit`).
2. Attach low-cardinality, non-sensitive attributes. Tenant IDs may be sensitive in external telemetry; hash or policy-gate as needed.
3. Track API request outcomes, room joins, media join success, transcript freshness, recording completion, and Kafka lag through appropriate layers.
4. Do not emit access tokens, transcript text, PII, recording URLs, or raw prompt content to telemetry.
5. Define SLO, owner, alert action, and rollback/mitigation path before creating an alert.
6. Exercise graceful degradation: API failure, media outage, event lag, AI timeout, and reconnect scenarios.
7. Configure an actual OTLP/exporter and environment-specific sampling before production; local SDK setup is not sufficient.
