# Implementation Plan — SignalRoom Ready (Candidate Readiness & Coaching)

## Overview

Port the separate Candidate Readiness & Coaching bounded context ("SignalRoom Ready") from
`21-8-26-tasks/extracted-workspace/` into this repository. The repo already contains the
full 100-feature hiring-evaluation platform (Phase 1–5 service boundaries); the readiness
context is entirely missing and is additive, non-destructive work.

Product boundary: candidate preparation only. It must never provide covert live-assessment
assistance, never auto-disposition a candidate, never infer protected traits, and must keep
preparation data separate from hiring-evaluation data by default.

## Capability map

| Module id | Responsibility | Depends on |
|---|---|---|
| cr-domain | Entities, policy guards, in-memory readiness service (source approval, plans, practice, coaches, handoff, opportunities, campaigns, consent, audit, export) | — |
| cr-api | Express service (17 routes) with tenant/actor headers, idempotency, audit, preparation-only lockout | cr-domain |
| cr-ai | FastAPI deterministic coaching scaffold (role intelligence, questions, feedback, handoff, materials), consent + tenant gates | cr-domain (contract) |
| cr-web | Standalone Vite/React preparation UX (overview, role, practice, coaches, opportunities, trust) | cr-api contract (demo-mode seam) |
| cr-docs | PRD, feature catalog, UAT, implementation status, context guide | — |
| cr-skill | `candidate-readiness-coaching` agent skill | — |

Build order: cr-domain → cr-api → cr-ai → cr-web → cr-docs → cr-skill → root wiring.

## Architecture decisions

- **Additive port only.** Do not overwrite any existing `src/` or `apps/api/` file — they are
  identical-or-newer than the workspace snapshot. Only missing directories are created.
- **No new dependencies.** The scaffold intentionally reuses the root toolchain
  (`express`, `zod`, `react`, `vite`, `node:test`) per the workspace `candidate-readiness/README.md`.
- **Standalone web app.** `apps/candidate-readiness-web/` keeps its own Vite config on port 5190
  (root Vite stays on 5190? — root uses 5190 per current `vite.config.js`; the workspace web app
  also uses 5190 in its own config. Keep as shipped, it is a separate `npm --prefix` process).
- **Truthful status.** CR features are scaffold/local-only until provider decisions; status docs
  use the honest state model (mocked / local_only / provider_ready / staging_verified /
  production_deployed / blocked_on_decision) per `MOCK-STUB-AUDIT.md`.
- **Test integration.** Domain tests join `npm run test:contracts`; web build gets a root script.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Ported API headers (X-Tenant-Id etc.) are dev-only identity | High | Keep `development-scaffold` label + doc; production path documented as OIDC/SAML |
| AI service is deterministic, not a real model | Medium | Explicit `model_version` + `boundary` + human-review fields; no production claim |
| `crypto` global availability in Node 22 test env | Low | Node 22 exposes `crypto.randomUUID` globally; tests are node:test, not jsdom |
| Vite port collision (5190 vs root 5190) | Low | Separate processes/prefix; verify build only (no dev server) in CI |

## Open questions

- None blocking: port is scaffold-complete as shipped in the workspace snapshot.
