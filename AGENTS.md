# SignalRoom — Agent Operating Guide

## Mission
Build a trustworthy enterprise video-interview platform. Prioritize candidate dignity, human decision-making, privacy, security, accessibility, and reliable evidence over feature count.

## Read first

1. `README.md` for setup and service commands.
2. `progess.md` for delivery status and next work.
3. `docs/ARCHITECTURE.md` and `docs/API.md` before changing a service boundary.
4. `docs/PRD-100-Features.md` before adding or reprioritizing product capabilities.

## Commands

```bash
npm install
npm run dev                         # React/Vite experience
npm run api                         # Express + JWT demo + Socket.IO
VITE_USE_API=true npm run dev       # Browser uses relative API/realtime proxy
npm test                            # Contract and browser utility tests
npm run build                       # Production build
npm audit --omit=dev --audit-level=high
npm run generate:features           # Regenerate catalog after PRD changes
npm run skills:check                # Validate local coding-agent skills
```

## Architecture boundaries

- `src/`: React UX and browser-safe adapters. Never hard-code `localhost` in browser requests.
- `apps/api/`: Express control plane. Enforce authentication, tenant context, permission, idempotency, validation, and audit behavior at server boundaries.
- `services/ai/`: Python assistive AI adapter. It must remain consent-aware, evidence-linked, and human-reviewed.
- `services/event-gateway/`: Versioned event contract and Kafka-compatible abstraction.
- `docs/`: PRD, service contracts, architecture, rollout status, and agent guidance.

## Non-negotiables

- Do not make automated hiring dispositions or infer protected traits.
- Do not persist access tokens, media, transcripts, passwords, or secrets in browser storage.
- Do not bypass consent, tenant isolation, authorization, or audit logs for convenience.
- Use user-triggered media permission requests and stop tracks after device preflight.
- Use relative browser API/realtime paths; Vite handles the local proxy.
- Validate every changed behavior with targeted tests, then run `npm test` and `npm run build` before declaring work complete.
- Never add a dependency, remote skill, or MCP server without checking source, license, maintenance, and `npm audit` impact.
- Update `progess.md`, relevant API/architecture docs, and the Feature Catalog implementation label when a PRD feature materially changes.

## Skill routing

On-demand skills live in `.agents/skills/` and are linked for `.claude/skills/` and `.github/skills/` discovery. The pack combines SignalRoom-specific skills with the production-grade workflow skills from [addyosmani/agent-skills](https://github.com/addyosmani/agent-skills) (MIT). Shared checklists live in `references/`. Choose the narrowest relevant skill before editing:

| Need | Skill |
|---|---|
| Orient / plan a task | `project-orientation`, `planning-and-task-breakdown` |
| Clarify requirements first | `interview-me`, `idea-refine`, `spec-driven-development` |
| React UI or interaction | `react-experience`, `frontend-ui-engineering` |
| Candidate setup, consent, a11y | `candidate-portal-accessibility`, `accessibility` |
| API, JWT, tenant, RBAC, audit | `api-auth-security`, `api-and-interface-design` |
| Socket.IO presence/signaling | `realtime-socketio` |
| AI prompts/models/RAG | `ai-governance` |
| Kafka/events/lakehouse | `event-data-engineering` |
| Implement incrementally | `incremental-implementation`, `context-engineering`, `source-driven-development`, `doubt-driven-development` |
| Tests/regression triage | `testing-quality`, `test-driven-development`, `browser-testing-with-devtools`, `debugging-and-error-recovery` |
| Review before merge | `code-review-and-quality`, `code-simplification`, `security-and-hardening`, `performance-optimization` |
| Git/CI/CD/shipping | `git-workflow-and-versioning`, `ci-cd-and-automation`, `shipping-and-launch`, `deprecation-and-migration` |
| OTel/SLO/reliability | `observability-sre`, `observability-and-instrumentation` |
| Bundle/Web Vitals/perf | `performance-bundle` |
| Status/PRD/API docs | `documentation-progress`, `documentation-and-adrs` |
| Package/tool/skill installation | `dependency-security` |
| Meta: how to apply the pack | `using-agent-skills` |
