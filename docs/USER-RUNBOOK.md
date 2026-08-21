# User runbook — local usable path

> **Audience:** a human who wants to click through SignalRoom, Ready, Vault, or the RTC room in under 15 minutes.  
> **Honesty:** this is **not** production. Sign-in is explicit (labelled demo or OIDC). Interviews persist in `data/signalroom-store.json`. Live Studio is peer-to-peer WebRTC, **not** LiveKit.  
> **Phases U0–U7** of `PROMPT-USER-USABLE-PRODUCTION.md` are complete on this self-hosted path. Nothing is `staging_verified`.

Source of capability truth: `src/data/capabilityRegistry.js` (also `docs/CAPABILITY-REGISTRY.md`). Evidence: `docs/UAT-EVIDENCE.md`.

---

## 0. What you can do today vs later

| Journey | Today | Notes |
|---|---|---|
| Open the polished UI, click around seeded dashboards | Yes — `npm run dev` | Mocked / labelled seed |
| Call the real local API with a sign-in gate | Yes — `npm run start:usable` | U1 |
| Create/schedule/search interviews as the signed-in recruiter | Yes — `data/signalroom-store.json` | U2 |
| Log in as yourself via Keycloak | Adapter ready; Docker IdP not running here | when Keycloak env is set |
| Keep interviews after restart | Yes — file store | Mongo when `MONGO_URL` is set |
| Two browsers in the same interview room | Yes — P2P WebRTC on the same machine | U3; SFU still later |
| Ask a grounded copilot question | Yes — consent; Ollama or labelled fallback | U4 |
| Ready / Vault with your own durable data | Yes — file store + JWT (Alex) | U5; Gmail/payments blocked |
| Data Pulse / Trust / Ops / Integrations with honest health | Yes — probes | U6; never “Connected to Greenhouse” |
| One command for interview + Ready + Vault | Yes — `npm run start:usable` | U7 |

---

## 1. Prerequisites

- Node.js 22+ (or the version that already runs `npm test` here)
- Optional: Docker, only if you start provider profiles
- Optional: Python 3.11+, only for AI/RAG adapters

```bash
npm install
cp -n .env.example .env
```

Do **not** put real secrets in `.env`. Demo values only.

---

## 2. One-command path (recommended, <15 minutes)

```bash
npm run start:usable
```

This starts:

| Process | Bind | Notes |
|---|---|---|
| Express API | `0.0.0.0:8787` | Demo JWT, file store, Socket.IO |
| Vite | `0.0.0.0:5190` | `VITE_USE_API=true`; browser uses **relative** `/api` and `/socket.io` |
| Ready API + web | `8790` / `5193` | unless `START_READY_VAULT=false` |
| Vault API + web | `8792` / `5191` | unless `START_READY_VAULT=false` |

Open the Vite URL printed in the terminal (hosted previews use the platform hostname, not localhost).

**Login:** the UI **does not** auto-login Maya.

- **OIDC / Keycloak** — enabled only when `KEYCLOAK_URL`, `KEYCLOAK_REALM`, and `OIDC_CLIENT_ID` are set.
- **Labelled demo identity** — Maya (talent ops) or Alex (candidate). `ALLOW_DEMO_LOGIN=true` (default).
- **Persistence** — `data/signalroom-store.json` (and Ready/Vault JSON stores). Mongo when `MONGO_URL` is available.
- **Empty dashboard** — no Maya seed interviews unless `SIGNALROOM_SEED_DEMO=true`.

### Recruiter + candidate (same machine)

1. Browser A: Maya → Schedule interview → optional invitation `alex.morgan@example.test` → copy `/?invite=…`.
2. Browser A: **Open room** → **Enable camera** (user gesture).
3. Browser B: Alex → invite URL → consent → device test → **Enable camera**.
4. Remote tile is **peer-to-peer**, not LiveKit. Leave stops tracks.

### Copilot

Intelligence → consent toggle → Ask. Provider is `ollama` or `deterministic-fallback`.

### Ready / Vault

Sign in as **Alex** on :5193 / :5191. `live_assessment` is rejected. Gmail stays blocked.

---

## 3. Manual equivalent (two terminals)

```bash
npm run api
VITE_USE_API=true npm run dev
```

Without `VITE_USE_API=true`, the UI uses local fallbacks and looks more “alive” while remaining mocked.

---

## 4. Optional companion apps

| App | Command | Port | API |
|---|---|---|---|
| Interview web | `npm run start:usable` | 5190 | 8787 |
| RTC interview | `npm run rtc:interview:web` | 5192 | main API when proxied |
| Career Vault web | started by `start:usable` | 5191 | 8792 |
| Ready web | started by `start:usable` | 5193 | 8790 |

**Collisions:** Vault API `8792` = MinIO; Ready API `8790` = Redpanda. Remap one side if compose `data` is up.

---

## 5. Optional Docker providers (not required)

```bash
docker compose -f docker-compose.providers.yml --profile identity up -d
docker compose -f docker-compose.providers.yml --profile data up -d
```

Starting containers does **not** reclassify capabilities to `provider_wired` until the default path uses them.

---

## 6. Verify the checkout

```bash
npm run skills:check
npm test
npm run build
```

`NODE_ENV=production` skips devDependencies and breaks `npm test`.

---

## 7. Ports cheat sheet

| Service | Port |
|---|---|
| Interview Vite | 5190 |
| Vault Vite | 5191 |
| RTC Vite | 5192 |
| Ready Vite | 5193 |
| Interview API | 8787 |
| Ready API | 8790 |
| Vault API | 8792 (or 8793 if MinIO is up) |
| Keycloak | 8781 |
| MongoDB | 8782 |
| Redpanda | 8790 — conflicts with Ready API |
| MinIO | 8792 — conflicts with Vault API |
| Qdrant | 8799 |
| OTLP collector | 8785 |

---

## 8. Feature Catalog labels

States: `Mocked UI`, `Local only`, `Provider wired`, `Staging verified`, `Production deployed`, `Blocked on decision`.

Zero capabilities are `staging_verified` or `production_deployed`.
