# Batasan Jujur — Self-Hosting & Status Provider

> Dokumen ini mencatat batasan **jujur** (honest limitations) dari jalur self-hosting
> dan status provider SignalRoom. Tujuannya: mencegah overclaim — tidak ada fitur
> yang diklaim production hanya karena adapter lokal sudah berjalan dan diuji.
> Berlaku sebagai kontrak status sampai keputusan organisasi diambil.

---

## 1. Yang tidak bisa self-host murni

| Item | Kenapa tidak bisa | Alternatif |
|---|---|---|
| **Cloud / VPS itu sendiri** | "Self-hosted cloud" tetap berarti colocation/VPS (Hetzner, OVH, Vultr) — masih ada penyedia infrastruktur yang menyimpan disk dan memproses data | AWS/Azure/GCP ATAU VPS + **DPA tetap dibutuhkan dengan penyedia VPS** |
| **SMS gateway** | Butuh akses jaringan telekomunikasi (Twilio, WhatsApp Business API) atau modem GSM — tidak ada open-source murni untuk mengirim SMS nyata | Twilio/gateway komersial (butuh DPA), atau modem GSM untuk skala kecil |
| **Chat, jika klien terikat Slack/Teams** | Organisasi klien yang sudah berkontrak Slack/Teams tidak bisa dipaksa pindah ke self-hosted | Mattermost/Zulip untuk organisasi baru; Slack/Teams untuk klien yang sudah terikat |

---

## 2. Self-hosted tetap butuh approval organisasi

Self-hosted **bukan** "gratis tanpa persetujuan". Yang wajib diputuskan organisasi:

| Keputusan | Detail |
|---|---|
| **Pemilik operasional** | Siapa yang maintain tiap service self-hosted (patching, upgrade, incident response) |
| **Budget server/VM** | Biaya hardware/VM, storage, bandwidth, dan backup — bukan langganan, tapi tetap biaya |
| **On-call & escalation** | Roster on-call, runbook, jalur eskalasi per layanan |
| **Monitoring host** | Host-level monitoring, disk, CPU, memory, log retention |

**Untuk layanan publik (email / SFU / TURN) wajib punya:**

- **Domain** + **IP publik** + **SSL certificate**
- Konfigurasi **DNS**: SPF, DKIM, DMARC (khusus email) — tanpa ini email masuk spam
- Port UDP terbuka (TURN/RTC) dan pengelolaan firewall
- **Reputasi IP** untuk deliverability email (butuh waktu dibangun)

---

## 3. Status tetap `blocked on provider decision`

- Status setiap capability tetap **`blocked on provider decision`** sampai organisasi
  memilih jalur (self-hosted ATAU managed) per kategori.
- Ini sesuai **rule 6** di `PROMPT-FINISH-STUBS-PHASED.md`:
  > *"If a required decision or credential is missing, build only the tested
  > adapter boundary and label it clearly as blocked on provider decision.
  > Do not mark it production complete."*
- Artinya: **kode adapter sudah ditulis, diuji, dan siap dihubungkan** — tapi
  tersambung ke vendor nyata hanya bisa terjadi setelah akun dibuat, kontrak
  legal ditandatangani (jika managed), dan organisasi menyetujui pilihannya.

---

## 4. Jalur reklasifikasi

| Status sekarang | Syarat pindah status |
|---|---|
| `adapter-ready` / `blocked on provider decision` | — (kondisi saat ini) |
| `production deployed (self-hosted)` | Organisasi memilih self-hosted + deploy + verifikasi: owner, budget, on-call, domain/IP publik/SSL/DNS, backup, monitoring, restore test |
| `production deployed (managed)` | Organisasi memilih vendor + akun + kredensial + DPA + legal review |

Reklasifikasi hanya boleh terjadi setelah **checklist per blocker selesai + bukti
terlampir** — lihat `docs/PROVIDER-UNBLOCKING-CHECKLIST.md` dan
`docs/PRODUCTION-DECISION-BRIEF.md`.

---

## 5. Prinsip yang dijaga

1. **No fake production claims** — demo UI, in-memory implementation, deterministic
   adapter, atau mock response bukan bukti production.
2. **Data kandidat tidak keluar infrastruktur tanpa persetujuan** — self-hosted
   menghindari DPA vendor; managed mewajibkan DPA.
3. **Keputusan bisnis tidak diambil developer/agent** — pilih vendor, budget,
   region legal, dan compliance standard adalah keputusan organisasi.
4. **Setiap perubahan status didokumentasikan** — `progess.md`,
   `docs/IMPLEMENTATION-STATUS.md`, dan Feature Catalog harus diperbarui
   bersama reklasifikasi.

---

*Dokumen terkait: `docs/PRODUCTION-DECISION-BRIEF.md` · `docs/PROVIDER-UNBLOCKING-CHECKLIST.md` · `docs/THREAT-MODEL.md` · `docs/IMPLEMENTATION-STATUS.md` · `progess.md`*
