---
name: performance-bundle
description: Improve SignalRoom runtime performance, bundle size, loading behavior, and perceived responsiveness using measured changes.
---

# Performance and bundle discipline

1. Measure `npm run build` output before and after changes; note meaningful gzipped deltas in `progess.md`.
2. Prefer platform APIs and existing components over new dependencies.
3. Lazy-load uncommon/admin-heavy areas once routing supports it; keep the interview entry path responsive.
4. Avoid unnecessary rerenders, global state churn, blocking device work, and auto-playing media.
5. Keep critical UI resilient under slow CPU/network and show useful progress/retry states.
6. Treat client telemetry as privacy-sensitive and sample it conservatively.
7. Preserve accessibility while optimizing; reduced DOM or animations must not remove useful information.
