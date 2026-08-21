---
name: testing-quality
description: Add targeted tests, diagnose regressions, and enforce SignalRoom quality gates across browser, API, realtime, and data contracts.
---

# Testing and quality

## Test selection

- Pure domain/security/event code: Node `node:test` contract tests.
- Browser utilities/components: Vitest + jsdom/Testing Library.
- API behavior: authenticated smoke test plus negative authorization case.
- Realtime changes: Socket.IO handshake, denied join, authorized join, and disconnect presence behavior.

## Completion gate

```bash
npm test
npm run build
npm audit --omit=dev --audit-level=high  # when packages changed
```

Do not suppress a failure or snapshot-update blindly. Reproduce, minimize, identify root cause, add a regression test, then fix.
