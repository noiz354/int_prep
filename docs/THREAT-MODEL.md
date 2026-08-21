# SignalRoom — Threat Model & Production Readiness

> Fase 5 deliverable: threat model (STRIDE), trust boundaries, dan checklist
> readiness. Status: **local boundary tested; production deployment blocked on
> provider decision** (lihat `docs/PRODUCTION-DECISION-BRIEF.md`).

## Trust boundaries

```text
┌────────────────────────────────────────────────────────────────┐
│ UNTRUSTED: Browser / candidate / interviewer                    │
│  · HTTP requests · form fields · WebSocket events · media       │
├────────────────────────────────────────────────────────────────┤
│  Trust boundary 1 — TLS, auth (JWT→OIDC), zod validation,      │
│  rate limit, security headers, SSRF guard on webhooks           │
├────────────────────────────────────────────────────────────────┤
│ TRUSTED: Express control plane                                  │
│  · tenant isolation · RBAC/ABAC · idempotency · audit chain     │
├────────────────────────────────────────────────────────────────┤
│  Trust boundary 2 — repository seam, event contract, KMS wrap   │
├────────────────────────────────────────────────────────────────┤
│ EXTERNAL: Kafka · MongoDB · S3 · SFU · LLM/ASR · calendar/ATS   │
│  (provider-backed, blocked on provider decision)                │
└────────────────────────────────────────────────────────────────┘
```

**Aset yang dilindungi:** kredensial (JWT secret, TURN, provider keys), PII kandidat,
rekaman/transkrip, keputusan rekrutmen, audit trail, AI prompts + retrieval data.

## STRIDE analysis

| Threat | Boundary | Mitigation (diimplementasikan) | Status |
|---|---|---|---|
| **S**poofing | Auth | JWT signed + issuer/audience verify (`auth.mjs`); OIDC/SAML adapter seam | Local pass |
| **T**ampering | API body, artifacts | Zod validation, content hash SHA-256, envelope encryption AES-256-GCM | Local pass |
| **R**epudiation | Mutations | Hash-chained audit ledger per tenant + verify endpoint | Local pass |
| **I**nformation disclosure | Search, export, media | Tenant mismatch → 403, permission-filtered search, DLP scan masks PII, watermark media access | Local pass |
| **D**enial of service | API | Rate limit 120/min per principal, body cap 300kb, idempotency dedup | Local pass |
| **E**levation of privilege | RBAC | Permission + resource-scoped checks, candidate assignment boundary, no client-only authz | Local pass |
| **SSRF** | Webhook URL | https-only + private/loopback/link-local block (`169.254.169.254`, `*.internal`, `*.local`) | Local pass |
| **LLM01 prompt injection** | AI routes | Consent gate 409, model output treated as data (no eval/SQL/innerHTML), tenant-isolated retrieval | Local pass |
| **LLM02/07 data leak** | AI prompts | PII-minimized resume, no raw transcripts in prompts, masked fields | Local pass |
| **LLM08 vector poisoning** | RAG | Tenant-partitioned retrieval boundary declared; Qdrant adapter seam | Adapter-ready |
| **LLM10 unbounded consumption** | AI cost | Body caps, max segments/criteria, rate limit | Local pass |

## Implementation checklist (security-and-hardening)

### Authentication & Authorization
- [x] JWT signed (jose HS256) dengan issuer/audience/expiry — local demo seam
- [x] Semua `/api/*` route wajib auth (`requireAuthentication`)
- [x] Tenant dari signed principal; `X-Tenant-Id` mismatch → 403 (diuji smoke test)
- [x] RBAC/ABAC per route + resource-scoped (`interview:room:join` dgn assignedInterviews)
- [x] Idempotency-Key wajib untuk mutation
- [x] Rate limit per principal; auth endpoint terproteksi
- [ ] OIDC/SAML/SCIM + MFA/passkeys nyata — **blocked on provider decision** (Keycloak lokal siap `:8781`)

### Input & Data
- [x] Zod schema di semua boundary route (Phases 1–5)
- [x] SSRF guard di webhook (https-only + private-IP block)
- [x] Security headers: CSP, HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy
- [x] Error responses non-sensitive (tidak expose stack trace)
- [x] PII redaction endpoint (`/api/privacy/redact`), DLP scan masks email/phone
- [x] Retention class pada artifact (candidate-standard-90d), deletion job propagation
- [ ] Encrypted MongoDB + KMS/HSM nyata — **blocked on provider decision**

### Supply chain
- [x] `npm audit --omit=dev --audit-level=high` → 0 high
- [x] Lockfile (`package-lock.json`) committed
- [x] CI pipeline dengan `npm ci` frozen install + audit gate
- [x] Install-script policy: blocked-unless-approved (tercatat di supply-chain report)
- [ ] Sigstore/cosign artifact signing + SBOM di CI runtime — **blocked on provider decision**

### Observability & SRE
- [x] OTel SDK + spans/counters bernama operasi bisnis (`scorecard.submit`, room joins)
- [x] SLO definitions + alert rules + owner + rollback path (`scripts/otel/slo.yml`)
- [x] OTLP collector → Jaeger (compose delivery profile)
- [x] Tidak ada token/transcript/PII dalam telemetry (atribut hanya tenant_id + route)
- [ ] Vendor OTLP backend (Grafana Cloud/Datadog) + sampling — **blocked on provider decision**

## Production readiness gates (belum lolos)

| Gate | Status | Blocker |
|---|---|---|
| Staging + production acceptance vs real providers | ⏳ | Phase 0 decisions + akun |
| DR drill teruji (restore + failover) | ✅ local drill | Provider infra |
| Compliance evidence (SOC 2/ISO/GDPR) | ✅ evidence bundle | Legal review + DPA |
| On-call + runbook + incident comms | ⏳ | Keputusan org |
| Penetration/chaos/load test | ⏳ | Staging env |
| Reklasifikasi akurat tiap capability | ✅ | Selesai setelah gate di atas |

## Kesimpulan

Semua kontrol yang bisa diverifikasi lokal sudah **diimplementasikan + diuji**.
Bagian yang butuh akun vendor, kredensial, DPA, dan approval organisasi tetap
berlabel **blocked on provider decision** — konsisten dengan aturan prompt
(rule 6: "If a required decision or credential is missing, build only the
tested adapter boundary and label it clearly as blocked").

## Unblocking

Template langkah konkret untuk melepas setiap blocker (pemilik, langkah, bukti
selesai, status tracker): **`docs/PROVIDER-UNBLOCKING-CHECKLIST.md`**.
Batasan jujur self-hosting & syarat reklasifikasi status: **`docs/HONEST-LIMITATIONS.md`**.
