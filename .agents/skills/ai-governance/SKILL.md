---
name: ai-governance
description: Build or review SignalRoom AI transcription, copilot, scoring, integrity, or model-governance behavior with human-review safeguards.
---

# AI governance

1. Confirm explicit consent and tenant context before sending any material to AI processing.
2. Ground outputs in approved job/rubric/retrieval sources and expose evidence, source version, and confidence.
3. Treat output as assistive guidance. Never create an automated hire/no-hire decision.
4. Do not infer protected traits or present sentiment/integrity indicators as deterministic judgments.
5. Record model/prompt/rubric version and reviewer override in the audit path.
6. Keep provider credentials and raw media out of browser code and logs.
7. Define failure behavior: safe fallback, no fabricated result, and clear human-review messaging.
8. Add evaluation cases for grounding, privacy, harmful suggestion rejection, and low-confidence routing before provider rollout.
