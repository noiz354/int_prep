---
name: event-data-engineering
description: Extend SignalRoom event contracts, Kafka-compatible adapters, data quality, lineage, or governed analytics safely.
---

# Event and data engineering

1. Define the event purpose, owner, tenant scope, retention, PII classification, and schema version before publishing.
2. Include event ID, type, contract version, occurred time, tenant ID, and idempotency key.
3. Make consumer side effects idempotent. Plan dead-letter, replay, and backfill behavior before production.
4. Do not place raw recordings, tokens, or oversized transcript payloads in events; emit controlled artifact references.
5. Propagate consent/withdrawal/deletion signals through derived data paths.
6. Update catalog/lineage/quality documentation with every contract change.
7. Preserve the memory adapter for local tests and add compatibility tests before adopting a Kafka provider.
