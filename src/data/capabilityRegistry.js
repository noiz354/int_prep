/**
 * Canonical capability status for SignalRoom, Ready, and Compass Vault.
 * Consumed by Feature Catalog, Control Center, Enterprise Scale,
 * candidate-readiness-web, career-vault-web, tests, and docs.
 *
 * A UI, route, or adapter is not production. See docs/MOCK-STUB-AUDIT.md.
 */

export const IMPLEMENTATION_STATES = Object.freeze({
  mocked: {
    id: 'mocked',
    label: 'Mocked UI',
    tone: 'coral',
    meaning: 'Screen shows seeded or simulated state. A person cannot complete the job with their own data.',
  },
  local_only: {
    id: 'local_only',
    label: 'Local only',
    tone: 'amber',
    meaning: 'Contract, policy, or browser behavior works in-process. State is in-memory or demo identity. Lost on restart unless noted.',
  },
  provider_wired: {
    id: 'provider_wired',
    label: 'Provider wired',
    tone: 'sky',
    meaning: 'Default path talks to a running local or managed provider (not a stub response).',
  },
  staging_verified: {
    id: 'staging_verified',
    label: 'Staging verified',
    tone: 'mint',
    meaning: 'UAT P0 passed against the wired provider in a staging environment.',
  },
  production_deployed: {
    id: 'production_deployed',
    label: 'Production deployed',
    tone: 'green',
    meaning: 'Live for real users with identity, persistence, ops, and legal gates. Not currently claimed.',
  },
  blocked_on_decision: {
    id: 'blocked_on_decision',
    label: 'Blocked on decision',
    tone: 'indigo',
    meaning: 'Cannot be user-usable until an organization chooses a provider (self-hosted or managed) and supplies credentials or ops ownership.',
  },
});

export const PRODUCTS = Object.freeze({
  interview: 'SignalRoom interview platform',
  readiness: 'SignalRoom Ready',
  vault: 'Compass Vault',
});

export const STATE_ORDER = [
  'mocked',
  'local_only',
  'provider_wired',
  'staging_verified',
  'production_deployed',
  'blocked_on_decision',
];

function entry(id, product, state, nextPhase, auditIds, userCan, extras = {}) {
  return {
    id,
    product,
    state,
    nextPhase,
    auditIds,
    userCan,
    productionGate: extras.productionGate ?? 'blocked_on_decision',
    note: extras.note ?? '',
  };
}

const I = (id, state, nextPhase, auditIds, userCan, extras) =>
  entry(id, 'interview', state, nextPhase, auditIds, userCan, extras);
const R = (id, state, nextPhase, auditIds, userCan, extras) =>
  entry(id, 'readiness', state, nextPhase, auditIds, userCan, extras);
const V = (id, state, nextPhase, auditIds, userCan, extras) =>
  entry(id, 'vault', state, nextPhase, auditIds, userCan, extras);

/** @type {Array<ReturnType<typeof entry>>} */
export const capabilities = [
  // —— AI (15) — tested consent-aware adapters, deterministic / no model call ——
  I('AI-01', 'local_only', 'U4', ['AI-M-01', 'AI-M-05'], 'Operator can hit the transcript contract; no live ASR stream.'),
  I('AI-02', 'local_only', 'U4', ['AI-M-04'], 'Operator can generate a rubric-grounded interviewer plan; no live virtual interviewer.'),
  I('AI-03', 'local_only', 'U5', ['AI-M-03'], 'Interviewer can ask a consent-gated follow-up. Ollama is used when reachable; otherwise a labelled heuristic.'),
  I('AI-04', 'local_only', 'U5', ['AI-M-03'], 'Follow-ups cite the approved rubric list. Qdrant is probed and labelled; keyword retrieval if down.'),
  I('AI-05', 'local_only', 'U4', ['AI-M-04'], 'Resume parse returns a PII-minimized local profile, not a model extraction.'),
  I('AI-06', 'local_only', 'U4', ['AI-M-03'], 'Explainable score payload exists; evidence quotes are not live transcript-backed.'),
  I('AI-07', 'local_only', 'U5', ['AI-M-05', 'FE-M-08'], 'Live Studio copilot asks the gateway after consent and shows provider/model or abstains.'),
  I('AI-08', 'local_only', 'U4', ['AI-M-04'], 'Behavior signals are advisory local records; no trait inference.'),
  I('AI-09', 'local_only', 'U4', ['AI-M-04'], 'Engagement trends are aggregate local records with confidence bounds.'),
  I('AI-10', 'local_only', 'U4', ['AI-M-03', 'RT-M-04'], 'Code evaluation is heuristic; no isolated sandbox execution.'),
  I('AI-11', 'local_only', 'U4', ['AI-M-04'], 'Claim verification returns suggested questions against a local source list.'),
  I('AI-12', 'local_only', 'U4', ['AI-M-04'], 'Integrity alerts are reviewable local signals; never auto-disposition.'),
  I('AI-13', 'local_only', 'U4', ['AI-M-04'], 'Inclusive-language coach returns private interviewer notes from a local adapter.'),
  I('AI-14', 'local_only', 'U4', ['AI-M-03'], 'Debrief draft is editable local JSON; human approval required.'),
  I('AI-15', 'local_only', 'U4', ['AI-M-03'], 'Governance snapshot and eval suite run locally; no production model registry.'),

  // —— Data engineering (15) ——
  I('DE-01', 'local_only', 'U7', ['DE-M-01'], 'Events always land in the memory log. KafkaProducerAdapter produces when Redpanda answers ApiVersions.'),
  I('DE-02', 'local_only', 'U7', ['DE-M-02'], 'JSON contracts register with Redpanda Schema Registry when it is up; otherwise a process-local map.'),
  I('DE-03', 'local_only', 'U6', ['BE-M-05'], 'Idempotency keys live in memory for the API process lifetime.'),
  I('DE-04', 'local_only', 'U6', ['DE-M-03', 'DE-M-05'], 'CDC checkpoint/replay APIs work in memory; Debezium is not connected.'),
  I('DE-05', 'local_only', 'U7', ['DE-M-04'], 'Data Pulse reads the tenant event log, quality rules, and provider probes. Not Kafka lag metrics.'),
  I('DE-06', 'local_only', 'U6', ['DE-M-05'], 'Bronze/silver/gold records are API objects, not lakehouse tables.'),
  I('DE-07', 'local_only', 'U6', ['DE-M-05'], 'Artifact ingest records hash and mock malware scan; no object-store write.'),
  I('DE-08', 'local_only', 'U6', ['DE-M-03'], 'Pipeline runs are in-memory job records with retries/DLQ shape.'),
  I('DE-09', 'local_only', 'U6', ['DE-M-02', 'DE-M-04'], 'Quality rules display local/static values, not live pipeline metrics.'),
  I('DE-10', 'local_only', 'U6', ['DE-M-03'], 'Replay/backfill enqueue local jobs; no Kafka offset replay.'),
  I('DE-11', 'local_only', 'U6', ['DE-M-05'], 'Feature-store definitions and skew test are local records.'),
  I('DE-12', 'local_only', 'U6', ['DE-M-02', 'DE-M-04'], 'Catalog/lineage is a local snapshot, not a governed warehouse catalog.'),
  I('DE-13', 'local_only', 'U6', ['DE-M-03'], 'Deletion workflow enqueues a local job; no verified storage purge.'),
  I('DE-14', 'local_only', 'U6', ['DE-M-05'], 'Backup/restore APIs record RPO/RTO evidence objects only.'),
  I('DE-15', 'local_only', 'U6', ['DE-M-05'], 'Semantic metrics publish local events, not a BI semantic layer.'),

  // —— Frontend (15) ——
  I('FE-01', 'local_only', 'U4', ['RT-M-02', 'FE-M-08'], 'Two browsers can join the same interview over peer-to-peer WebRTC. LiveKit SFU is not connected.'),
  I('FE-02', 'local_only', 'U3', ['RT-M-05'], 'Candidate can trigger a real camera/mic check in the browser; TURN reachability is heuristic.'),
  I('FE-03', 'local_only', 'U4', ['FE-M-08', 'CR-M-01'], 'Candidate portal waiting room enters the same interview room as the panel after consent.'),
  I('FE-04', 'local_only', 'U3', ['FE-M-08'], 'Layout presets render in CSS; they do not rearrange live remote tracks.'),
  I('FE-05', 'mocked', 'U4', ['FE-M-08', 'AI-M-05'], 'Captions/transcript pane shows seeded text, not a stream.'),
  I('FE-06', 'mocked', 'U3', ['RT-M-04'], 'Coding workspace is a textarea, not Monaco/CRDT.'),
  I('FE-07', 'local_only', 'U4', ['RT-M-03'], 'Screen share uses getDisplayMedia; whiteboard is a synced canvas. Not a CRDT and not an SFU share.'),
  I('FE-08', 'local_only', 'U2', ['FE-M-08'], 'Task pane is interactive locally; submissions are not durable artifacts.'),
  I('FE-09', 'local_only', 'U5', ['FE-M-08', 'AI-M-05'], 'Copilot drawer shows gateway or labelled fallback output, not a seed catalog.'),
  I('FE-10', 'local_only', 'U4', ['RT-M-03'], 'Noise/echo apply getUserMedia constraints when the browser allows. Blur is a local CSS preview.'),
  I('FE-11', 'local_only', 'U3', ['RT-M-02'], 'Reconnect/audio-only copy exists; media state is simulated except in the RTC app.'),
  I('FE-12', 'local_only', 'U7', ['FE-M-16'], 'Keyboard, focus, and reduced-motion work in the shell; no axe/UAT evidence pack yet.'),
  I('FE-13', 'local_only', 'U2', ['FE-M-01'], 'Dark mode and responsive nav work; tenant branding/i18n catalogs are local.'),
  I('FE-14', 'local_only', 'U4', ['CR-M-01'], 'Portal consent writes the interview record via the invitation token (or labelled demo fallback).'),
  I('FE-15', 'local_only', 'U1', [], 'Encrypted time-limited setup draft works in the browser; no media/token storage.'),

  // —— Backend (14) ——
  I('BE-01', 'local_only', 'U1', ['BE-M-06'], 'One seeded Northstar tenant exists; no persistent org hierarchy.'),
  I('BE-02', 'local_only', 'U1', ['BE-M-01'], 'Lifecycle transitions work against in-memory interviews.'),
  I('BE-03', 'local_only', 'U2', ['BE-M-01'], 'Slot search and schedule create work in memory for the process lifetime.'),
  I('BE-04', 'local_only', 'U2', ['BE-M-01'], 'Calendar sync is a provider seam; nothing two-way syncs with Google/CalDAV yet.', { note: 'Radicale is in compose but not wired.' }),
  I('BE-05', 'local_only', 'U2', ['BE-M-01'], 'Invitation tokens expire in memory; no email/SMS delivery.'),
  I('BE-06', 'local_only', 'U4', ['RT-M-01'], 'Socket.IO presence and WebRTC signaling use the session JWT; SDP is not stored.'),
  I('BE-07', 'local_only', 'U4', ['RT-M-02'], 'Media sessions remain local records. Rooms use browser P2P; no LiveKit/TURN credentials issued.'),
  I('BE-08', 'local_only', 'U2', ['BE-M-03'], 'Artifact jobs are in-memory queue records, not object-store uploads.'),
  I('BE-09', 'local_only', 'U2', ['FE-M-08'], 'Scorecard can persist in the browser/API session; not a durable store.'),
  I('BE-10', 'local_only', 'U1', ['BE-M-03', 'BE-M-05'], 'Background jobs are an in-memory array.'),
  I('BE-11', 'local_only', 'U2', ['BE-M-05'], 'Webhook registration validates URL/SSRF; delivery is not an external bus.'),
  I('BE-12', 'local_only', 'U2', ['BE-M-01'], 'Search filters in-memory interviews/artifacts/catalog for the current tenant.'),
  I('BE-13', 'local_only', 'U2', ['BE-M-01'], 'Notification jobs honor quiet hours in memory; no email/SMS provider.'),
  I('BE-14', 'local_only', 'U2', ['BE-M-03'], 'Workflow stages are local configuration, not a durable engine.'),

  // —— Security (14) ——
  I('SC-01', 'local_only', 'U1', ['FE-M-05', 'BE-M-02'], 'Demo JWT login seeds Maya; OIDC/Keycloak is not the default path.'),
  I('SC-02', 'local_only', 'U1', ['BE-M-02'], 'RBAC checks run on API routes for the demo session.'),
  I('SC-03', 'local_only', 'U1', ['BE-M-02'], 'Step-up challenge is a local expiring record, not WebAuthn/IdP.'),
  I('SC-04', 'local_only', 'U1', ['BE-M-08'], 'Envelope-encryption API uses a local AES seam, not Vault/KMS.'),
  I('SC-05', 'local_only', 'U1', ['BE-M-08'], 'Hash-chained audit exists per process; it is not an append-only store.'),
  I('SC-06', 'local_only', 'U7', ['FE-M-11'], 'Trust Center shows the local residency policy record. Not region pinning.'),
  I('SC-07', 'local_only', 'U1', ['CR-M-01'], 'Consent create/read works when the API is on; stored in memory.'),
  I('SC-08', 'local_only', 'U6', ['BE-M-03'], 'PII redaction preview masks email/phone in a local helper.'),
  I('SC-09', 'local_only', 'U6', [], 'DLP scan is a local detector; it does not block real exports to vendors.'),
  I('SC-10', 'local_only', 'U3', [], 'Media tokens/watermarks are local records; no signed playback URLs.'),
  I('SC-11', 'local_only', 'U7', [], 'CSP/HSTS/SSRF guards are on the API; no production WAF.'),
  I('SC-12', 'local_only', 'U1', [], 'Secret rotation returns a vault-shaped record; secrets are not in Vault.'),
  I('SC-13', 'local_only', 'U7', [], 'Compliance evidence bundle is a generated local JSON, not an auditor system.'),
  I('SC-14', 'local_only', 'U4', ['AI-M-04'], 'Fairness/appeal adapter records exist; no live monitoring.'),

  // —— DevOps (14) ——
  I('DO-01', 'mocked', 'U7', ['FE-M-12'], 'IaC plan endpoint returns a module list; no Terraform/Pulumi apply.'),
  I('DO-02', 'mocked', 'U7', ['FE-M-12'], 'Scaling adapter is a record, not a cluster.'),
  I('DO-03', 'mocked', 'U3', ['RT-M-02'], 'Global media edge is not deployed; rooms are local.'),
  I('DO-04', 'local_only', 'U7', [], 'GitHub Actions workflow exists in-repo; org secrets and production deploys are not configured.'),
  I('DO-05', 'local_only', 'U2', ['BE-M-03'], 'Feature flags toggle in memory for the API process.'),
  I('DO-06', 'local_only', 'ops', [], 'Contract + UI + observability tests run in CI; no WebRTC/a11y/load matrix.'),
  I('DO-07', 'local_only', 'U7', ['BE-M-07'], 'OTLP HTTP exporter is wired when OTLP_ENDPOINT is set. Failures show a support trace id.'),
  I('DO-08', 'local_only', 'U7', ['FE-M-12'], 'Operations shows process-local request counters, not a 30-day SLO or on-call route.'),
  I('DO-09', 'mocked', 'U7', ['FE-M-12'], 'Synthetic/RUM cards are presentation, not probes.'),
  I('DO-10', 'mocked', 'U7', ['FE-M-12'], 'Capacity/cost views are seeded.'),
  I('DO-11', 'local_only', 'U7', [], 'DR drill API writes a local evidence object; no restore of real volumes.'),
  I('DO-12', 'local_only', 'U7', [], 'SBOM/audit endpoint plus npm audit in CI; no signed production artifacts.'),
  I('DO-13', 'local_only', 'U4', ['AI-M-03'], 'Model deployment adapter is a registry record, not a rollout.'),
  I('DO-14', 'local_only', 'U7', ['BE-M-03'], 'Incident records are in-memory; Operations labels that no on-call connector exists.'),

  // —— Enterprise (13) ——
  I('EO-01', 'local_only', 'U2', ['FE-M-14', 'BE-M-03'], 'Requisition workspace is local control-plane data.'),
  I('EO-02', 'local_only', 'U2', ['BE-M-04'], 'Interviewer directory is a local adapter list.'),
  I('EO-03', 'local_only', 'U2', ['BE-M-03'], 'Debrief workflow is a local generate/edit path.'),
  I('EO-04', 'local_only', 'U4', ['CR-M-01', 'FE-M-08'], 'Candidate portal loads the invitation interview and records consent; SFU is still not provisioned.'),
  I('EO-05', 'local_only', 'U7', ['FE-M-13'], 'Greenhouse is labelled sandbox mock (WireMock) or not connected. Never “Connected to Greenhouse”.'),
  I('EO-06', 'local_only', 'U7', ['FE-M-13'], 'Workday HRIS is labelled sandbox mock or not connected until an OAuth app exists.'),
  I('EO-07', 'local_only', 'U7', ['FE-M-13'], 'Slack/email cards say not connected. No live comms OAuth.'),
  I('EO-08', 'local_only', 'U6', ['BE-M-04'], 'Marketplace actions return local adapter records.'),
  I('EO-09', 'mocked', 'U6', ['FE-M-06', 'FE-M-14'], 'Executive analytics numbers are seeded.'),
  I('EO-10', 'local_only', 'U2', ['BE-M-04'], 'Tenant admin actions are local adapter records.'),
  I('EO-11', 'local_only', 'U2', ['BE-M-04'], 'White-label settings are local records, not custom domains.'),
  I('EO-12', 'local_only', 'U7', ['BE-M-04'], 'Usage/billing adapter returns local meters.'),
  I('EO-13', 'local_only', 'U7', ['BE-M-04'], 'Support export adapter returns a local bundle shape.'),

  // —— Candidate Readiness CR-01…CR-48 ——
  R('CR-01', 'local_only', 'U5', ['CR-M-05'], 'Authorized JD intake exists in the domain service (in-memory).'),
  R('CR-02', 'mocked', 'U5', ['CR-M-02'], 'JD parser UI uses the demo job, not a persisted parse.'),
  R('CR-03', 'local_only', 'U5', ['CR-M-05'], 'Competency map is produced by the domain scaffold.'),
  R('CR-04', 'local_only', 'U5', ['CR-M-05'], 'Gap map is a local domain calculation.'),
  R('CR-05', 'local_only', 'U7', ['CR-M-02'], 'Stories persist in the Ready file store when the API is on.'),
  R('CR-06', 'mocked', 'U5', ['CR-M-03'], 'Goals/constraints are demo profile fields.'),
  R('CR-07', 'local_only', 'U7', ['CR-M-02'], 'Readiness ring uses saved JD, stories, and practice from the API store.'),
  R('CR-08', 'local_only', 'U7', ['CR-M-05'], 'Plan create hits the readiness API; plans survive API restart on the file store.'),
  R('CR-09', 'mocked', 'U5', ['CR-M-03'], 'Time-boxed planner is not a real calendar.'),
  R('CR-10', 'mocked', 'U5', ['CR-M-02'], 'Learning resources are a demo list.'),
  R('CR-11', 'mocked', 'U5', ['CR-M-03'], 'Adaptive milestones are copy, not a learning loop.'),
  R('CR-12', 'local_only', 'U7', ['CR-M-02'], 'Practice sessions persist; live_assessment context is rejected.'),
  R('CR-13', 'local_only', 'U5', ['CR-M-03'], 'Reduced-motion and keyboard exist in the shell; accommodation booking does not.'),
  R('CR-14', 'mocked', 'U5', ['CR-M-03'], 'Reminders are not delivered.'),
  R('CR-15', 'local_only', 'U5', ['CR-M-07'], 'Coach persona is a local mode flag; AI is deterministic.'),
  R('CR-16', 'local_only', 'U5', ['CR-M-07'], 'Practice questions are JD-shaped local strings, not RAG.'),
  R('CR-17', 'local_only', 'U5', ['CR-M-05'], 'Multi-format practice modes exist; feedback is heuristic.'),
  R('CR-18', 'local_only', 'U5', ['CR-M-05'], 'Live-assessment lockout is enforced at the domain/API boundary.'),
  R('CR-19', 'local_only', 'U5', ['CR-M-07'], 'Evidence-linked feedback is deterministic guidance.'),
  R('CR-20', 'mocked', 'U5', ['CR-M-02'], 'Storytelling coach is static framework copy.'),
  R('CR-21', 'blocked_on_decision', 'U5', ['CR-M-09'], 'Coding sandbox is not provisioned.', { productionGate: 'blocked_on_decision' }),
  R('CR-22', 'mocked', 'U5', ['CR-M-03'], 'Resume reviewer screen is not a real document pipeline.'),
  R('CR-23', 'mocked', 'U5', ['CR-M-07'], 'Knowledge-verification coach is not wired.'),
  R('CR-24', 'local_only', 'U5', ['CR-M-05'], 'Handoff summary can be created in the domain; sharing is not a real coach inbox.'),
  R('CR-25', 'local_only', 'U7', ['CR-M-08'], 'Coach profiles persist when created via the API; the web list is empty until then.'),
  R('CR-26', 'local_only', 'U7', ['CR-M-08'], 'Matching uses persisted verified coaches in the same tenant.'),
  R('CR-27', 'local_only', 'U5', ['CR-M-03'], 'AI/human/hybrid mode is a local plan field.'),
  R('CR-28', 'local_only', 'U7', ['CR-M-08'], 'Booking requests persist; calendar hold is still not a provider.'),
  R('CR-29', 'blocked_on_decision', 'U5', ['CR-M-09'], 'Payments/entitlements have no provider.', { productionGate: 'blocked_on_decision' }),
  R('CR-30', 'blocked_on_decision', 'U3', ['CR-M-09'], 'Preparation media room is not a separate SFU.', { productionGate: 'blocked_on_decision' }),
  R('CR-31', 'mocked', 'U5', ['CR-M-03'], 'Coach notes UI is not a shared notebook.'),
  R('CR-32', 'mocked', 'U5', ['CR-M-03'], 'Human action plan is not a coach-authored record.'),
  R('CR-33', 'mocked', 'U5', ['CR-M-08'], 'Language/accommodation matching is demo.'),
  R('CR-34', 'mocked', 'U5', ['CR-M-08'], 'Rematch/safety workflow is not operational.'),
  R('CR-35', 'local_only', 'U5', ['CR-M-05'], 'Preparation product is a separate app; not joined to live assessment rooms.'),
  R('CR-36', 'local_only', 'U5', ['CR-M-03'], 'Consent toggles are local UI state plus API when remote.'),
  R('CR-37', 'local_only', 'U7', ['CR-M-03'], 'Progress is computed from persisted practice and stories.'),
  R('CR-38', 'local_only', 'U7', ['CR-M-02'], 'Stories persist in the Ready store; not Compass Vault.'),
  R('CR-39', 'mocked', 'U5', ['CR-M-03'], 'Readiness report is the overview ring, not an exportable artifact.'),
  R('CR-40', 'mocked', 'U5', ['CR-M-03'], 'Post-interview learning loop is not implemented.'),
  R('CR-41', 'local_only', 'U5', ['CR-M-05'], 'live_assessment context is rejected in domain tests.'),
  R('CR-42', 'local_only', 'U5', ['CR-M-05'], 'Export/delete endpoints exist as scaffolds; not durable.'),
  R('CR-43', 'local_only', 'U5', ['CR-M-05'], 'Source-approval policy is enforced in domain tests.'),
  R('CR-44', 'local_only', 'U5', ['CR-M-07'], 'AI limitation copy is shown; model version is scaffold metadata.'),
  R('CR-45', 'mocked', 'U5', ['CR-M-08'], 'Coach calibration ops do not exist.'),
  R('CR-46', 'mocked', 'U5', ['CR-M-03'], 'Appeal workflow is copy, not a queue.'),
  R('CR-47', 'mocked', 'U5', ['CR-M-03'], 'Program admin is not a tenant console.'),
  R('CR-48', 'blocked_on_decision', 'U6', ['CR-M-09'], 'ATS/calendar/webhook integrations are not chosen.', { productionGate: 'blocked_on_decision' }),

  // —— Career Vault CV-01…CV-20 (UAT IDs) ——
  V('CV-01', 'local_only', 'U5', ['CR-M-05'], 'Candidate can add an opportunity via API/UI; store is in-memory.'),
  V('CV-02', 'local_only', 'U5', [], 'Candidate can store a private note/feedback artifact in memory.'),
  V('CV-03', 'local_only', 'U5', [], 'Recording/transcript consent flags are recorded on the artifact scaffold.'),
  V('CV-04', 'local_only', 'U5', [], 'Missing-consent upload is blocked in domain policy tests.'),
  V('CV-05', 'blocked_on_decision', 'U5', [], 'Gmail OAuth is not connected; UI can register a local connector seam.', { productionGate: 'blocked_on_decision' }),
  V('CV-06', 'local_only', 'U5', [], 'Review-before-save import works on pasted/demo messages, not a real inbox.'),
  V('CV-07', 'blocked_on_decision', 'U5', [], 'Calendar OAuth is not connected.', { productionGate: 'blocked_on_decision' }),
  V('CV-08', 'local_only', 'U4', ['AI-M-02'], 'RAG themes are deterministic cited retrieval over provided evidence.'),
  V('CV-09', 'local_only', 'U4', ['AI-M-02'], 'Seven-day plan is a deterministic cited scaffold.'),
  V('CV-10', 'local_only', 'U4', ['AI-M-02'], 'Abstention on insufficient evidence is tested.'),
  V('CV-11', 'local_only', 'U5', [], 'Retrieval exclusion is enforced in domain tests.'),
  V('CV-12', 'local_only', 'U5', [], 'Granular share grants exist in domain; no live coach identity.'),
  V('CV-13', 'local_only', 'U5', [], 'Cross-candidate denial is tested in domain/API.'),
  V('CV-14', 'local_only', 'U5', [], 'Export endpoint returns a candidate-owned bundle shape.'),
  V('CV-15', 'local_only', 'U5', [], 'Deletion propagation is tested in-memory, not across object store/index.'),
  V('CV-16', 'local_only', 'U5', [], 'Cross-tenant retrieval denial is tested.'),
  V('CV-17', 'local_only', 'U5', [], 'Real-assessment lockout is enforced at API and RAG boundaries.'),
  V('CV-18', 'local_only', 'U5', [], 'Candidate can approve/reject/correct a local import record.'),
  V('CV-19', 'mocked', 'U7', [], 'Keyboard paths exist; UAT a11y pass is not evidenced.'),
  V('CV-20', 'local_only', 'U6', [], 'Structured logs hash tenant and omit raw email bodies in tests; not a production SIEM.'),
];

export const implementedFoundationIds = capabilities
  .filter((item) => item.product === 'interview')
  .map((item) => item.id);

export const implementedFoundationIdSet = new Set(implementedFoundationIds);

export function getCapability(id) {
  return capabilities.find((item) => item.id === id) ?? null;
}

export function capabilitiesForProduct(product) {
  return capabilities.filter((item) => item.product === product);
}

export function summarizeByState(product) {
  const source = product ? capabilitiesForProduct(product) : capabilities;
  const counts = Object.fromEntries(STATE_ORDER.map((state) => [state, 0]));
  for (const item of source) counts[item.state] += 1;
  return {
    total: source.length,
    counts,
    userUsable: counts.provider_wired + counts.staging_verified + counts.production_deployed,
  };
}

export function stateLabel(state) {
  return IMPLEMENTATION_STATES[state]?.label ?? state;
}

export function stateTone(state) {
  return IMPLEMENTATION_STATES[state]?.tone ?? 'amber';
}
