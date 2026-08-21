# Implementation Plan — Candidate Career Vault & RAG Planner (SignalRoom Compass Vault)

## Overview

Build the candidate-owned Career Vault & RAG Planner as a new bounded context: a structured,
time-ordered **Candidate Career Timeline** (system of record) plus an artifact **Vault** and a
**RAG Career Coach** that retrieves only candidate-authorized, dated evidence and returns cited
answers/plans, or abstains. Candidate-private by default; granular sharing only via explicit consent.

Source of truth: `21-8-26-tasks/second_task/PRD-Candidate-Career-Vault-RAG.md` (45 requirements,
sections A–F) and `UAT-Candidate-Career-Vault-RAG.md` (CV-01…CV-20).

## Capability map

| Module id | Responsibility | Depends on |
|---|---|---|
| cv-domain | Entities, policy guards, in-memory timeline/vault service (opportunities, notes, feedback, artifacts, consent, retention, exclusion, export/delete, audit, action inbox, lockout) | — |
| cv-rag | Deterministic RAG scaffold: tenant/candidate-scoped retrieval over timeline+artifacts, hybrid filters, citations, abstention, feedback-theme clustering, 7-day plan, lockout, human escalation | cv-domain (data contract) |
| cv-api | Express service: timeline/vault/rag routes, header identity seam, idempotency, audit, permission checks | cv-domain |
| cv-web | Standalone Vite/React UX: Timeline, Vault, Career Coach (RAG), Trust/consent | cv-api (demo seam) |
| cv-docs | PRD/UAT port + API/ARCHITECTURE/STATUS integration | — |

Build order: cv-domain → cv-rag → cv-api → cv-web → cv-docs → root wiring.

## Architecture decisions

- **Reuse established repo patterns.** Same seams as `candidate-readiness`: `packages/*-domain`,
  `services/*-api` (Express, header identity), `services/*-rag|ai` (Python deterministic), standalone
  Vite web app. No new third-party dependencies.
- **RAG is the reasoning layer, not the system of record.** Timeline DB (in-memory now) is the
  system of record; RAG retrieves from it with mandatory citations or abstention (PRD §2, §8).
- **Candidate-private by default.** Every retrieval and artifact boundary defaults to private;
  sharing is explicit, granular, audited. Cross-tenant/cross-candidate access is denied (UAT CV-16).
- **Real-assessment lockout.** `session_context` must be `preparation`/`career_planning`;
  `live_assessment` is rejected in API and RAG (UAT CV-17, PRD F-39).
- **Provider seams labeled honestly.** Email/calendar OAuth connectors (PRD C-16…C-22) and vector
  embeddings (PRD D-23…D-30) remain `blocked-on-provider-decision` adapter seams; the RAG scaffold
  runs on candidate-owned corpus locally with citation/abstention rules fully tested.
- **Truthful status.** Docs classify each capability as mocked / local_only / provider_ready /
  staging_verified / production_deployed / blocked_on_decision.

## Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Connectors (email/calendar) need provider decision | High | Build tested adapter seam + review-before-save contract; no production claim |
| Real vector index needs provider | Medium | Deterministic hybrid retrieval over in-memory metadata now; vector seam labeled |
| Sensitive artifacts (recordings/transcripts) | High | Consent/retention metadata, encrypted-storage seam, no raw content in logs |
| Scope creep (5 phases) | High | Ship Phase 1–2 (Timeline+Vault) + Phase 4 RAG scaffold; connectors (3) and sharing (5) as seams |
| RAG hallucination/grounding | High | Mandatory citations, abstention on insufficient evidence, human escalation, eval cases |

## Open questions

- Connector providers (Gmail/MS OAuth) require app credentials → seam only until decision.
- Vector embedding provider (Qdrant/Pinecone) → seam until decision.
- Encrypted object storage provider → seam until decision.
