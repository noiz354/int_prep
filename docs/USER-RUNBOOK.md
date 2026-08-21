# User runbook — local usable path

> **Audience:** a human who wants to click through SignalRoom, Ready, Vault, or the RTC room.  
> **Honesty:** this is **not** production. Sign-in is explicit (labelled demo or OIDC). Interviews persist in `data/signalroom-store.json`. Video in Live Studio is mostly CSS tiles.  
> **Next phase:** U2 replaces remaining seeded recruiter screens.

Source of capability truth: `src/data/capabilityRegistry.js` (also `docs/CAPABILITY-REGISTRY.md`).

---

## 0. What you can do today vs later

| Journey | Today | After which phase |
|---|---|---|
| Open the polished UI, click around seeded dashboards | Yes — `npm run dev` | — |
| Call the real local API (still in-memory, demo JWT) | Yes — `npm run start:usable` | U1 persists it |
| Log in as yourself via Keycloak | No (compose identity exists, not wired) | U1 |
| Keep interviews after restart | No | U1 |
| Two people in a real SFU room | No. RTC app = local camera loopback | U3 |
| Ask a real LLM | No. Deterministic adapters | U4 |
| Ready / Vault with your own durable data | Demo UI + optional in-memory APIs | U5 |

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

## 2. One-command main product (recommended)

```bash
npm run start:usable
```

This starts:

| Process | Bind | Notes |
|---|---|---|
| Express API | `0.0.0.0:8787` | Demo JWT, in-memory store, Socket.IO |
| Vite | `0.0.0.0:5190` | `VITE_USE_API=true`; browser uses **relative** `/api` and `/socket.io` |

Open the Vite URL printed in the terminal (hosted previews use the platform hostname, not localhost).

**Login (Phase U1):** with `VITE_USE_API=true` the UI **does not** auto-login Maya. You see a sign-in gate.

- **OIDC / Keycloak** — button enabled only when `KEYCLOAK_URL`, `KEYCLOAK_REALM`, and `OIDC_CLIENT_ID` are set. This environment has no Docker, so the button stays disabled unless you configure an IdP.
- **Labelled demo identity** — explicit buttons for Maya (talent ops) or Alex (candidate). Requires `ALLOW_DEMO_LOGIN=true` (default). Not silent.
- **Persistence** — interviews, audit, idempotency, org, and revoked JTIs write to `data/signalroom-store.json` and survive API restart. Mongo is still the production replacement when `MONGO_URL` is available.
- **Empty dashboard** — no Maya seed interviews unless `SIGNALROOM_SEED_DEMO=true`.

**Create a Keycloak user (for Phase U1, not wired yet):**

```bash
docker compose -f docker-compose.providers.yml --profile identity up -d
# Admin console: port 8781  (admin / dev-admin-password — dev only)
# Realm: signalroom (create if missing)
# Create a user you own. Do not expect the React app to redirect here until U1.
```

---

## 3. Manual equivalent (two terminals)

```bash
# Terminal 1
npm run api

# Terminal 2
VITE_USE_API=true npm run dev
```

Without `VITE_USE_API=true`, the UI uses local fallbacks (`src/lib/platformApi.js`) and will look more “alive” while remaining mocked.

---

## 4. Optional companion apps

Port **5190 is the main interview UI**. Ready used to collide on 5190; it now uses **5193**.

| App | Command | Port | API |
|---|---|---|---|
| Interview web | `npm run start:usable` or `VITE_USE_API=true npm run dev` | 5190 | 8787 |
| RTC interview | `npm run rtc:interview:web` | 5192 | uses main API when proxied |
| Career Vault web | `npm run career:vault:web` (see package) | 5191 | 8792 |
| Ready web | `npm --prefix apps/candidate-readiness-web run dev` | 5193 | 8790 |

```bash
# Vault API + web
npm run career:vault:api          # :8792  — conflicts with MinIO if compose profile `data` is up
npm --prefix apps/career-vault-web run dev   # :5191

# Ready API + web
npm run candidate:readiness:api   # :8790
npm --prefix apps/candidate-readiness-web run dev  # :5193
```

**Known collision:** Career Vault API default `PORT=8792` is the same as MinIO in `docker-compose.providers.yml`. If the `data` profile is running, start Vault API with `PORT=8793`.

Header identity on Ready/Vault APIs is a development scaffold. Do not spoof tenant headers in anything you call production.

---

## 5. Optional Docker providers (not required for start:usable)

Nothing in compose starts by default. Profiles are **adapters**, not production:

```bash
docker compose -f docker-compose.providers.yml --profile identity up -d
docker compose -f docker-compose.providers.yml --profile data up -d
docker compose -f docker-compose.providers.yml --profile media up -d
docker compose -f docker-compose.providers.yml --profile ai up -d
docker compose -f docker-compose.providers.yml --profile integrations up -d
docker compose -f docker-compose.providers.yml --profile delivery up -d
```

The control plane does **not** automatically use these until later phases wire them. Starting containers today does not reclassify capabilities to `provider_wired`.

---

## 6. Optional Python adapters

```bash
python -m venv .venv
. .venv/bin/activate
pip install -r services/ai/requirements.txt
AI_PORT=8788 uvicorn services.ai.main:app --host 0.0.0.0 --port 8788
```

Career Vault RAG / coaching AI: see each service `.env.example`. Responses are deterministic unless a model URL is wired (Phase U4).

---

## 7. Verify the checkout

```bash
npm run skills:check
npm test
npm run build
```

Latest expected bar is recorded in `progess.md`. `NODE_ENV=production` skips devDependencies and breaks `npm test`.

---

## 8. Ports cheat sheet

| Service | Port |
|---|---|
| Interview Vite | 5190 |
| Vault Vite | 5191 |
| RTC Vite | 5192 |
| Ready Vite | 5193 |
| Interview API | 8787 |
| Python AI | 8788 |
| Ready API | 8790 |
| Vault API | 8792 (or 8793 if MinIO is up) |
| Keycloak | 8781 |
| MongoDB | 8782 |
| Vault (HashiCorp) | 8780 |
| Redpanda | 8790 — **conflicts with Ready API** if both run |
| MinIO | 8792 — **conflicts with Vault API** |
| Qdrant | 8799 |

Redpanda `:8790` vs Ready API `:8790` is another collision. Do not start compose `data` and Ready API without remapping one of them.

---

## 9. Feature Catalog labels

In the interview app, **Feature Catalog** now shows truthful states (`Mocked UI`, `Local only`, …), not “Implemented foundation” for all 100 IDs. Ready and Vault Trust screens show the same schema for CR-* and CV-*.

Zero capabilities are `staging_verified` or `production_deployed`.
