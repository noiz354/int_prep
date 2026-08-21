# Task List — Career Vault & RAG Planner

## Phase 1: Domain (cv-domain)

- [ ] Task 1: `packages/career-vault-domain` — entities, policies, timeline/vault service
  - Acceptance: manual opportunity/status (CV-01), notes/feedback artifacts private by default (CV-02), consent + retention (CV-03/CV-04), review-before-import contract, exclusion (CV-11), export (CV-14), delete propagation (CV-15), lockout (CV-17), action inbox, audit
  - Verify: `npm --prefix packages/career-vault-domain run test`
  - Files: `packages/career-vault-domain/{package.json,src/*,test/*}`

## Phase 2: RAG (cv-rag)

- [ ] Task 2: `services/career-vault-rag` — retrieval + citation + abstention + plans
  - Acceptance: tenant/candidate-scoped retrieval (CV-16), citations mandatory (CV-08/CV-09), abstention (CV-10), feedback-theme clustering, 7-day plan, lockout (CV-17), exclusion honored (CV-11)
  - Verify: `python3 -m py_compile` + node-side contract tests (or Python unittest if available)
  - Files: `services/career-vault-rag/{app/main.py,requirements.txt,.env.example}`

## Phase 3: API (cv-api)

- [ ] Task 3: `services/career-vault-api` — Express routes + idempotency + audit
  - Acceptance: timeline/vault/rag/export/delete/audit routes; header identity seam; idempotency on mutations; lockout; cross-tenant denied
  - Verify: smoke test via node (health, create, deny)
  - Files: `services/career-vault-api/{package.json,src/server.mjs,.env.example}`

## Phase 4: Web (cv-web)

- [ ] Task 4: `apps/career-vault-web` — Vite/React Timeline, Vault, Career Coach, Trust
  - Acceptance: manual opportunity capture, note/artifact upload (demo), RAG ask with citations/abstention, consent toggles, export/delete request, lockout notice
  - Verify: `npm --prefix apps/career-vault-web run build`
  - Files: `apps/career-vault-web/**`

## Phase 5: Docs + wiring + verification

- [ ] Task 5: Root wiring + docs
  - Acceptance: `package.json` scripts; docs ported (PRD/UAT) + API.md/ARCHITECTURE.md/IMPLEMENTATION-STATUS.md updated; full `npm test`, builds, `skills:check`, audit pass
  - Verify: full suite commands
  - Files: `package.json`, `docs/*`, `progess.md`

## Checkpoint: Complete

- [ ] All tests/builds pass; no existing file overwritten
- [ ] Truthful status labels in docs
- [ ] Human review before Phase 3–5 production work
