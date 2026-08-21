# Candidate Readiness & Coaching — Local MVP Implementation Status

> **Scope:** Separate bounded context under `candidate-readiness/`, `apps/candidate-readiness-web/`, `services/candidate-readiness-api/`, `services/candidate-coaching-ai/`, and `packages/candidate-readiness-domain/`.

## Local MVP now implemented

| Area | Local functionality |
|---|---|
| Candidate profile | Candidate preferences, skills, languages, time zone, and accessibility-ready profile schema |
| Authorized JD intake | Source approval, competencies, stack, source reference, and preparation-only policy |
| Role Intelligence Pack | Skill matrix, stack map, candidate evidence map, public/authorized material catalog, assessment modes, communication blueprint |
| Readiness plan | Coaching mode, milestones, time budget, device checklist, candidate action inbox |
| Evidence library | Candidate-owned STAR/CAR-style story records |
| Practice Lab | Technical, behavioral, system-design, portfolio, and coding-practice session types; local feedback and real-assessment lockout |
| Readiness threshold | Transparent readiness dimensions; no job/acceptance guarantee |
| Coach network | Verified coach schema, transparent matching, booking request, candidate-controlled handoff |
| Opportunity tracking | Source/provenance, saved opportunities, application review request, duplicate prevention, review-before-send campaign policy |
| Trust controls | AI/recording/transcript/human/email/Instagram preferences, export endpoint, audit records, preparation-only enforcement |
| Separate web experience | Responsive role intelligence, practice, coach, opportunity, and trust screens |

## Explicitly not production complete

| Area | Required before production claim |
|---|---|
| Identity | OIDC/SAML, verified session claims, MFA, tenant membership, durable audit |
| Persistence | Database, migrations, encryption, retention, export/delete propagation, backups |
| AI | Approved tenant-isolated model/RAG/ASR, grounded source retrieval, evaluation/red-team, human review queue |
| Materials research | Source connectors, licensing/provenance registry, content approval, no scraping of prohibited sources |
| Human coaches | Real verification, availability, conflict checks, booking/calendar, notes, rematch, safety escalation |
| Opportunity sources | Official ATS/career-site APIs, email/partner connectors, source freshness, candidate consent |
| Auto-apply | Official partner APIs only, candidate approval, document preview, rate cap, receipt, pause/kill switch, no CAPTCHA/ToS bypass |
| Communications | Consent-aware email/in-app/calendar; Instagram Business only within policy/opt-in constraints |
| Practice room | Separate media provider, isolated coding sandbox, storage, transcript/recording consent, observability |
| UAT | Execute P0 scenarios from `docs/UAT-Candidate-Readiness-Coaching.md` in staging with real providers |

## Verification evidence

- Candidate Readiness domain tests cover source approval, live-assessment denial, verified coach sharing, role intelligence, practice feedback, and application campaign safety.
- Candidate Readiness web build passes.
- Candidate Readiness API smoke tests cover role intelligence, preparation-only practice lockout, and dashboard generation.
- No production provider or job acceptance outcome is claimed.
