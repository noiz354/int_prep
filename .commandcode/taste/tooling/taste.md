# Taste

## Environment & reproducibility
- The SignalRoom workspace has `NODE_ENV=production` exported in the environment, which makes `npm install`/`npm ci` skip devDependencies (vitest, jsdom, etc.); clean installs must override with `NODE_ENV=development` to get a full, testable dependency tree. Confidence: 0.9
- Prefers clean, reproducible dependency installs from the lockfile (`rm -rf node_modules && npm ci`) over incremental fixes when the installed tree is out of sync with `package-lock.json`. Confidence: 0.8
- Prefers running tools via local project binaries (`./node_modules/.bin/...`) rather than whatever `npm`/global PATH resolves, to avoid global installs shadowing project-local tooling. Confidence: 0.7
- The SignalRoom dev environment is WSL2: the Windows host is reachable from WSL via the gateway IP (`ip route show default`), and natively-hosted Windows services (e.g., Ollama) must bind `0.0.0.0` (`OLLAMA_HOST=0.0.0.0`) and be addressed via the host gateway IP to be reachable from WSL — localhost/127.0.0.1 forwarding does not reliably work. Confidence: 0.9

## Local development infrastructure
- Prefers unique, collision-free port assignments for project services — avoiding common defaults (5173, 4173, 8000) and checking against sibling projects and currently listening ports in the shared workspace. Confidence: 0.8
- Prefers lightweight, Dockerized local stand-ins for production-backlog provider categories (identity, data, media, AI/RAG, integrations, delivery) so each boundary is runnable and testable locally — choosing low-footprint tooling over heavy production-grade stacks. Confidence: 0.7
- Prefers reusing already-running host-native services (e.g., an Ollama instance on the Windows host) over spinning up redundant Docker containers, and updates config/docs to point at the live service with the actual discovered models/URL rather than keeping a container placeholder. Confidence: 0.8

## Documentation workflow
- Prefers verifying documentation claims against the actual source code (grepping for the referenced functions/symbols/endpoints) before writing or updating docs, and correcting any inaccuracies found rather than relying on memory or README assertions. Confidence: 0.8
- When adding a new documentation file, also updates entry points (e.g., README "See also" links) so the doc is discoverable — including cross-linking the new doc from every related existing doc (e.g., linking a new HONEST-LIMITATIONS.md from the decision brief, unblocking checklist, and threat model). Confidence: 0.8

## Agent skills & standards
- Prefers adopting established external standards — specifically the Addy Osmani agent-skills format (SKILL.md with YAML `name` + `description` frontmatter, lowercase-hyphen slug dirs, discovery links) — over copying validation scripts or conventions from sibling projects. Confidence: 0.9
- Prefers sourcing the project's agent-skill pack from the Addy Osmani `agent-skills` repo, installing all skills relevant to the project (the full lifecycle pack, not a hand-picked subset or custom-written skills) into `.agents/skills/` with shared `references/` checklists, discovery symlinks, and AGENTS.md routing. Confidence: 0.8
- Prefers activating the most relevant agent skills before each phase of work — searching for them first (project-local skills via AGENTS.md routing plus relevant Addy Osmani pack skills such as `test-driven-development` and `incremental-implementation`) and then letting the activated skill structure the work (contract/boundary first, todos, preserving local memory adapters). When approving a new phase, the user explicitly directs activating **all** needed skills for that phase, not a hand-picked subset ("lanjut dengan semua skills yang dibutuhkan"). Confidence: 0.9

## Fixing tests
- Prefers minimal, root-cause test fixes — e.g., removing an unnecessary `node:crypto` import and global override when `globalThis.crypto.subtle` is already available in the test environment — over adding shims or workarounds. Confidence: 0.7

## Backend & security practices
- Treats tenant isolation as a hard security boundary: every tenant-scoped route must validate the request tenant (mismatch → 403, unauthenticated → 401), and this is verified with end-to-end API smoke tests — not just unit tests — before a phase is closed out. Confidence: 0.7
- Closes out each phase with an end-to-end API smoke test of every new route surface (demo-login → hit each new route with an `Idempotency-Key` → assert expected status codes, including negative/blocked cases like 409 for missing consent) before the final build/audit/skills validation — in addition to the contract tests. Confidence: 0.7
- Prefers contract-first event publishing: new event types must be registered in the gateway's `allowedEventTypes` and emitted via the `createEvent` factory (never raw objects), so events cannot bypass contract validation. Confidence: 0.8
- Prefers reading the actual existing source (services, authorization, tests, docs) before implementing, and builds new modules following established patterns and boundaries (e.g., the `create*Services` factory style with adapter seams) rather than introducing divergent structures. Confidence: 0.8
- Extends the RBAC permission matrix with explicit per-area permissions for each new feature surface (e.g., `schedule:*`, `calendar:sync`, `invitation:*`, `search:read`, `notification:*`) instead of reusing coarse permissive roles. Confidence: 0.6
