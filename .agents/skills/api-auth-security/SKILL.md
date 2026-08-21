---
name: api-auth-security
description: Implement or review Express control-plane endpoints involving authentication, multi-tenancy, RBAC/ABAC, consent, audit, or data access.
---

# API auth and security

## Required route checklist

1. Validate request body/params with a schema (`zod` or equivalent).
2. Authenticate the request; never trust tenant or role claims from an unauthenticated body/header.
3. Resolve tenant from the signed principal and reject mismatches.
4. Enforce a narrow permission plus resource/assignment policy where applicable.
5. Require an idempotency key for mutations with externally observable side effects.
6. Persist safely through the repository boundary; do not bypass it.
7. Publish only contract-valid events and append an audit entry for sensitive or material actions.
8. Return non-sensitive errors and set appropriate security headers.
9. Wrap material operations in a named telemetry span/counter.
10. Add positive and negative authorization tests.

## Prohibited shortcuts

- No development JWT secret, demo identity, or permissive CORS in production.
- No access token, recording URL, transcript, or raw PII in logs, audit metadata, or errors.
- No client-only authorization decision.
