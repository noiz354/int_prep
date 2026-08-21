# SignalRoom repository instructions

- Read `AGENTS.md`, `progess.md`, `docs/ARCHITECTURE.md`, and the relevant PRD section before substantive changes.
- Use React function components and existing design tokens; preserve keyboard, focus, dark-mode, responsive, and reduced-motion behavior.
- Browser code must use relative `/api` and `/socket.io` paths only.
- API mutations require authentication, tenant scope, authorization, validation, idempotency, event publication where appropriate, and an audit record.
- Candidate consent, AI processing, integrity signals, recordings, and data retention are high-risk: do not weaken their safeguards or implement automated hiring decisions.
- Add focused tests. Before completion run `npm test`, `npm run build`, and `npm audit --omit=dev --audit-level=high` when dependencies change.
- Document every material feature change in `progess.md` and applicable files under `docs/`.
