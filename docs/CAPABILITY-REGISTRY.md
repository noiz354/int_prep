# Capability registry — truthful status

> **Source of truth (code):** `src/data/capabilityRegistry.js`  
> **Consumed by:** Feature Catalog, Control Center, Enterprise Scale, Ready Trust screen, Vault Trust screen, `progess.md`, contract tests.  
> **Phase:** U0. No provider is wired. Nothing is `staging_verified` or `production_deployed`.

## State model

| State | Meaning | User can complete the job? |
|---|---|---|
| `mocked` | Seeded or simulated UI | No |
| `local_only` | In-process contract / browser behavior | Only inside this process, demo identity |
| `provider_wired` | Default path talks to a running provider | Yes, locally or managed |
| `staging_verified` | UAT P0 against that provider | Yes, in staging |
| `production_deployed` | Live for real users | Yes |
| `blocked_on_decision` | Needs org/provider choice before a useful path exists | No |

Almost every row also has `productionGate: blocked_on_decision` until credentials, DPA/self-host ownership, and UAT exist. That gate is **not** the same as the user-visible `state`.

## Counts (U0)

| Product | Total | mocked | local_only | provider_wired | staging_verified | production_deployed | blocked_on_decision |
|---|---:|---:|---:|---:|---:|---:|---:|
| Interview (PRD) | 100 | 15 | 85 | 0 | 0 | 0 | 0 |
| Ready (CR-01…48) | 48 | 26 | 18 | 0 | 0 | 0 | 4 |
| Vault (CV-01…20) | 20 | 1 | 17 | 0 | 0 | 0 | 2 |
| **All** | **168** | **42** | **120** | **0** | **0** | **0** | **6** |

User-usable (`provider_wired` + `staging_verified` + `production_deployed`): **0**.

## Interview mocked (15)

AI-07, FE-05, FE-06, FE-07, FE-09, FE-10, DO-01, DO-02, DO-03, DO-09, DO-10, EO-05, EO-06, EO-07, EO-09.

## Ready blocked (4)

CR-21 coding sandbox, CR-29 payments, CR-30 preparation SFU, CR-48 program integrations.

## Vault blocked (2)

CV-05 Gmail OAuth, CV-07 calendar OAuth.

## How to reclassify

A later phase may move a row only when the Definition of Done in `PROMPT-USER-USABLE-PRODUCTION.md` is met. Updating this markdown without the JS registry is a defect.
