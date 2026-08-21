---
name: react-experience
description: Build or review SignalRoom React interactions, pages, and state while preserving accessible, responsive, high-performance UX.
---

# React experience

## Workflow

1. Inspect existing component, CSS token, and interaction patterns before adding a new one.
2. Use a function component, semantic native controls, visible labels, and accessible names.
3. Keep browser API calls behind `src/lib/` adapters; never use direct `localhost` URLs.
4. Model loading, empty, error, offline, permission-denied, and success states explicitly.
5. Preserve light/dark mode, mobile layout, keyboard access, focus states, and `prefers-reduced-motion`.
6. Avoid large UI packages. Split rarely used heavy areas if the bundle budget is threatened.
7. Add a focused Vitest/Testing Library test for nontrivial state logic and run the full suite/build.

## Definition of done

- No inaccessible click-only affordances.
- No color-only status signal.
- No unbounded localStorage use or sensitive data in browser storage.
- `npm test` and `npm run build` pass.
