# Provider Unblocking Checklist

> Template langkah konkret untuk melepas setiap **blocked on provider decision**.
> Setiap item punya: pemilik, langkah, dan bukti selesai (evidence). Checklist ini
> tidak mengubah kode — mengubah status dari *adapter-ready* menjadi *production deployed*.

**Cara pakai:** untuk tiap baris, isi pemilik + tanggal, centang langkah, dan lampirkan bukti. Checklist selesai = status capability bisa direklasifikasi.

> **Dua jalur untuk tiap blocker:**
> - **Self-hosted** — jalankan sendiri (open source, tanpa biaya langganan vendor, data tetap di kontrol Anda). Tetap butuh: keputusan organisasi (siapa maintain), hardware/VM, dan untuk layanan publik (email/SFU/TURN) butuh domain + IP publik + SSL. **DPA vendor tidak diperlukan** karena tidak ada pihak ketiga yang memproses data.
> - **Managed** — pakai vendor SaaS (rekomendasi Phase 0). Butuh akun, kredensial, DPA, dan approval.

---

## 0. Prasyarat umum (berlaku untuk semua — self-hosted ATAU managed)

| # | Langkah | Pemilik | Bukti selesai |
|---|---|---|---|
| 0.1 | Tentukan region data residency yang diizinkan (tempat kandidat berada) | Legal / CIO | Dokumen region policy |
| 0.2 | Setujui budget: self-hosted = biaya server/VM/ops; managed = langganan | Finance | Budget approval |
| 0.3 | Tentukan standar compliance yang dikejar (SOC 2 / ISO 27001 / GDPR) | Compliance officer | Scope statement |
| 0.4 | Tetapkan on-call owner + escalation path per layanan | Engineering lead | Runbook + roster |
| 0.5 | Simpan semua secret di vault (bukan .env atau repo) | Security | Secret inventory |
| 0.6 | Buat akun organisasi terpisah dari akun personal per vendor | Admin | Account list |
| 0.7 | **Khusus self-hosted:** siapkan VM/container host + backup + monitoring host | Infra | Host inventory |
| 0.8 | **Khusus self-hosted:** keputusan organisasi siapa pemilik operasional tiap service | Ops lead | Ownership doc |

---

## 1. Cloud & region

| # | Langkah | Pemilik | Bukti selesai |
|---|---|---|---|
| 1.1 | Pilih infrastruktur: cloud (AWS/Azure/GCP) vs VPS/colocation | CTO / Infra lead | Keputusan tertulis |
| 1.2 | Buat akun organisasi + region primer & DR | Finance / Admin | Account ID |
| 1.3 | Konfigurasi IAM least-privilege + MFA untuk admin | Security | IAM policy review |
| 1.4 | Buat VPC/network + security groups | Infra | IaC di repo |
| 1.5 | Konfigurasi data residency per tenant (region lock) | Legal + Infra | Policy + test |
| 1.6 | Aktifkan budget alert + cost monitoring | Finance | Alert config |

**Self-hosted option:** ⚠️ **Tidak sepenuhnya.** "Self-hosted cloud" berarti colocation/VPS (Hetzner, OVH, Vultr) — ini tetap penyedia infrastruktur. Anda bisa hindari AWS/Azure/GCP, tapi butuh VPS + pengelolaan server sendiri (OS patching, backup, HA). **DPA tetap dibutuhkan** dengan penyedia VPS karena mereka menyimpan data.

---

## 2. Identity provider (OIDC/SAML/SCIM/MFA)

| # | Langkah | Pemilik | Bukti selesai |
|---|---|---|---|
| 2.1 | Pilih IdP: Keycloak self-host vs Okta/Auth0/Entra ID | CTO / IT | Keputusan tertulis |
| 2.2 | Daftarkan domain + SSL cert | IT | Cert valid |
| 2.3 | Buat client app (OIDC) + client secret di vault | Security | Client ID + vault ref |
| 2.4 | Konfigurasi SAML assertion (jika ATS/enterprise butuh) | IT | SAML metadata |
| 2.5 | Aktifkan SCIM provisioning (user/tenant sync otomatis) | IT | SCIM endpoint live |
| 2.6 | Aktifkan MFA policy (TOTP/passkey) + step-up untuk admin | Security | MFA test pass |
| 2.7 | Migrasi dari demo login (`auth.mjs`) ke callback OIDC | Engineering | Integration test |

**Self-hosted option:** ✅ **Bisa penuh — Keycloak** (sudah jalan di `:8781`). OIDC + SAML + SCIM v2 + MFA TOTP/WebAuthn + step-up semua didukung. Tinggal: deploy production (bukan `start-dev`), Postgres backend, domain + SSL, backup. **Tanpa DPA vendor.**

---

## 3. Data: MongoDB, object storage, KMS, backup

| # | Langkah | Pemilik | Bukti selesai |
|---|---|---|---|
| 3.1 | Pilih: MongoDB Atlas vs self-managed MongoDB | Data lead | Keputusan |
| 3.2 | Deploy cluster + network (bukan public internet) | Infra | Cluster config |
| 3.3 | Aktifkan encryption at rest + CMK (KMS/HSM atau Vault transit) | Security | KMS key policy |
| 3.4 | Buat bucket object storage (SSE-KMS) untuk artifact/recording | Infra | Bucket policy |
| 3.5 | Konfigurasi Vault/Secrets Manager + rotasi 30 hari | Security | Rotation test |
| 3.6 | Aktifkan PITR backup + replica replication | Data lead | PITR enabled |
| 3.7 | Jalankan restore test (bukti RPO/RTO) | SRE | Restore evidence |

**Self-hosted option:** ✅ **Bisa penuh.** MongoDB Community (encryption at rest dengan keyfile) + **Vault transit** sebagai KMS + **MinIO** (S3-compatible) + replica-set untuk DR. Semua sudah ada di compose (`data` profile). **Tanpa DPA vendor.**

---

## 4. Media: SFU/WebRTC, TURN, recording

| # | Langkah | Pemilik | Bukti selesai |
|---|---|---|---|
| 4.1 | Pilih: LiveKit self-host vs mediasoup vs Daily/Twilio | Media lead | Keputusan |
| 4.2 | Deploy SFU + API key/secret (simpan di vault) | Infra | Key + vault ref |
| 4.3 | Konfigurasi region SFU + edge routing | Media lead | Region map |
| 4.4 | Konfigurasi TURN (coturn) — butuh IP publik | Infra | TURN test |
| 4.5 | Aktifkan recording egress → MinIO/S3 + malware scan | Security | Egress config |
| 4.6 | Uji multi-browser (Chrome/Firefox/Safari/Edge) join + reconnect | QA | Test matrix |
| 4.7 | Verifikasi ICE restart + adaptive bitrate + audio-only fallback | QA | Test evidence |

**Self-hosted option:** ✅ **Bisa — LiveKit self-host atau mediasoup** + **coturn** (sudah di compose `media` profile). ⚠️ **Butuh IP publik + port UDP terbuka** (3478/udp TURN, RTC range) dan domain + SSL untuk signaling. Media egress → MinIO. **Tanpa DPA vendor** (data tidak keluar infrastruktur Anda). Catatan: self-hosted SFU butuh SRE yang paham WebRTC + monitoring kualitas.

---

## 5. Integrations: calendar, email/SMS, ATS, HRIS, chat

| # | Langkah | Pemilik | Bukti selesai |
|---|---|---|---|
| 5.1 | Pilih provider per kategori (lihat self-hosted option) | IT / Ops | Keputusan |
| 5.2 | Deploy/konfigurasi + simpan secret di vault | Security | Vault refs |
| 5.3 | Konfigurasi domain + SSL | IT | App config |
| 5.4 | Field-map per provider (ATS/HRIS) | Ops | Mapping doc |
| 5.5 | Uji reconciliation: create/update/cancel + reschedule | QA | Sync test |
| 5.6 | Verifikasi webhook delivery signed + retry + DLQ | Engineering | Delivery log |

**Self-hosted option:** ⚠️ **Sebagian bisa:**
- **Calendar**: ✅ **Radicale** (CalDAV, ringan) atau **Nextcloud Calendar** — sync via CalDAV, bukan API Google.
- **Email**: ✅ **Postal** (SendGrid/Postmark alternative, open source) atau **Mailpit** (dev). ⚠️ Butuh domain + SPF/DKIM/DMARC + IP publik; deliverability butuh reputasi IP.
- **SMS**: ❌ **Tidak bisa self-hosted murni** — butuh SMS gateway (Twilio/WhatsApp Business API) atau modem GSM (scale kecil).
- **ATS**: ✅ **Reqcore / OpenCATS / RabbitHR** (open source ATS) — candidature pipeline, self-hosted.
- **HRIS**: ✅ **OrangeHRM** (GPL) atau **ERPNext HRMS** — employee records, leave, recruitment.
- **Chat (Slack/Teams)**: ⚠️ **Mattermost / Zulip / Rocket.Chat** — open source chat, integrasi webhook sama seperti Slack. Tapi jika organisasi Anda *sudah* pakai Slack/Teams, tidak bisa diganti.

---

## 6. Data platform: Kafka, schema registry, CDC, lakehouse

| # | Langkah | Pemilik | Bukti selesai |
|---|---|---|---|
| 6.1 | Pilih: Redpanda self-host vs MSK/Confluent | Data lead | Keputusan |
| 6.2 | Deploy cluster + topic ACL + retention policy | Infra | Topic config |
| 6.3 | Aktifkan Schema Registry + compatibility rules (Avro/Protobuf) | Data lead | SR config |
| 6.4 | Deploy Debezium CDC connector (Mongo oplog → Kafka) | Data lead | Connector live |
| 6.5 | Pilih lakehouse engine (DuckDB/Iceberg di MinIO) | Data lead | Engine config |
| 6.6 | Konfigurasi ETL orchestration (Dagster/Airflow self-host) | Data lead | Pipeline live |
| 6.7 | Uji replay/backfill/DLQ tanpa korupsi aggregate | QA | Replay test |

**Self-hosted option:** ✅ **Bisa penuh — Redpanda** (Kafka-compatible, no JVM, sudah di compose `data` profile, `:8790`/`:8791`) + **Debezium** (connector self-host) + **MinIO** (lakehouse landing) + **DuckDB** (analytics engine) + **Dagster/Airflow** (self-host). **Tanpa DPA vendor.**

---

## 7. AI: ASR, LLM, RAG, evaluasi

| # | Langkah | Pemilik | Bukti selesai |
|---|---|---|---|
| 7.1 | Pilih ASR: faster-whisper self-host vs Deepgram | AI lead | Keputusan |
| 7.2 | Pilih LLM: Ollama self-host vs Azure OpenAI | AI lead + Legal | Keputusan |
| 7.3 | Pilih RAG vector store: Qdrant self-host vs Cloud | AI lead | Store config |
| 7.4 | Tenant-partitioned retrieval + embedding model | AI lead | Isolation test |
| 7.5 | Jalankan evaluation suite (grounding, privacy, harmful, low-confidence) | AI lead | Eval report |
| 7.6 | Red-team test + bias/fairness monitoring | Security + AI | Red-team report |
| 7.7 | Konfigurasi reviewer queue + appeal workflow di produksi | Ops | Queue live |

**Self-hosted option:** ✅ **Bisa penuh:**
- **ASR**: ✅ **faster-whisper** (OpenAI Whisper via CTranslate2, 4x lebih cepat, streaming) — API OpenAI-compatible, bisa di-Docker.
- **LLM**: ✅ **Ollama** (sudah jalan di Windows host `172.24.16.1:11434`, model `granite3.1-dense:2b`, `llama3.1`, `qwen3`) — deploy ke server GPU/CPU yang lebih besar untuk produksi.
- **RAG**: ✅ **Qdrant self-host** (sudah di compose `ai` profile, `:8799`).
- **Evaluasi/red-team**: ✅ tooling self-host (promptfoo self-host).
- **Tanpa DPA vendor** — data tidak keluar infrastruktur. ⚠️ Trade-off: butuh GPU/server kuat untuk kualitas model besar; kualitas ASR/LLM lokal di bawah vendor terbaik untuk edge cases.

---

## 8. Observability, CI/CD, WAF, incident

| # | Langkah | Pemilik | Bukti selesai |
|---|---|---|---|
| 8.1 | Pilih: Grafana OSS self-host vs Grafana Cloud | SRE | Keputusan |
| 8.2 | Deploy OTel collector + Prometheus + Jaeger/Tempo + Grafana | SRE | Dashboards live |
| 8.3 | Push repo ke GitHub + aktifkan Actions | Eng lead | CI green |
| 8.4 | Deploy WAF: Coraza/ModSecurity vs AWS WAF | Security | WAF rules |
| 8.5 | Buat SLO alert routing + on-call (Alertmanager → email/webhook) | SRE | Alert fired test |
| 8.6 | Jalankan DR drill + restore test di environment nyata | SRE | Drill report |
| 8.7 | Pen/load/chaos test di staging | Security + QA | Test report |

**Self-hosted option:** ✅ **Bisa penuh:**
- **Observability**: ✅ **Grafana OSS + Prometheus + Tempo/Jaeger + Loki** (semua open source, sudah di compose `delivery` profile). ⚠️ Butuh VM + storage untuk retention.
- **CI/CD**: ✅ **Gitea + act_runner** (GitHub Actions-compatible, self-host) atau **Woodpecker CI**. Tidak wajib GitHub.
- **WAF**: ✅ **Coraza** (Go, ModSecurity-compatible, OWASP CRS v4) atau **ModSecurity**.
- **Incident/on-call**: ⚠️ **Alertmanager + webhook ke email/Mattermost** bisa; PagerDuty/Opsgenie alternatif self-host terbatas.
- **Tanpa DPA vendor** (semua self-hosted).

---

## 9. Compliance & retention

| # | Langkah | Pemilik | Bukti selesai |
|---|---|---|---|
| 9.1 | Legal review: DPA (jika managed) ATAU dokumentasi kontrol self-hosted | Legal | Review sign-off |
| 9.2 | Tetapkan retention default (media/transkrip 90 hari) + legal hold | Compliance | Policy doc |
| 9.3 | Konfigurasi DSAR export + verified deletion end-to-end | Engineering | DSAR test |
| 9.4 | Immutable audit export + retention audit log (7 tahun) | Security | Export test |
| 9.5 | Fairness monitoring + bias threshold + red-team cadence | AI lead | Monitoring live |
| 9.6 | SOC 2 / ISO audit readiness review | Compliance | Audit prep |

**Self-hosted option:** ✅ **Justru lebih mudah** untuk compliance/privacy: data tidak keluar ke pihak ketiga, DSAR/deletion lebih mudah dipenuhi, tidak butuh DPA vendor (kecuali VPS host + SMS gateway). ⚠️ Tapi **audit SOC 2 tetap butuh** bukti kontrol operasional Anda sendiri (patching, backup, access control, monitoring) — self-hosted artinya *Anda* yang bertanggung jawab penuh atas kontrol itu.

---

## Ringkasan: self-hosted vs managed

| Kategori | Self-hosted? | Opsi self-hosted | Butuh DPA vendor? |
|---|---|---|---|
| 1. Cloud/infra | ⚠️ Sebagian | VPS/colocation (Hetzner/OVH) | Ya (dengan host VPS) |
| 2. Identity | ✅ Penuh | **Keycloak** (OIDC/SAML/SCIM/MFA) | Tidak |
| 3. Data | ✅ Penuh | MongoDB + Vault + MinIO | Tidak |
| 4. Media | ✅ Penuh (butuh IP publik) | LiveKit/mediasoup + coturn + MinIO | Tidak |
| 5a. Calendar | ✅ Penuh | Radicale / Nextcloud (CalDAV) | Tidak |
| 5b. Email | ✅ Penuh (butuh domain/SPF/DKIM) | Postal | Tidak |
| 5c. SMS | ❌ Tidak | — (butuh gateway/modem) | Ya (dengan gateway) |
| 5d. ATS | ✅ Penuh | Reqcore / OpenCATS / RabbitHR | Tidak |
| 5e. HRIS | ✅ Penuh | OrangeHRM / ERPNext | Tidak |
| 5f. Chat | ⚠️ Jika klien tidak terikat Slack/Teams | Mattermost / Zulip | Tidak |
| 6. Data platform | ✅ Penuh | Redpanda + Debezium + MinIO + DuckDB | Tidak |
| 7. AI | ✅ Penuh (butuh GPU untuk kualitas) | faster-whisper + Ollama + Qdrant | Tidak |
| 8. Observability/CI/CD/WAF | ✅ Penuh | Grafana + Prometheus + Tempo + Gitea + Coraza | Tidak |
| 9. Compliance | ✅ (kontrol di tangan Anda) | Dokumentasi kontrol internal | Tidak (kecuali host) |

**Kesimpulan jujur:**
- **~80% blocker bisa di-self-host** tanpa DPA vendor — data kandidat tetap di infrastruktur Anda.
- **Yang tidak bisa self-host murni:** cloud/VPS itu sendiri (tetap penyedia), SMS gateway, dan chat jika organisasi klien terikat Slack/Teams.
- **Self-hosted bukan "gratis tanpa approval"** — tetap butuh keputusan organisasi (siapa maintain, budget server, on-call) dan untuk layanan publik (email, SFU, TURN) butuh domain + IP publik + SSL + konfigurasi DNS (SPF/DKIM/DMARC untuk email).
- **Status tetap `blocked on provider decision`** sampai keputusan self-hosted vs managed diambil per kategori — sesuai rule 6 prompt. Setelah keputusan + deploy, status bisa direklasifikasi ke `production deployed (self-hosted)`.

---

## Status tracker

| Blocker | Jalur (self-hosted/managed) | Pemilik | Progress | Tanggal target | Status |
|---|---|---|---|---|---|
| 1. Cloud/infra | | | | | ⬜ |
| 2. Identity | | | | | ⬜ |
| 3. Data | | | | | ⬜ |
| 4. Media | | | | | ⬜ |
| 5. Integrations | | | | | ⬜ |
| 6. Data platform | | | | | ⬜ |
| 7. AI | | | | | ⬜ |
| 8. Observability/CI/CD | | | | | ⬜ |
| 9. Compliance | | | | | ⬜ |

**Definisi selesai per blocker:** semua item checklist-nya tercentang + bukti terlampir → capability direklasifikasi dari `blocked on provider decision` ke `production deployed` (self-hosted ATAU managed) — per `progess.md` → "Definition of done for a production rollout".

**Batasan jujur:** lihat `docs/HONEST-LIMITATIONS.md` — apa yang tidak bisa self-host murni, keputusan organisasi yang wajib, dan syarat reklasifikasi.
