// Generated from the PRD source files. Run: node scripts/generate-feature-data.mjs
export const featureCatalog = [
  {
    "id": "AI-01",
    "title": "Streaming multilingual transcription",
    "description": "Transcribe interview audio in near real time with word-level timestamps, speaker diarization, punctuation, custom vocabulary, and support for regional accents and mixed-language conversations.",
    "category": "AI Agent Features"
  },
  {
    "id": "AI-02",
    "title": "AI interviewer agent",
    "description": "Provide an optional virtual interviewer that follows an approved interview plan, asks role-relevant questions, waits for complete answers, and hands control back to a human interviewer when required.",
    "category": "AI Agent Features"
  },
  {
    "id": "AI-03",
    "title": "Adaptive follow-up engine",
    "description": "Detect unanswered rubric criteria, contradictions, vague claims, or incomplete technical explanations and recommend targeted follow-up questions without exceeding configured interview time limits.",
    "category": "AI Agent Features"
  },
  {
    "id": "AI-04",
    "title": "Job-description and rubric grounding",
    "description": "Generate questions, scorecards, and AI recommendations only from approved job descriptions, competency frameworks, company policies, and interviewer-provided materials through tenant-isolated retrieval.",
    "category": "AI Agent Features"
  },
  {
    "id": "AI-05",
    "title": "Resume and portfolio intelligence",
    "description": "Parse resumes, portfolios, certifications, and public work samples into a structured candidate profile; surface verifiable experience signals and suggested areas for validation during the interview.",
    "category": "AI Agent Features"
  },
  {
    "id": "AI-06",
    "title": "Explainable competency scoring",
    "description": "Produce per-competency scores linked to transcript excerpts, coding artifacts, rubric criteria, confidence levels, and a clear explanation of why each recommendation was made.",
    "category": "AI Agent Features"
  },
  {
    "id": "AI-07",
    "title": "Live interviewer copilot",
    "description": "Give human interviewers private, real-time prompts such as suggested questions, time-allocation alerts, uncovered competencies, candidate-specific context, and reminders to avoid leading questions.",
    "category": "AI Agent Features"
  },
  {
    "id": "AI-08",
    "title": "Communication and behavioral signal analysis",
    "description": "Analyze answer structure, clarity, concision, topic relevance, speaking balance, interruption patterns, and evidence of collaboration while excluding protected-trait inference from hiring recommendations.",
    "category": "AI Agent Features"
  },
  {
    "id": "AI-09",
    "title": "Sentiment and engagement trend detection",
    "description": "Detect conversational engagement, frustration, uncertainty, and abrupt sentiment shifts at an aggregate trend level, display confidence bounds, and require human review before any decision use.",
    "category": "AI Agent Features"
  },
  {
    "id": "AI-10",
    "title": "Automated coding evaluation",
    "description": "Evaluate coding exercises in isolated sandboxes using hidden tests, complexity analysis, static analysis, test coverage, runtime/memory limits, and language-specific quality rules.",
    "category": "AI Agent Features"
  },
  {
    "id": "AI-11",
    "title": "Technical answer verification",
    "description": "Compare factual technical claims against approved knowledge sources, flag likely inaccuracies or unsupported assertions, and propose neutral verification questions for the interviewer.",
    "category": "AI Agent Features"
  },
  {
    "id": "AI-12",
    "title": "Interview integrity anomaly detection",
    "description": "Combine consented signals such as unexpected voice changes, prolonged off-screen attention, screen-share inconsistencies, copy/paste bursts, and unusual response latency into reviewable—not automatic—integrity alerts.",
    "category": "AI Agent Features"
  },
  {
    "id": "AI-13",
    "title": "Inclusive-language and interviewer-bias coach",
    "description": "Detect potentially biased, discriminatory, overly leading, or non-inclusive interviewer language in real time and suggest compliant alternatives privately to the interviewer.",
    "category": "AI Agent Features"
  },
  {
    "id": "AI-14",
    "title": "AI-generated interview debrief",
    "description": "Create a structured post-interview debrief containing evidence-backed highlights, risks, unanswered rubric items, coding results, candidate questions, and a draft recommendation that authorized users can edit.",
    "category": "AI Agent Features"
  },
  {
    "id": "AI-15",
    "title": "Model governance and human-override workflow",
    "description": "Version prompts, models, rubrics, and retrieval sources; log AI inputs/outputs and overrides; collect reviewer feedback; and route low-confidence or high-impact recommendations to mandatory human review.",
    "category": "AI Agent Features"
  },
  {
    "id": "DE-01",
    "title": "Kafka interview event backbone",
    "description": "Publish versioned events for scheduling, session lifecycle, media quality, transcript updates, coding activity, AI outputs, recruiter actions, and consent changes through tenant-aware Kafka topics.",
    "category": "Data Engineering Features"
  },
  {
    "id": "DE-02",
    "title": "Schema registry and data contracts",
    "description": "Enforce Avro/Protobuf or equivalent schemas, compatibility rules, ownership, validation, and deprecation policies so producers and consumers can evolve safely.",
    "category": "Data Engineering Features"
  },
  {
    "id": "DE-03",
    "title": "Exactly-once/idempotent event processing",
    "description": "Use event IDs, idempotency keys, transactional writes where available, and deduplication controls to prevent duplicate scores, notifications, analytics, or candidate records.",
    "category": "Data Engineering Features"
  },
  {
    "id": "DE-04",
    "title": "Change data capture from operational systems",
    "description": "Stream approved changes from MongoDB and supporting transactional stores into Kafka for analytics, search indexing, audit trails, and downstream integrations without heavy polling.",
    "category": "Data Engineering Features"
  },
  {
    "id": "DE-05",
    "title": "Real-time interview telemetry processing",
    "description": "Process WebRTC quality metrics, device events, participant joins, reconnects, screen-sharing activity, and application interactions in windows to power live operational alerts.",
    "category": "Data Engineering Features"
  },
  {
    "id": "DE-06",
    "title": "Lakehouse ingestion zones",
    "description": "Land immutable raw events and artifacts in a governed data lake, then transform them through bronze, silver, and gold layers for reproducible analytics and AI workloads.",
    "category": "Data Engineering Features"
  },
  {
    "id": "DE-07",
    "title": "Secure media and artifact ingestion",
    "description": "Store recordings, code snapshots, transcripts, and attachments with encryption, content hashes, malware scanning, metadata extraction, retention tags, and access-controlled references rather than uncontrolled copies.",
    "category": "Data Engineering Features"
  },
  {
    "id": "DE-08",
    "title": "Orchestrated ETL/ELT pipelines",
    "description": "Run scheduled and event-triggered Python pipelines for transcript enrichment, score aggregation, tenant reporting, ATS synchronization, and historical backfills with retries and dependency management.",
    "category": "Data Engineering Features"
  },
  {
    "id": "DE-09",
    "title": "Data quality and reconciliation framework",
    "description": "Validate completeness, freshness, schema conformity, referential integrity, anomaly thresholds, and source-to-target counts; quarantine bad records and notify responsible data owners.",
    "category": "Data Engineering Features"
  },
  {
    "id": "DE-10",
    "title": "Dead-letter, replay, and backfill operations",
    "description": "Route invalid or failed messages to monitored dead-letter topics, support safe replay by offset or date range, and provide governed backfills without corrupting production aggregates.",
    "category": "Data Engineering Features"
  },
  {
    "id": "DE-11",
    "title": "Online/offline AI feature store",
    "description": "Maintain consistent, versioned candidate, interview, rubric, and behavioral features for low-latency inference and offline model training while preventing training-serving skew.",
    "category": "Data Engineering Features"
  },
  {
    "id": "DE-12",
    "title": "Data catalog, lineage, and observability",
    "description": "Catalog datasets, Kafka topics, transformations, dashboards, model features, owners, and lineage; expose pipeline health, freshness, volume drift, and cost observability.",
    "category": "Data Engineering Features"
  },
  {
    "id": "DE-13",
    "title": "Privacy, consent, and deletion orchestration",
    "description": "Propagate consent state across streams and storage, enforce purpose-based access, support retention schedules, legal holds, DSAR export, and verified deletion across derived datasets.",
    "category": "Data Engineering Features"
  },
  {
    "id": "DE-14",
    "title": "Backup, disaster recovery, and auditability",
    "description": "Create encrypted point-in-time backups, immutable audit exports, cross-region replication where required, documented recovery objectives, and regularly tested restoration runbooks.",
    "category": "Data Engineering Features"
  },
  {
    "id": "DE-15",
    "title": "Semantic analytics and workforce insights layer",
    "description": "Publish governed metrics and dimensional models for funnel conversion, interviewer calibration, time-to-hire, candidate experience, platform reliability, and fairness monitoring with tenant-safe access controls.",
    "category": "Data Engineering Features"
  },
  {
    "id": "FE-01",
    "title": "Resilient WebRTC interview room",
    "description": "Deliver low-latency audio/video through an SFU-compatible interface with adaptive bitrate, ICE restart, TURN fallback, reconnection recovery, and graceful audio-only degradation.",
    "category": "Frontend Features"
  },
  {
    "id": "FE-02",
    "title": "Pre-interview device and network check",
    "description": "Test camera, microphone, speaker, permissions, bandwidth, packet loss, jitter, firewall/TURN reachability, and browser compatibility before a candidate enters the live room.",
    "category": "Frontend Features"
  },
  {
    "id": "FE-03",
    "title": "Role-based lobby and admission controls",
    "description": "Provide secure waiting rooms, identity prompts, host admission, participant-role badges, late-join controls, interview start gates, and clear status messaging for candidates and panelists.",
    "category": "Frontend Features"
  },
  {
    "id": "FE-04",
    "title": "Responsive multi-participant video layout",
    "description": "Support active-speaker, gallery, pinned-speaker, and interviewer-focus views that remain usable across desktop, tablet, and constrained browser windows.",
    "category": "Frontend Features"
  },
  {
    "id": "FE-05",
    "title": "Live captions, transcripts, and translation UI",
    "description": "Show opt-in, speaker-labeled live captions with transcript search, correction markers, downloadable-access controls, language selection, and real-time translation where enabled.",
    "category": "Frontend Features"
  },
  {
    "id": "FE-06",
    "title": "Collaborative Monaco coding workspace",
    "description": "Offer a language-aware Monaco editor with presence indicators, synchronized cursors, shared file tree, autosave, lint feedback, hidden-test execution, and interviewer observation controls.",
    "category": "Frontend Features"
  },
  {
    "id": "FE-07",
    "title": "Screen sharing and collaborative whiteboard",
    "description": "Allow controlled screen/window/tab sharing and a real-time whiteboard with annotations, laser pointer, export options, consent prompts, and host-controlled stop/revoke actions.",
    "category": "Frontend Features"
  },
  {
    "id": "FE-08",
    "title": "Candidate task delivery workspace",
    "description": "Present timed prompts, attached resources, design exercises, coding instructions, upload areas, autosave status, and submission confirmation without exposing evaluator-only materials.",
    "category": "Frontend Features"
  },
  {
    "id": "FE-09",
    "title": "AI copilot experience for interviewers",
    "description": "Surface private AI suggestions, rubric coverage, transcript evidence, confidence indicators, integrity alerts, and one-click feedback controls without leaking any internal assessment to candidates.",
    "category": "Frontend Features"
  },
  {
    "id": "FE-10",
    "title": "Audio/video enhancement controls",
    "description": "Provide browser-supported background blur or replacement, noise suppression, echo cancellation status, camera framing options, device switching, and explicit notices when processing is active.",
    "category": "Frontend Features"
  },
  {
    "id": "FE-11",
    "title": "Connection-quality and recovery UX",
    "description": "Display understandable connection health indicators, recovery steps, reconnect countdowns, local recording/upload state, and a secure resume-session flow after refresh or network loss.",
    "category": "Frontend Features"
  },
  {
    "id": "FE-12",
    "title": "Accessibility-first interaction model",
    "description": "Meet WCAG 2.2 AA expectations with full keyboard navigation, visible focus, semantic controls, screen-reader announcements, high contrast, caption controls, reduced-motion settings, and no mouse-only actions.",
    "category": "Frontend Features"
  },
  {
    "id": "FE-13",
    "title": "Enterprise theming, localization, and time zones",
    "description": "Support tenant branding, light/dark/system themes, right-to-left readiness, localized dates and UI strings, multi-time-zone scheduling displays, and translated candidate-facing instructions.",
    "category": "Frontend Features"
  },
  {
    "id": "FE-14",
    "title": "Consent, privacy, and integrity transparency center",
    "description": "Clearly show recording/transcription/AI-processing notices, consent status, retention links, permitted-device rules, proctoring disclosures, and user-accessible privacy choices before and during sessions.",
    "category": "Frontend Features"
  },
  {
    "id": "FE-15",
    "title": "Secure offline-tolerant session state",
    "description": "Preserve encrypted local drafts, transcript display position, code edits, form answers, and reconnect tokens only as permitted; synchronize safely when connectivity returns and purge state on sign-out or expiration.",
    "category": "Frontend Features"
  },
  {
    "id": "BE-01",
    "title": "Multi-tenant organization hierarchy",
    "description": "Model enterprise accounts, subsidiaries, departments, hiring teams, projects, and workspaces with strict tenant boundaries, delegated administration, and scoped configuration inheritance.",
    "category": "Backend & Platform Services"
  },
  {
    "id": "BE-02",
    "title": "Interview lifecycle state machine",
    "description": "Orchestrate draft, scheduled, invited, checked-in, live, interrupted, completed, debrief, decision, archived, and deleted states with valid transitions, timestamps, and recovery rules.",
    "category": "Backend & Platform Services"
  },
  {
    "id": "BE-03",
    "title": "Availability and scheduling engine",
    "description": "Match interviewer availability, candidate time zones, required competencies, panel composition, interview duration, buffers, and SLA deadlines to suggest and reserve suitable interview slots.",
    "category": "Backend & Platform Services"
  },
  {
    "id": "BE-04",
    "title": "Calendar synchronization service",
    "description": "Provide two-way, conflict-aware integrations with enterprise calendars; process updates, cancellations, reschedules, time-zone changes, and conferencing links without duplicate bookings.",
    "category": "Backend & Platform Services"
  },
  {
    "id": "BE-05",
    "title": "Secure interview invitation service",
    "description": "Issue expiring, single-use or authenticated interview links with branded templates, RSVP tracking, reminder sequences, localization, and controlled guest access.",
    "category": "Backend & Platform Services"
  },
  {
    "id": "BE-06",
    "title": "Real-time signaling and presence gateway",
    "description": "Maintain authenticated WebSocket or equivalent channels for room signaling, participant presence, chat, collaboration state, moderation actions, and low-latency UI updates.",
    "category": "Backend & Platform Services"
  },
  {
    "id": "BE-07",
    "title": "Media-session orchestration",
    "description": "Provision video rooms, SFU resources, TURN credentials, recording policy, breakout behavior, participant permissions, and region-aware routing through a resilient backend control plane.",
    "category": "Backend & Platform Services"
  },
  {
    "id": "BE-08",
    "title": "Recording and artifact orchestration",
    "description": "Coordinate recording start/stop, segmented upload, transcript association, code snapshot capture, artifact hashes, processing status, and authorized playback metadata.",
    "category": "Backend & Platform Services"
  },
  {
    "id": "BE-09",
    "title": "Scorecard and rubric workflow service",
    "description": "Manage versioned scorecards, required competencies, weighted criteria, interviewer assignments, comment permissions, submission deadlines, lock rules, and post-submit amendment history.",
    "category": "Backend & Platform Services"
  },
  {
    "id": "BE-10",
    "title": "Asynchronous job orchestration",
    "description": "Run durable background jobs for media processing, transcription, notifications, AI analysis, integrations, report generation, and retries with priorities, status tracking, and failure escalation.",
    "category": "Backend & Platform Services"
  },
  {
    "id": "BE-11",
    "title": "Versioned API and webhook platform",
    "description": "Expose documented REST/GraphQL APIs and signed webhooks with API versioning, pagination, filtering, idempotency, sandbox environments, and developer-facing change notices.",
    "category": "Backend & Platform Services"
  },
  {
    "id": "BE-12",
    "title": "Unified search and retrieval service",
    "description": "Deliver permission-aware search across candidates, requisitions, interviews, transcripts, scorecards, notes, attachments, and operational records with filters and saved searches.",
    "category": "Backend & Platform Services"
  },
  {
    "id": "BE-13",
    "title": "Notification preference and escalation engine",
    "description": "Route email, in-app, SMS, chat, and webhook notifications based on role, locale, quiet hours, urgency, consent, delivery status, and configurable escalation paths.",
    "category": "Backend & Platform Services"
  },
  {
    "id": "BE-14",
    "title": "Configurable hiring workflow engine",
    "description": "Let authorized administrators configure stages, approval gates, reviewer assignments, SLAs, conditional routing, and automation rules without requiring custom code for each business unit.",
    "category": "Backend & Platform Services"
  },
  {
    "id": "SC-01",
    "title": "Enterprise authentication federation",
    "description": "Support SAML/OIDC single sign-on, SCIM provisioning, domain verification, just-in-time access, session policy controls, and graceful account deprovisioning.",
    "category": "Security, Privacy, Compliance & Trust"
  },
  {
    "id": "SC-02",
    "title": "Fine-grained authorization",
    "description": "Enforce role-based and attribute-based access rules across tenants, requisitions, interview rooms, recordings, transcripts, scorecards, AI outputs, exports, and administrative actions.",
    "category": "Security, Privacy, Compliance & Trust"
  },
  {
    "id": "SC-03",
    "title": "Strong authentication and step-up verification",
    "description": "Offer MFA, passkeys, device trust, suspicious-session detection, reauthentication for sensitive actions, and policy-based controls for privileged administrators.",
    "category": "Security, Privacy, Compliance & Trust"
  },
  {
    "id": "SC-04",
    "title": "Encryption and key management",
    "description": "Encrypt data in transit and at rest, use envelope encryption for sensitive artifacts, rotate keys, support customer-managed keys where required, and maintain key-access audit logs.",
    "category": "Security, Privacy, Compliance & Trust"
  },
  {
    "id": "SC-05",
    "title": "Immutable audit trail",
    "description": "Record tamper-evident events for access, sharing, exports, recording actions, score changes, AI recommendations, administrative changes, and security-policy decisions.",
    "category": "Security, Privacy, Compliance & Trust"
  },
  {
    "id": "SC-06",
    "title": "Data residency and transfer controls",
    "description": "Pin tenant data and media processing to approved regions, identify cross-border transfers, enforce regional routing policies, and provide residency reporting.",
    "category": "Security, Privacy, Compliance & Trust"
  },
  {
    "id": "SC-07",
    "title": "Consent and lawful-processing management",
    "description": "Capture granular consent for recording, transcription, AI processing, proctoring, and optional analytics; support withdrawal, jurisdiction-specific notices, and consent evidence.",
    "category": "Security, Privacy, Compliance & Trust"
  },
  {
    "id": "SC-08",
    "title": "PII discovery, classification, and redaction",
    "description": "Detect sensitive personal data in resumes, transcripts, recordings, chat, attachments, and logs; apply configurable masking/redaction before search, analytics, export, or model training.",
    "category": "Security, Privacy, Compliance & Trust"
  },
  {
    "id": "SC-09",
    "title": "Data loss prevention controls",
    "description": "Prevent unauthorized downloads, copy/paste, external sharing, screenshots where technically feasible, and unapproved exports through policy checks, watermarking, and escalation workflows.",
    "category": "Security, Privacy, Compliance & Trust"
  },
  {
    "id": "SC-10",
    "title": "Secure media access and forensic watermarking",
    "description": "Use short-lived playback tokens, signed URLs, viewer restrictions, forensic watermarks, download controls, and playback audit logs for interview recordings and sensitive artifacts.",
    "category": "Security, Privacy, Compliance & Trust"
  },
  {
    "id": "SC-11",
    "title": "Application and API threat protection",
    "description": "Implement WAF rules, bot defense, rate limits, abuse detection, CSRF/CORS controls, input validation, secure headers, API anomaly monitoring, and automated blocking policies.",
    "category": "Security, Privacy, Compliance & Trust"
  },
  {
    "id": "SC-12",
    "title": "Secrets and credential governance",
    "description": "Centralize service secrets, API keys, certificates, and TURN credentials in a managed vault with rotation, least-privilege access, expiration alerts, and secret-scanning safeguards.",
    "category": "Security, Privacy, Compliance & Trust"
  },
  {
    "id": "SC-13",
    "title": "Compliance evidence center",
    "description": "Map controls and evidence to SOC 2, ISO 27001, GDPR, local privacy requirements, and customer questionnaires; assign owners and track control-testing status.",
    "category": "Security, Privacy, Compliance & Trust"
  },
  {
    "id": "SC-14",
    "title": "Fairness, AI risk, and appeal governance",
    "description": "Monitor AI-assisted hiring outputs for performance disparities and drift, document intended use and limitations, support candidate/reviewer appeals, and retain decision-review evidence.",
    "category": "Security, Privacy, Compliance & Trust"
  },
  {
    "id": "DO-01",
    "title": "Infrastructure as code and environment parity",
    "description": "Define cloud infrastructure, networking, IAM, data stores, Kafka, media services, and monitoring through reviewed infrastructure-as-code with reproducible dev, staging, and production environments.",
    "category": "DevOps, Reliability & Observability"
  },
  {
    "id": "DO-02",
    "title": "Container orchestration and elastic scaling",
    "description": "Deploy stateless services in orchestrated containers with horizontal autoscaling, resource quotas, pod disruption controls, and workload isolation for API, AI, stream-processing, and worker services.",
    "category": "DevOps, Reliability & Observability"
  },
  {
    "id": "DO-03",
    "title": "Global media edge and failover routing",
    "description": "Route WebRTC traffic to healthy regional SFU/TURN capacity based on latency, residency, capacity, and outage conditions, with tested regional failover behavior.",
    "category": "DevOps, Reliability & Observability"
  },
  {
    "id": "DO-04",
    "title": "Continuous integration and delivery",
    "description": "Automate linting, unit tests, API-contract tests, security checks, build provenance, artifact signing, environment promotion, approvals, rollback, and release notes.",
    "category": "DevOps, Reliability & Observability"
  },
  {
    "id": "DO-05",
    "title": "Progressive delivery and feature flags",
    "description": "Use tenant- and role-scoped feature flags, canary releases, blue/green deployment, experimentation controls, kill switches, and automatic rollback based on service health.",
    "category": "DevOps, Reliability & Observability"
  },
  {
    "id": "DO-06",
    "title": "End-to-end quality automation",
    "description": "Run browser, mobile-responsive, WebRTC interoperability, accessibility, API, load, chaos, and integration tests against representative multi-participant interview scenarios.",
    "category": "DevOps, Reliability & Observability"
  },
  {
    "id": "DO-07",
    "title": "OpenTelemetry-based observability",
    "description": "Correlate logs, metrics, traces, browser telemetry, Kafka lag, job health, database performance, and media-session diagnostics through consistent tenant-safe trace context.",
    "category": "DevOps, Reliability & Observability"
  },
  {
    "id": "DO-08",
    "title": "SLOs, error budgets, and alerting",
    "description": "Define measurable availability, latency, join-success, recording-completion, transcript-freshness, and integration-delivery objectives with actionable, deduplicated alerts and owner escalation.",
    "category": "DevOps, Reliability & Observability"
  },
  {
    "id": "DO-09",
    "title": "Synthetic monitoring and real-user monitoring",
    "description": "Continuously test critical flows such as login, scheduling, room join, audio/video connectivity, recording, score submission, and integrations from multiple regions and browsers.",
    "category": "DevOps, Reliability & Observability"
  },
  {
    "id": "DO-10",
    "title": "Capacity forecasting and cost intelligence",
    "description": "Forecast demand for interviews, concurrent media rooms, GPU/AI workloads, storage, and Kafka throughput; attribute cost by tenant and alert on unexpected consumption.",
    "category": "DevOps, Reliability & Observability"
  },
  {
    "id": "DO-11",
    "title": "Disaster recovery and resilience exercises",
    "description": "Maintain recovery playbooks and routinely perform backup restores, regional-failover drills, Kafka replay exercises, media-service failure simulations, and post-exercise remediation tracking.",
    "category": "DevOps, Reliability & Observability"
  },
  {
    "id": "DO-12",
    "title": "Secure software supply chain",
    "description": "Generate SBOMs, scan dependencies and containers, verify artifact provenance, enforce signed builds, monitor vulnerabilities, and manage timely patching and exception approvals.",
    "category": "DevOps, Reliability & Observability"
  },
  {
    "id": "DO-13",
    "title": "Model and pipeline deployment operations",
    "description": "Deploy Python models, prompts, retrieval indexes, feature definitions, and data pipelines through versioned registries with staged validation, rollback, drift monitoring, and operational ownership.",
    "category": "DevOps, Reliability & Observability"
  },
  {
    "id": "DO-14",
    "title": "Incident command and customer communication",
    "description": "Provide severity classification, on-call routing, incident timelines, stakeholder communication templates, public/private status updates, postmortems, and corrective-action tracking.",
    "category": "DevOps, Reliability & Observability"
  },
  {
    "id": "EO-01",
    "title": "Requisition and interview-plan workspace",
    "description": "Create requisitions with hiring criteria, interview loops, role-specific rubrics, target levels, mandatory evidence, question banks, panel assignments, and approval status.",
    "category": "Enterprise Operations, Hiring Workflow & Integrations"
  },
  {
    "id": "EO-02",
    "title": "Interviewer capability and certification directory",
    "description": "Maintain interviewer skills, language proficiency, certifications, calibration status, capacity, conflict restrictions, and completed-training requirements for intelligent panel selection.",
    "category": "Enterprise Operations, Hiring Workflow & Integrations"
  },
  {
    "id": "EO-03",
    "title": "Structured debrief and hiring-committee workflow",
    "description": "Collect independent scorecards before group discussion, reveal feedback according to policy, support calibration meetings, capture final decisions, and maintain dissenting opinions and evidence.",
    "category": "Enterprise Operations, Hiring Workflow & Integrations"
  },
  {
    "id": "EO-04",
    "title": "Candidate experience portal",
    "description": "Give candidates a secure portal for invitations, scheduling/rescheduling, preparation guidance, accommodations, device checks, interview links, document upload, and status communications.",
    "category": "Enterprise Operations, Hiring Workflow & Integrations"
  },
  {
    "id": "EO-05",
    "title": "Applicant tracking system connectors",
    "description": "Synchronize candidate, requisition, interview, scorecard, disposition, and hiring-decision data with major ATS platforms using field mapping, retries, reconciliation, and audit logs.",
    "category": "Enterprise Operations, Hiring Workflow & Integrations"
  },
  {
    "id": "EO-06",
    "title": "HRIS, directory, and identity integrations",
    "description": "Connect to HRIS and corporate-directory systems for interviewer profiles, organizational structure, leave calendars, employment status, and automated lifecycle management.",
    "category": "Enterprise Operations, Hiring Workflow & Integrations"
  },
  {
    "id": "EO-07",
    "title": "Communications ecosystem integrations",
    "description": "Integrate with Microsoft Teams, Slack, email, SMS, and enterprise notification systems for reminders, interview updates, escalation, and secure deep links.",
    "category": "Enterprise Operations, Hiring Workflow & Integrations"
  },
  {
    "id": "EO-08",
    "title": "Integration marketplace and workflow automation",
    "description": "Offer managed connectors, OAuth setup, API credentials, webhook subscriptions, no-code triggers/actions, sandbox testing, usage logs, and tenant-level integration approvals.",
    "category": "Enterprise Operations, Hiring Workflow & Integrations"
  },
  {
    "id": "EO-09",
    "title": "Executive analytics and custom report builder",
    "description": "Provide governed dashboards and self-service reports for recruiting funnel health, interviewer performance, candidate experience, scheduling efficiency, diversity/fairness monitoring, and platform usage.",
    "category": "Enterprise Operations, Hiring Workflow & Integrations"
  },
  {
    "id": "EO-10",
    "title": "Tenant administration command center",
    "description": "Centralize user management, roles, domains, brand settings, consent policies, data residency, integrations, templates, feature entitlements, audit search, and support diagnostics.",
    "category": "Enterprise Operations, Hiring Workflow & Integrations"
  },
  {
    "id": "EO-11",
    "title": "White-label and regional deployment controls",
    "description": "Enable customer-specific branding, domains, email templates, languages, legal text, feature policies, and regional configurations without compromising platform upgrades.",
    "category": "Enterprise Operations, Hiring Workflow & Integrations"
  },
  {
    "id": "EO-12",
    "title": "Usage metering, quotas, and billing operations",
    "description": "Measure seats, interview minutes, recording/storage, AI usage, integrations, and premium assessments; enforce quotas and expose billing-ready usage reports and anomaly alerts.",
    "category": "Enterprise Operations, Hiring Workflow & Integrations"
  },
  {
    "id": "EO-13",
    "title": "Customer support, export, and migration toolkit",
    "description": "Provide privacy-safe support impersonation, diagnostic bundles, bulk import/export, tenant migration tooling, archival packages, and controlled handoff workflows for enterprise onboarding or offboarding.",
    "category": "Enterprise Operations, Hiring Workflow & Integrations"
  }
];

export const featureCategories = [
  "AI Agent Features",
  "Data Engineering Features",
  "Frontend Features",
  "Backend & Platform Services",
  "Security, Privacy, Compliance & Trust",
  "DevOps, Reliability & Observability",
  "Enterprise Operations, Hiring Workflow & Integrations"
];
