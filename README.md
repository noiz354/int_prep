# SignalRoom — Enterprise Interview Intelligence Platform

A runnable **local** interview product plus Candidate Readiness (Ready) and Career Vault. Every PRD/CR/CV ID has an adapter or a labelled gap. **Nothing is `staging_verified` or `production_deployed`.**

> **What is runnable now:** one command (`npm run start:usable`) starts the interview API + UI, and Ready + Vault unless you set `START_READY_VAULT=false`. Sign-in is explicit (labelled demo JWT or OIDC when configured). Data survives restart in gitignored JSON files. Live Studio is **peer-to-peer WebRTC**, not LiveKit. Copilot is consent-gated (Ollama if up, else labelled fallback). Integrations say **sandbox mock / not connected**, never “Connected to Greenhouse”.

## What a human can complete (local_only)

| Journey | Status |
|---|---|
| Sign in (Maya / Alex demo buttons; OIDC if Keycloak env is set) | Works locally |
| Recruiter: create/schedule interview, invitation token, search | Persists in `data/signalroom-store.json` |
| Candidate portal: invite → consent → waiting room → join P2P room | Same-machine browsers; not SFU/TURN |
| Intelligence / Live Studio copilot | Consent required; labelled fallback if Ollama down |
| Ready: JD, plan, practice, export/delete | File store; Alex JWT; `live_assessment` rejected |
| Vault: opportunity, artifact, RAG/abstain, share, export/delete | File store; Gmail OAuth blocked |
| Data Pulse / Trust / Operations / Integrations | Live probes; honest connected vs mocked |

## What is blocked or still mocked

| Item | Why |
|---|---|
| Keycloak / Mongo as the default path | No Docker in this environment; OIDC 503 until env is set |
| LiveKit SFU, TURN, recording egress | P2P only; prep SFU (CR-30) blocked |
| Gmail / calendar OAuth (CV-05, CV-07) | No OAuth app |
| Payments (CR-29), coding sandbox (CR-21), ATS OAuth (CR-48) | Provider decision |
| Transcript ASR, Monaco/CRDT, executive analytics numbers | Still mocked UI (FE-05, FE-06, EO-09, …) |

Honest per-ID labels: [`docs/CAPABILITY-REGISTRY.md`](docs/CAPABILITY-REGISTRY.md). Human steps: [`docs/USER-RUNBOOK.md`](docs/USER-RUNBOOK.md). UAT: [`docs/UAT-EVIDENCE.md`](docs/UAT-EVIDENCE.md). Threat model is unchanged in spirit: [`docs/THREAT-MODEL.md`](docs/THREAT-MODEL.md), [`docs/HONEST-LIMITATIONS.md`](docs/HONEST-LIMITATIONS.md).

## 15-minute local path

```bash
npm install
cp -n .env.example .env   # demo values only — no real secrets
npm run start:usable
```

1. Open the Vite URL on port **5190** (hosted previews use the platform hostname, not localhost).
2. **Use demo identity · Maya Patel** (talent ops). Dashboard is empty until you create an interview.
3. Schedule an interview (optional invite `alex.morgan@example.test`). Refresh — it is still there.
4. Optional: Ready **5193** / Vault **5191** as **Alex**.
5. Feature Catalog shows `Mocked UI` / `Local only` / `Blocked on decision` — not “production”.

Browser code uses **relative** `/api` and `/socket.io`. Servers bind `0.0.0.0`.

### Manual equivalent

```bash
npm run api
VITE_USE_API=true npm run dev
```

`npm run dev` alone is the seeded UI (demo mode). Do not call that production.

### Optional Docker providers

Nothing in compose starts by default. Profiles are adapters, not production:

```bash
docker compose -f docker-compose.providers.yml --profile identity up -d
docker compose -f docker-compose.providers.yml --profile data up -d
```

Port collisions: Redpanda **8790** vs Ready API; MinIO **8792** vs Vault API. See the runbook.

### Ports

| Service | Port |
|---|---|
| Interview Vite | 5190 |
| Vault Vite | 5191 |
| RTC Vite | 5192 |
| Ready Vite | 5193 |
| Interview API | 8787 |
| Ready API | 8790 |
| Vault API | 8792 |

```bash
npm test
npm run build
```

## Repository map

```text
src/                              Interview React app
apps/api/                         Interview control plane
apps/candidate-readiness-web/     Ready UI (5193)
apps/career-vault-web/            Vault UI (5191)
apps/rtc-interview-web/           RTC room (5192)
services/                         Ready/Vault APIs, AI, event gateway
docs/USER-RUNBOOK.md              Human boot path
docs/UAT-EVIDENCE.md              Self-hosted UAT P0 evidence
```

## Engineering posture

- **No fake production claims.** Registry: mocked / local_only / blocked_on_decision. User-usable count is **0** until a provider is actually up and UAT’d.
- **Trust:** labelled demo or OIDC, tenant RBAC, consent gates, hash-chained audit, assistive AI only (no auto hire/reject).
- **A11y:** keyboard, focus, reduced-motion in the shell; no axe UAT pack yet.

Coding-agent prompts: [Finish stubs (done)](PROMPT-FINISH-STUBS-PHASED.md) · [User-usable path U0–U7](PROMPT-USER-USABLE-PRODUCTION.md) (U7 is the last phase of that prompt).
