---
name: realtime-socketio
description: Safely extend SignalRoom Socket.IO presence and signaling without turning it into an insecure media or state channel.
---

# Realtime presence and signaling

1. Keep browser connections on relative `/socket.io` so Vite/proxy/deployment routing owns the host.
2. Authenticate every handshake with a verified session; authorize every room join against the interview resource.
3. Scope emits to a tenant/interview room. Never broadcast presence or candidate data globally.
4. Validate every client payload with a schema and use a small allowlist of action names.
5. Treat Socket.IO as presence/signaling only. Media needs an approved SFU/WebRTC provider; durable state belongs in the API/event pipeline.
6. Make reconnect/recovery visible but do not hide a failed authorization or consent issue.
7. On disconnect, remove room presence and emit the minimal new presence state.
8. Add a local Socket.IO handshake/room-join smoke test after changing the gateway.
