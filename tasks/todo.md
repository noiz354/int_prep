# Task List — SignalRoom Ready Port

## Phase 1: Foundation (cr-domain)

- [ ] Task 1: Port `packages/candidate-readiness-domain/` (entities.mjs, policies.mjs, readinessService.mjs, package.json)
  - Acceptance: domain service exposes profile/job/plan/story/practice/coach/booking/handoff/opportunity/application/campaign/consent/device/dashboard/export; `assertPreparationOnly` rejects `live_assessment`; same-tenant scope enforced
  - Verify: `npm --prefix packages/candidate-readiness-domain run test`
  - Files: `packages/candidate-readiness-domain/{package.json,src/*,test/*}`

- [ ] Task 2: Port domain tests (readinessService.test.mjs, opportunityWorkflow.test.mjs)
  - Acceptance: tests cover source approval, live-assessment denial, verified-coach sharing, role intelligence, practice feedback, campaign safety/duplicates
  - Verify: `npm run test:contracts` (after root wiring) or direct node --test
  - Files: `packages/candidate-readiness-domain/test/*`

## Phase 2: API (cr-api)

- [ ] Task 3: Port `services/candidate-readiness-api/` (server.mjs, package.json, .env.example)
  - Acceptance: 17 routes; header tenant/actor/role seam; idempotency on mutations; audit events; preparation-only lockout
  - Verify: `node --test` smoke (start service, hit /health and /v1/job-descriptions)
  - Files: `services/candidate-readiness-api/{package.json,src/server.mjs,.env.example}`

## Phase 3: AI (cr-ai)

- [ ] Task 4: Port `services/candidate-coaching-ai/` (main.py, requirements.txt, .env.example)
  - Acceptance: FastAPI deterministic endpoints with consent + tenant gates; `usage_boundary: practice_only_not_for_live_assessment`
  - Verify: `python -m py_compile` if python available (no runtime deps added)
  - Files: `services/candidate-coaching-ai/{app/main.py,requirements.txt,.env.example}`

## Phase 4: Web (cr-web)

- [ ] Task 5: Port `apps/candidate-readiness-web/` (index.html, vite.config.js, package.json, src/*)
  - Acceptance: 6 screens (overview/role/practice/coaches/opportunities/trust) render; demo-mode seam `VITE_READINESS_API_MODE=remote`
  - Verify: `npm --prefix apps/candidate-readiness-web run build`
  - Files: `apps/candidate-readiness-web/**`

## Phase 5: Docs + skill (cr-docs, cr-skill)

- [ ] Task 6: Port docs (PRD, FEATURES, UAT, IMPLEMENTATION-CANDIDATE-READINESS, MOCK-STUB-AUDIT) + `candidate-readiness/` guide + `.agents/skills/candidate-readiness-coaching/`
  - Acceptance: docs present, traceable to CR IDs and UAT IDs; skill validates
  - Verify: `npm run skills:check` (after skill port)
  - Files: `docs/*Candidate-Readiness*`, `docs/MOCK-STUB-AUDIT.md`, `candidate-readiness/*`, `.agents/skills/candidate-readiness-coaching/SKILL.md`

## Phase 6: Root wiring + verification

- [ ] Task 7: Wire root package.json scripts (test:contracts glob, candidate:readiness:*)
  - Acceptance: `npm run skills:check`, `npm test`, `npm run build` all pass with new context included
  - Verify: full commands above
  - Files: `package.json`

## Checkpoint: Complete

- [ ] All domain/API tests pass; web build passes; skills check passes
- [ ] No existing file overwritten (git status shows only additions + package.json)
- [ ] `progess.md` / `docs/IMPLEMENTATION-STATUS.md` updated with truthful CR status
- [ ] Human review before any Phase 2 production work
