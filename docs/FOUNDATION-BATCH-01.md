# Foundation Batch 01 — Ten Production-Ready Building Blocks

This batch turns the initial product vertical slice into a more trustworthy, testable platform foundation. It is deliberately scoped to local runnable adapters: live providers still require organization-owned accounts, keys, infrastructure, security review, and deployment configuration.

## Delivered features

1. **BE-01 — Multi-tenant organization hierarchy**
   - `GET /api/organization/current` returns a tenant-scoped organization tree, plan, and data region.
2. **SC-01 — Enterprise authentication federation seam**
   - `jose` signs and verifies short-lived local demo sessions. The boundary is explicit so an OIDC/SAML provider can replace the bootstrap endpoint.
3. **SC-02 — Fine-grained authorization**
   - Role permissions plus assignment-aware candidate access protect routes and Socket.IO room joins.
4. **SC-05 — Immutable audit trail**
   - A SHA-256 hash chain is maintained separately per tenant and is verifiable at `/api/audit/verify`.
5. **SC-07 — Consent and lawful-processing management**
   - Candidate processing choices are versioned, evented, and audit-logged through `/api/interviews/:id/consent`.
6. **FE-02 — Pre-interview device and network check**
   - The Candidate Portal uses user-triggered `getUserMedia`, an audio input meter, connection state, permission failure messaging, and cleanup of tracks.
7. **EO-04 — Candidate experience portal**
   - The new responsive Candidate Portal guides readiness, permissions, accommodations, and secure waiting-room entry.
8. **FE-15 — Secure offline-tolerant session state**
   - A Web Crypto AES-GCM utility encrypts only non-sensitive setup recovery data with a session-scoped key and 12-hour expiry.
9. **BE-06 — Realtime signaling and presence gateway**
   - Socket.IO establishes authenticated room presence and sends scoped, low-risk device-status actions; it is not a media/SFU replacement.
10. **DO-07 — OpenTelemetry-based observability**
    - The API initializes an OpenTelemetry SDK seam, named spans, request counters, and room-join counters.

## Internet-sourced dependencies and documentation

Only maintained package registries and official documentation were used for this batch:

- [`jose`](https://github.com/panva/jose/tree/main/docs) for JWT signing and verification.
- [Socket.IO server documentation](https://socket.io/docs/v4/server-initialization/) for server initialization and the realtime boundary.
- [OpenTelemetry JavaScript documentation](https://opentelemetry.io/docs/languages/js/) for backend tracing/metrics instrumentation.
- [Vitest documentation](https://vitest.dev/guide/) for browser-oriented utility tests.

Installed runtime packages: `jose`, `socket.io`, `socket.io-client`, `zod`, `@opentelemetry/api`, `@opentelemetry/sdk-node`, and `@opentelemetry/auto-instrumentations-node`.

Installed test packages: `vitest`, `jsdom`, `@testing-library/react`, and `@testing-library/user-event`.

`npm audit --omit=dev --audit-level=high` returned **0 production vulnerabilities** at implementation time.

## Verification

```bash
npm test        # contract, auth, authorization, audit, event, and browser draft tests
npm run build   # Vite production build
npm run api     # authenticated API + Socket.IO service
```

Test coverage includes JWT verification, candidate assignment authorization, per-tenant audit-chain verification, event idempotency, weighted scorecard behavior, and encrypted draft recovery/expiry.

## Production handoff requirements

Before enabling this batch for real candidates:

1. Replace demo identities and HMAC secrets with an enterprise OIDC/SAML provider, SCIM lifecycle, MFA, and key rotation.
2. Persist audit/consent/interview records in a protected database with encryption, retention, legal-hold, backup, and deletion controls.
3. Configure CORS, CSP, origin allowlists, rate limits, WAF, structured logs, and an OpenTelemetry exporter.
4. Add an approved SFU/media provider, media-recording policy, geographic routing, and browser compatibility test matrix.
5. Complete a privacy/legal review of each consent purpose and localized candidate notice.
6. Perform security, accessibility, load, and recovery testing against the actual deployment architecture.
