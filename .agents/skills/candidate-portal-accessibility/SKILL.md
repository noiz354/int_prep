---
name: candidate-portal-accessibility
description: Change candidate-facing setup, consent, accessibility, media-device, and waiting-room workflows safely and inclusively.
---

# Candidate portal and accessibility

Candidate-facing changes are high impact. Optimize for clarity, consent, accommodations, and recoverability.

1. Use plain-language, localized-ready copy; distinguish required policy choices from optional choices.
2. Request camera/microphone only after an explicit user action. Explain purpose before the browser prompt.
3. Stop media tracks and close AudioContext resources when the test ends or component unmounts.
4. Do not claim a device/network test proves interview success; present it as a readiness indicator with remediation.
5. Preserve keyboard/screen-reader paths, captions/transcript controls, high contrast, and reduced motion.
6. Store only non-sensitive recoverable state. Encrypt offline drafts with Web Crypto, expiry, and a clear purge path.
7. Consent changes must be time-stamped, tenant-scoped, audited, and evented by the server; never silently infer consent.
8. Test blocked permissions, offline state, failed sync, and successful retry.
