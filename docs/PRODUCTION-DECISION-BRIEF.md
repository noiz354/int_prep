# Phase 0 — Production Decision Brief

> Status: **APPROVED — dasar implementasi Phases 1–5** (dari `PROMPT-FINISH-STUBS-PHASED.md`)
> Hasil program: 20 stub + 24 partial foundations di-upgrade ke **tested boundaries**.
> Semua bagian yang butuh kredensial/provider nyata berlabel **blocked on provider decision**.

## Ringkasan kondisi saat ini

| Area | Kondisi sekarang | Artinya |
|---|---|---|
| Identity | JWT demo adapter (`auth.mjs`) | Seam siap; butuh IdP nyata |
| Persistence | `MemoryInterviewRepository` | Seam siap; butuh MongoDB |
| Events | `MemoryEventBus` / `KafkaProducerAdapter` | Seam siap; butuh Kafka |
| AI | `services/ai/main.py` deterministik + Ollama lokal (Windows host) | Butuh model gateway + RAG |
| Media | Simulasi WebRTC di UI | Butuh SFU/TURN |
| Observability | OTel hooks + collector lokal | Butuh eksport backend |
| Integrasi | WireMock mocks | Butuh OAuth connector nyata |

---

## 1. Cloud & region strategy

| Opsi | Kelebihan | Trade-off | Keputusan |
|---|---|---|---|
| **AWS** (us-east-1 primer, us-west-2 DR) | Matang, media ecosystem luas, KMS, MSK | Biaya egress media, kompleksitas IAM | **Recommended** |
| Azure (East US + West US) | Entra ID native, Teams interop | SFU/WebRTC kurang matang | Alternatif |
| GCP (us-central1) | Livekit/mediasoup heritage, analytics kuat | Market share enterprise kecil | Alternatif |

- **Residency**: wajib region tempat kandidat berada (mis. UE → eu-central-1) + opsi data residency per tenant.
- **DR**: region kedua dengan RPO ≤ 15 menit, RTO ≤ 4 jam untuk kontrol plane; media real-time pakai region failover SFU.
- **Missing**: akun cloud, budget, keputusan region legal.

---

## 2. Identity provider (OIDC/SAML/SCIM/MFA)

| Opsi | Fitur | Resource | Keputusan |
|---|---|---|---|
| **Keycloak (self-hosted)** — **sudah berjalan lokal** di `:8781` | OIDC, SAML, SCIM v2, MFA OTP/WebAuthn, step-up | ~300MB+ | **Recommended untuk dev/staging** |
| Okta / Auth0 | Managed, SCIM + MFA matang | $$$ | Produksi jika org sudah pakai |
| Entra ID | Integrasi Microsoft | $$$ | Jika tenant Microsoft |

- SCIM provisioning wajib untuk sinkronisasi user/tenant otomatis.
- MFA: OTP + WebAuthn; **step-up** untuk privileged actions (SC-03).
- **Missing**: keputusan org (self-host vs managed), domain, cert SAML.

---

## 3. Data: MongoDB, object storage, KMS, secret vault, backup

| Komponen | Opsi lokal (sudah ada compose) | Opsi managed | Keputusan |
|---|---|---|---|
| Database | MongoDB encrypted-at-rest `:8782` (WiredTiger keyfile) | MongoDB Atlas (CMK KMS) | **Recommended: Atlas** untuk produksi |
| KMS | HashiCorp Vault transit `:8780` | AWS KMS / Azure Key Vault | **Recommended: cloud KMS** |
| Secret vault | Vault `:8780` | AWS Secrets Manager | **Recommended: cloud** + rotasi |
| Object storage | MinIO `:8792` | AWS S3 (SSE-KMS) | **Recommended: S3** |
| Backup | volume + script | Atlas PITR + S3 cross-region | Atlas PITR |

- Envelope encryption: data key per tenant → di-wrap KMS; rotasi terjadwal.
- Retention: legal hold + deletion propagation (DE-13) wajib.
- **Missing**: Atlas org, KMS key policy, budget.

---

## 4. Media: SFU/WebRTC, TURN, recording, region

| Opsi | Kelebihan | Trade-off | Keputusan |
|---|---|---|---|
| **LiveKit Cloud / self-host** | Open source, SFU matang, adaptive bitrate, egress recording | Self-host butuh infra media | **Recommended** |
| mediasoup (self-host) | Kontrol penuh, lightweight | Ops berat (region, scaling) | Alternatif |
| Daily / Twilio / Agora | Managed, compliance siap | Cost tinggi, vendor lock | Alternatif |

- TURN: coturn `:8797` lokal; produksi pakai managed TURN/region-aware.
- Recording: egress ke S3 dengan SSE-KMS, signed URL pendek, malware scan (DE-07).
- Sandbox kode: docker:dind `:8795` lokal; produksi = Firecracker/gVisor + network-disabled.
- **Missing**: LiveKit cloud/self-host decision, TURN credentials, media region, budget.

---

## 5. Integrations: calendar, email/SMS, Slack/Teams, ATS, HRIS

| Kategori | Opsi lokal (WireMock `:8800`) | Opsi produksi | Keputusan |
|---|---|---|---|
| Calendar | Stub free/busy | Google Calendar / MS Graph | Butuh app registration |
| Email/SMS | Stub | SendGrid / Twilio | Butuh akun |
| Chat | Stub | Slack / Teams | Butuh app |
| ATS | Stub requisitions | Greenhouse / Lever | Butuh OAuth app |
| HRIS | Stub employees | Workday / BambooHR | Butuh OAuth app |

- Semua lewat OAuth 2.0 + refresh; field-map + reconciliation per provider.
- Webhook delivery: signed, retry, DLQ (BE-13).
- **Missing**: semua client ID/secret, legal DPA, approval org.

---

## 6. Data platform: Kafka, schema registry, CDC, lakehouse

| Komponen | Opsi lokal (sudah ada compose) | Opsi produksi | Keputusan |
|---|---|---|---|
| Kafka | Redpanda `:8790` (Kafka-compatible) | AWS MSK / Confluent | **Recommended: MSK/Confluent** |
| Schema registry | Redpanda SR `:8791` | Confluent SR / AWS Glue | Ikut pilihan Kafka |
| CDC | — | Debezium → Mongo oplog → Kafka | **Recommended** |
| Lakehouse | MinIO `:8792` (bronze/silver/gold) | S3 + Iceberg/Databricks | **Recommended: S3 + Iceberg** |
| Orchestrasi ETL | adapter `platformServices` | Airflow / Dagster | Keputusan tim data |
| Feature store | adapter | Feast / Tecton | Keputusan tim ML |

- Event contract v1.0 sudah ada; migrasi ke Avro/Protobuf + compatibility rules (DE-02).
- DLQ/replay/backfill + checkpointing CDC (DE-04, DE-10).
- **Missing**: Kafka vendor, lakehouse engine, orchestration tool, tim data.

---

## 7. AI: ASR, LLM, RAG, evaluasi, review

| Komponen | Opsi lokal | Opsi produksi | Keputusan |
|---|---|---|---|
| ASR/transcription | adapter `services/ai` | AssemblyAI / Deepgram / Azure Speech | **Recommended: Deepgram** (diarization) |
| LLM | Ollama Windows host (`granite3.1-dense:2b`) | OpenAI / Anthropic / Azure OpenAI | **Recommended: Azure OpenAI** (enterprise) |
| RAG vector store | Qdrant `:8799` | Qdrant Cloud / Pinecone / pgvector | **Recommended: Qdrant Cloud** |
| Embedding | `nomic-embed-text` | `text-embedding-3` / Cohere | Ikut LLM |
| Evaluasi/red-team | adapter | promptfoo / internal eval suite | Tim AI safety |

- Wajib: consent gate sebelum model call, tenant isolation retrieval, `requires_human_judgment: true`, tanpa auto-disposition, tanpa inferensi protected traits.
- Model/prompt/rubric versioning + appeal workflow (AI-15).
- **Missing**: LLM API key, DPA, evaluasi data, approval AI governance.

---

## 8. Observability, CI/CD, WAF, incident

| Komponen | Opsi lokal (compose delivery) | Opsi produksi | Keputusan |
|---|---|---|---|
| OTLP | collector `:8785` | vendor OTLP (Datadog/New Relic/Grafana Cloud) | **Recommended: Grafana Cloud** |
| Metrics | Prometheus `:8784` | Managed Prometheus | Ikut vendor |
| Traces | Jaeger `:8786` | Tempo / vendor | Ikut vendor |
| Dashboards | Grafana `:8783` | Grafana Cloud | Ikut vendor |
| CI/CD | Gitea + act_runner (belum ada) | GitHub Actions / GitLab CI | **Recommended: GitHub Actions** |
| WAF | — | CloudFront + AWS WAF / ModSecurity | Ikut cloud |
| Incident | — | PagerDuty / Opsgenie | Keputusan org |

- SLO alerting, RUM, synthetic, on-call runbook, DR drills wajib sebelum release.
- **Missing**: vendor observability, CI/CD repo, WAF config, on-call ownership.

---

## 9. Compliance targets & retention policy

| Area | Keputusan yang dibutuhkan |
|---|---|
| Standar | SOC 2 Type II? ISO 27001? GDPR? HIPAA? |
| Retention | Default retention media/transkrip (mis. 90 hari), legal hold, DSAR SLA |
| Residency | Region per tenant, export/erasure path |
| Audit | Immutable audit export, retention audit log (mis. 7 tahun) |
| AI governance | Fairness monitoring, bias thresholds, red-team cadence |

**Missing**: legal review, compliance officer approval, DPA dengan semua vendor.

---

## Decision summary (untuk approval)

| # | Keputusan | Rekomendasi | Blocker |
|---|---|---|---|
| 1 | Cloud/region | AWS us-east-1 + us-west-2 DR | Akun, budget, legal region |
| 2 | Identity | Keycloak self-host (dev) → Okta/Entra (prod) | Domain, cert, org decision |
| 3 | Data | Atlas + cloud KMS + S3 | Atlas org, KMS policy |
| 4 | Media | LiveKit (cloud atau self-host) | Akun LiveKit, TURN creds |
| 5 | Integrations | Google/MS Graph + Greenhouse + Workday | OAuth app registration |
| 6 | Data platform | MSK/Confluent + Debezium + Iceberg | Vendor, tim data |
| 7 | AI | Azure OpenAI + Deepgram + Qdrant Cloud | API keys, DPA, governance |
| 8 | Observability/CI/CD | Grafana Cloud + GitHub Actions + AWS WAF | Vendor, repo |
| 9 | Compliance | SOC 2 + GDPR, retention 90 hari | Legal review |

---

## Pertanyaan approval

**Apakah decision matrix ini disetujui untuk menjadi dasar Phase 1 (Backend product services)?**

- Jika **ya**, saya lanjut ke Phase 1 dengan asumsi rekomendasi di atas + penandaan `blocked on provider decision` untuk bagian yang belum ada kredensial.
- Jika **tidak / sebagian**, tunjukkan baris yang perlu diubah, dan saya revisi sebelum lanjut.

---

## Hasil program — 5 fase (APPROVED)

Semua fase dieksekusi dengan gate approval per fase. Verifikasi final: **54 contract tests + 2 browser utility tests pass, build ok, audit 0 high, 36 skills valid**.

| Fase | Scope | Deliverable utama | Test |
|---|---|---|---|
| 0 | Decision brief | Matrix 9 keputusan + blocker | — |
| 1 | Backend product | `productServices.mjs` — BE-03/04/05/12/13 + RBAC baru + 11 event types | 7 baru |
| 2 | Media control plane | `mediaServices.mjs` — BE-07/FE-01/FE-07/FE-10 + UI Live Studio + 9 event types | 6 baru |
| 3 | Data platform | `dataPlatformServices.mjs` — DE-04/06/07/08/11/14/15 + 15 event types | 7 baru |
| 4 | AI governance | `aiServices.mjs` — AI-02/05/08/09/11/12/13 + consent gate semua route + eval suite + 7 event types | 11 baru |
| 5 | Security/SRE | `securityServices.mjs` — SC-03/04/09/12/13, DO-01/04/11/12 + SSRF guard + headers + CI + SLO + threat model + 10 event types | 9 baru |

### Status capability setelah program

- **20 stub** (BE-03/04/05/07/12/13 · FE-01/07/10 · DE-04/06/07/08/11/14/15 · AI-02/05/08/09/11/12/13) → **tested service boundaries + API routes**
- **24 partial foundations** → di-upgrade: consent gates, tenant enforcement di semua route baru, event contract diperluas, SSRF guard, security headers, CI pipeline
- **Blocked on provider decision** (kredensial/akun/approval belum ada): Okta/Entra + SCIM, Atlas/KMS/S3, LiveKit/mediasoup + TURN, Google/MS + Greenhouse + Workday OAuth, MSK/Confluent + Debezium + Iceberg, Azure OpenAI + Deepgram + Qdrant Cloud, Grafana Cloud + GitHub Actions secrets + AWS WAF, compliance legal review

### Dokumen program

- `docs/THREAT-MODEL.md` — STRIDE analysis + readiness gates
- `docs/IMPLEMENTATION-STATUS.md` — Phase 1–5 sections per domain
- `docs/API.md` — Phase 1–5 route tables
- `scripts/otel/slo.yml` — SLO + alert + rollback path
- `.github/workflows/ci.yml` — quality gates + Keycloak provider smoke
- `progess.md` — 56 tests passing
- `docs/PROVIDER-UNBLOCKING-CHECKLIST.md` — **template langkah konkret untuk melepas setiap blocker** (pemilik, langkah, bukti selesai, status tracker)

### Rekomendasi berikutnya (di luar scope prompt)

1. Pilih vendor per baris Decision summary + siapkan kredensial (blocker table).
2. Jalankan CI di GitHub (push repo) untuk verifikasi pipeline nyata.
3. Staging deploy + pen/load/chaos test sebelum reklasifikasi ke "production deployed".
4. Legal review untuk DPA + compliance evidence final.

### Jalur self-hosted (alternatif tanpa DPA vendor)

**~80% blocker bisa diatasi dengan self-hosting open source** — tanpa akun vendor
eksternal, tanpa DPA, data kandidat tetap di infrastruktur Anda. Opsi per kategori
sudah ditambahkan ke `docker-compose.providers.yml`:

| Blocker | Opsi self-hosted (open source) | Port |
|---|---|---|
| Identity | Keycloak (OIDC/SAML/SCIM/MFA) | `8781` |
| Data | MongoDB + Vault (KMS) + MinIO | `8780/8782/8792` |
| Media (SFU) | LiveKit self-host | `7880–7888` |
| Media (TURN) | coturn | `8797` |
| Data platform | Redpanda + **Debezium** (CDC) | `8790/8791/8806` |
| AI (ASR) | **faster-whisper** | `8803` |
| AI (LLM) | Ollama (Windows host) | `172.24.16.1:11434` |
| AI (RAG) | Qdrant | `8799` |
| Calendar | **Radicale** (CalDAV) | `8804` |
| Email | **Postal** | `8805` |
| CI/CD | **Gitea + act_runner** | `8801` |
| WAF | **Coraza** (OWASP CRS v4) | `8802` |
| Observability | Grafana + Prometheus + Jaeger | `8783–8786` |

**Yang tidak bisa self-host murni:** cloud/VPS itu sendiri (tetap penyedia),
SMS gateway, dan chat jika klien terikat Slack/Teams. Self-hosted tetap butuh
keputusan organisasi (owner, budget server, on-call) dan untuk layanan publik
(email/SFU/TURN) butuh domain + IP publik + SSL + DNS (SPF/DKIM/DMARC).

Detail langkah per blocker + status tracker: **`docs/PROVIDER-UNBLOCKING-CHECKLIST.md`**.
Batasan jujur self-hosting & status provider: **`docs/HONEST-LIMITATIONS.md`**.
