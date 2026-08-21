# SignalRoom Ready — Separate Candidate Readiness & Coaching Bounded Context

This scaffold is intentionally separate from the hiring-evaluation product.

## Separation rule

- **Candidate Readiness:** candidate-owned plans, practice sessions, coaching preferences, handoff summaries, and preparation artifacts.
- **Hiring Evaluation:** live interview artifacts, interviewer feedback, scorecards, integrity events, and hiring decisions.
- There is no default data flow from readiness into hiring evaluation. Any candidate sharing must be explicit, granular, revocable where legally possible, and auditable.

## Folder layout

```text
candidate-readiness/                   Context guide and delivery boundary
apps/candidate-readiness-web/          Standalone React/Vite candidate preparation UX
services/candidate-readiness-api/      Tenant-aware preparation/coaching API scaffold
services/candidate-coaching-ai/        Consent-gated AI coaching FastAPI scaffold
packages/candidate-readiness-domain/   Shared entities, policy guards, and local domain service
```

## Dependency model

This scaffold intentionally reuses the root monorepo toolchain (`react`, `vite`, `express`, `zod`, and test tooling). It does not add a new third-party dependency or remote provider plugin.

## Current scaffold level

| Layer | Status | Production replacement required |
|---|---|---|
| Web UX | Functional local scaffold | Approved design system/API auth integration |
| Domain service | Functional in-memory policy scaffold | Persistent tenant-scoped repository and migration strategy |
| API | Functional development API scaffold | OIDC/SAML middleware, durable persistence, rate limit, audit/event gateway |
| AI coaching | Consent/boundary-safe deterministic scaffold | Approved model/RAG/ASR provider, evaluation and human-review workflow |

## Boundary rules

1. The coaching product must never operate in a real hiring-assessment room.
2. It must not reveal confidential employer questions, scoring thresholds, or hiring feedback.
3. AI feedback is preparation guidance, never a hiring disposition.
4. Candidate consent and ownership are required for any plan, practice artifact, or coach handoff.
5. Human coaches receive only candidate-selected preparation information.

## Related documents

- `docs/PRD-Candidate-Readiness-Coaching.md`
- `docs/FEATURES-Candidate-Readiness-Coaching.md`
- `docs/UAT-Candidate-Readiness-Coaching.md`
- `docs/PROMPT-FINISH-STUBS-PHASED.md`
