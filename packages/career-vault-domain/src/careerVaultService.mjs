import { randomUUID } from 'node:crypto';
import {
  ArtifactInput, ConnectorImportInput, DeletionRequestInput, EmailImportInput, ExportRequestInput,
  ImportReviewDecisionInput, OpportunityInput, ShareInput, TimelineEventInput,
} from './entities.mjs';
import { assertCandidatePrivateDefault, assertCareerPlanningContext, assertExplicitShare } from './policies.mjs';
import { createProviderRegistry } from './providerRegistry.mjs';

const id = (prefix) => `${prefix}-${randomUUID().slice(0, 8)}`;
const now = () => new Date().toISOString();

function normalizeDate(value) {
  if (!value) return now();
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? now() : date.toISOString();
}

function dedupeKey(opportunity) {
  return `${opportunity.tenantId}:${opportunity.candidateId}:${opportunity.company.toLowerCase()}:${opportunity.title.toLowerCase()}`;
}

function extractRoleFromSubject(subject) {
  // Heuristic extraction for review-before-save; the candidate always confirms.
  let role = subject.trim();
  for (let i = 0; i < 3; i += 1) {
    const stripped = role.replace(/^(?:interview|application|offer|invitation|recruiter|assessment)[\s:\-]+/i, '');
    if (stripped === role) break;
    role = stripped;
  }
  return role.trim().slice(0, 180) || subject.trim().slice(0, 180);
}

function extractCompanyFromBody(body) {
  const match = /(?:at|from|with)\s+([A-Z][A-Za-z0-9&.\- ]{2,60})/i.exec(body);
  const company = match ? match[1].trim() : 'Candidate-entered company';
  return company.replace(/[.,;:!?]+$/, '').trim().slice(0, 180);
}

export function createCareerVaultService() {
  const events = new Map();
  const opportunities = new Map();
  const artifacts = new Map();
  const consents = new Map();
  const shares = new Map();
  const connectors = new Map();
  const excluded = new Map();
  const imports = new Map();
  const audit = [];
  const providers = createProviderRegistry();

  const record = (action, entityType, entityId, tenantId, candidateId, actorId, metadata = {}) => {
    const entry = { id: id('cv-audit'), action, entityType, entityId, tenantId, candidateId, actorId, metadata, at: now() };
    audit.unshift(entry);
    return entry;
  };

  const scope = (entity, tenantId, candidateId) => entity && entity.tenantId === tenantId && entity.candidateId === candidateId;

  return {
    // ---- Timeline (system of record) ----

    createOpportunity(input) {
      const value = OpportunityInput.parse(input);
      const existing = [...opportunities.values()].find((item) => scope(item, value.tenantId, value.candidateId) && dedupeKey(item) === dedupeKey(value) && !['withdrawn', 'closed'].includes(item.status));
      if (existing) throw new Error('An active opportunity already exists for this company and role.');
      const opportunity = { id: id('cv-opp'), ...value, createdAt: now(), updatedAt: now() };
      opportunities.set(opportunity.id, opportunity);
      record('opportunity.created', 'opportunity', opportunity.id, value.tenantId, value.candidateId, value.candidateId, { source: opportunity.source });
      return opportunity;
    },

    updateOpportunityStatus({ tenantId, candidateId, opportunityId, status, actorId }) {
      assertCandidatePrivateDefault({ candidateId, actorId });
      const opportunity = opportunities.get(opportunityId);
      if (!scope(opportunity, tenantId, candidateId)) throw new Error('Opportunity not found.');
      const previous = opportunity.status;
      opportunity.status = status;
      opportunity.updatedAt = now();
      record('opportunity.status_updated', 'opportunity', opportunity.id, tenantId, candidateId, actorId, { previous, status });
      return opportunity;
    },

    addTimelineEvent(input) {
      const value = TimelineEventInput.parse(input);
      const event = { id: id('cv-event'), ...value, occurredAt: normalizeDate(value.occurredAt), createdAt: now() };
      events.set(event.id, event);
      record('timeline.event_added', 'timeline_event', event.id, value.tenantId, value.candidateId, value.candidateId, { kind: event.kind, source: event.source });
      return event;
    },

    listTimeline({ tenantId, candidateId, kind, source }) {
      return [...events.values()]
        .filter((event) => scope(event, tenantId, candidateId))
        .filter((event) => !kind || event.kind === kind)
        .filter((event) => !source || event.source === source)
        .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1));
    },

    listOpportunities({ tenantId, candidateId, status }) {
      return [...opportunities.values()]
        .filter((item) => scope(item, tenantId, candidateId))
        .filter((item) => !status || item.status === status)
        .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
    },

    // ---- Artifact Vault ----

    addArtifact(input) {
      const value = ArtifactInput.parse(input);
      if (['audio', 'video'].includes(value.kind) && !value.consent.recording) {
        throw new Error('Recording consent and participant-rights confirmation are required before storing audio/video.');
      }
      if (value.kind === 'transcript' && !value.consent.transcript) {
        throw new Error('Transcript consent is required before storing a transcript.');
      }
      const artifact = { id: id('cv-artifact'), ...value, createdAt: normalizeDate(value.createdAt), updatedAt: now() };
      artifacts.set(artifact.id, artifact);
      record('artifact.created', 'artifact', artifact.id, value.tenantId, value.candidateId, value.candidateId, { kind: artifact.kind, retention: artifact.retention, privateByDefault: true });
      return artifact;
    },

    listArtifacts({ tenantId, candidateId, kind }) {
      return [...artifacts.values()]
        .filter((item) => scope(item, tenantId, candidateId))
        .filter((item) => !kind || item.kind === kind)
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
    },

    getArtifact({ tenantId, candidateId, artifactId, actorId }) {
      const artifact = artifacts.get(artifactId);
      if (!scope(artifact, tenantId, candidateId)) throw new Error('Artifact not found.');
      if (actorId !== candidateId) throw new Error('Candidate vault artifacts are private by default.');
      return artifact;
    },

    excludeArtifactFromRetrieval({ tenantId, candidateId, artifactId, actorId }) {
      const artifact = artifacts.get(artifactId);
      if (!scope(artifact, tenantId, candidateId)) throw new Error('Artifact not found.');
      artifact.excludeFromRetrieval = true;
      excluded.set(artifact.id, { tenantId, candidateId, excludedAt: now(), actorId });
      record('artifact.retrieval_excluded', 'artifact', artifact.id, tenantId, candidateId, actorId);
      return artifact;
    },

    // ---- Consent, connectors, sharing ----

    updateConsent(input) {
      const consent = { ...input, updatedAt: now() };
      consents.set(`${consent.tenantId}:${consent.candidateId}`, consent);
      record('consent.updated', 'candidate_consent', consent.candidateId, consent.tenantId, consent.candidateId, consent.candidateId);
      return consent;
    },

    registerConnector(input) {
      const value = ConnectorImportInput.parse(input);
      const connector = { id: id('cv-connector'), ...value, status: 'candidate_approved_review_before_import', createdAt: now() };
      connectors.set(connector.id, connector);
      record('connector.registered', 'connector', connector.id, value.tenantId, value.candidateId, value.candidateId, { provider: connector.provider, scopeLabel: connector.scopeLabel });
      return connector;
    },

    // ---- Email import (review-before-save) ----

    importEmail(input) {
      const value = EmailImportInput.parse(input);
      if (!providers.isEnabled('email')) throw new Error('Email import is disabled. Enable the Email import connection in Trust & data first.');
      const connector = connectors.get(value.connectorId);
      if (!scope(connector, value.tenantId, value.candidateId)) throw new Error('Connector not found for this candidate.');
      if (!value.eligibleFolder) throw new Error('Email folder is not within the candidate-selected eligible folders.');
      if (!value.candidateConsentedFolder) throw new Error('Candidate consent for this folder is required before import.');
      const parsed = { role: extractRoleFromSubject(value.subject), company: extractCompanyFromBody(value.body) };
      const importRecord = {
        id: id('cv-import'), tenantId: value.tenantId, candidateId: value.candidateId, connectorId: value.connectorId,
        subject: value.subject, from: value.from, receivedAt: value.receivedAt, body: value.body, scopeLabel: value.scopeLabel,
        parsed, status: 'awaiting_review', candidateApprovedAt: null, titleOverride: null, companyOverride: null, createdAt: now(),
        trainingUse: false, forwardedToEmployer: false,
      };
      imports.set(importRecord.id, importRecord);
      record('email_import.received', 'email_import', importRecord.id, value.tenantId, value.candidateId, value.candidateId, { subject: value.subject.slice(0, 80) });
      return importRecord;
    },

    listImports({ tenantId, candidateId, status }) {
      return [...imports.values()]
        .filter((item) => scope(item, tenantId, candidateId))
        .filter((item) => !status || item.status === status)
        .sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : -1));
    },

    reviewImport(input) {
      const value = ImportReviewDecisionInput.parse(input);
      const target = imports.get(value.importId);
      if (!scope(target, value.tenantId, value.candidateId)) throw new Error('Import not found or already reviewed.');
      if (target.status !== 'awaiting_review') throw new Error('Import has already been reviewed.');
      target.candidateApprovedAt = value.candidateApprovedAt;
      if (value.decision === 'reject') {
        target.status = 'rejected';
        record('email_import.rejected', 'email_import', target.id, value.tenantId, value.candidateId, value.candidateId);
        return target;
      }
      if (value.decision === 'correct') {
        if (!value.titleOverride || !value.companyOverride) throw new Error('Title and company overrides are required for a correction.');
        target.parsed.role = value.titleOverride;
        target.parsed.company = value.companyOverride;
      }
      const duplicate = [...opportunities.values()].find((item) => scope(item, value.tenantId, value.candidateId) && dedupeKey(item) === dedupeKey({ tenantId: value.tenantId, candidateId: value.candidateId, company: target.parsed.company, title: target.parsed.role }) && !['withdrawn', 'closed'].includes(item.status));
      if (duplicate) throw new Error('An active opportunity already exists for this imported role; review the existing entry instead.');
      const opportunity = this.createOpportunity({
        tenantId: value.tenantId, candidateId: value.candidateId, title: target.parsed.role, company: target.parsed.company,
        source: 'email_receipt', sourceReference: `email-import:${target.id}`, status: 'saved', verifiedSource: false,
      });
      this.addTimelineEvent({ tenantId: value.tenantId, candidateId: value.candidateId, kind: 'application', title: `Email receipt: ${target.subject.slice(0, 120)}`, occurredAt: target.receivedAt, source: 'email_import', opportunityId: opportunity.id });
      target.status = value.decision === 'correct' ? 'corrected' : 'approved';
      target.opportunityId = opportunity.id;
      record('email_import.approved', 'email_import', target.id, value.tenantId, value.candidateId, value.candidateId, { decision: value.decision, opportunityId: opportunity.id });
      return { ...target, opportunity };
    },

    createShare(input) {
      const value = ShareInput.parse(input);
      assertExplicitShare(value);
      const missing = value.artifactIds.filter((artifactId) => !scope(artifacts.get(artifactId), value.tenantId, value.candidateId));
      if (missing.length) throw new Error('One or more artifacts are not candidate-owned.');
      const share = { id: id('cv-share'), ...value, scope: 'candidate_selected_fields_only', employerEvaluationExcluded: true, createdAt: now() };
      shares.set(share.id, share);
      record('share.created', 'share', share.id, value.tenantId, value.candidateId, value.candidateId, { recipientRole: share.recipientRole, fields: share.fields, artifactCount: share.artifactIds.length });
      return share;
    },

    // ---- Candidate data rights ----

    getDashboard({ tenantId, candidateId, actorId }) {
      assertCandidatePrivateDefault({ candidateId, actorId });
      const candidateArtifacts = this.listArtifacts({ tenantId, candidateId });
      const candidateOpportunities = this.listOpportunities({ tenantId, candidateId });
      const candidateEvents = this.listTimeline({ tenantId, candidateId });
      const pending = candidateOpportunities.filter((item) => ['saved', 'review_required', 'interview_requested', 'submitted'].includes(item.status));
      const nextActions = candidateEvents.filter((event) => event.kind === 'next_action' && event.details?.status !== 'done').slice(0, 5);
      return {
        opportunityCount: candidateOpportunities.length,
        artifactCount: candidateArtifacts.length,
        timelineCount: candidateEvents.length,
        opportunities: candidateOpportunities,
        artifacts: candidateArtifacts,
        timeline: candidateEvents.slice(0, 20),
        consent: consents.get(`${tenantId}:${candidateId}`) || null,
        actionInbox: [
          ...pending.slice(0, 3).map((item) => ({ type: 'opportunity', label: `${item.title} at ${item.company}`, priority: item.deadline ? 'high' : 'medium', opportunityId: item.id })),
          ...nextActions.map((event) => ({ type: 'next_action', label: event.title, priority: 'medium', eventId: event.id })),
        ],
      };
    },

    exportCandidateData(input) {
      const value = ExportRequestInput.parse(input);
      assertCareerPlanningContext({ sessionContext: 'career_planning' });
      const data = {};
      if (value.include.includes('timeline')) {
        data.timeline = [...events.values()].filter((item) => scope(item, value.tenantId, value.candidateId));
        data.opportunities = [...opportunities.values()].filter((item) => scope(item, value.tenantId, value.candidateId));
      }
      if (value.include.includes('artifacts')) {
        data.artifacts = [...artifacts.values()].filter((item) => scope(item, value.tenantId, value.candidateId));
      }
      if (value.include.includes('metadata')) {
        data.consent = consents.get(`${value.tenantId}:${value.candidateId}`) || null;
        data.connectors = [...connectors.values()].filter((item) => scope(item, value.tenantId, value.candidateId));
        data.shares = [...shares.values()].filter((item) => scope(item, value.tenantId, value.candidateId));
      }
      if (value.include.includes('audit')) {
        data.audit = audit.filter((entry) => entry.tenantId === value.tenantId && entry.candidateId === value.candidateId);
      }
      record('data.export_requested', 'candidate_data', value.candidateId, value.tenantId, value.candidateId, value.candidateId, { include: value.include });
      return { exportScope: 'candidate_owned_timeline_and_artifacts_only', data };
    },

    deleteCandidateData(input) {
      const value = DeletionRequestInput.parse(input);
      assertCareerPlanningContext({ sessionContext: 'career_planning' });
      const keys = [
        ...events.values(), ...opportunities.values(), ...artifacts.values(),
        ...connectors.values(), ...shares.values(), ...excluded.values(),
      ].filter((item) => scope(item, value.tenantId, value.candidateId)).map((item) => item.id);
      keys.forEach((key) => {
        events.delete(key); opportunities.delete(key); artifacts.delete(key);
        connectors.delete(key); shares.delete(key); excluded.delete(key);
      });
      const consentKey = `${value.tenantId}:${value.candidateId}`;
      consents.delete(consentKey);
      record('data.deletion_requested', 'candidate_data', value.candidateId, value.tenantId, value.candidateId, value.candidateId, { deletedEntities: keys.length });
      return { deletedEntities: keys.length, propagated: true, auditRetained: true };
    },

    // ---- Trust ----

    getAudit({ tenantId }) {
      return audit.filter((entry) => entry.tenantId === tenantId);
    },

    listProviders({ tenantId, candidateId }) {
      return providers.list({ tenantId, candidateId });
    },

    setProviderEnabled({ tenantId, candidateId, providerId, enabled }) {
      const updated = providers.setEnabled({ tenantId, candidateId, providerId, enabled });
      record(enabled ? 'provider.enabled' : 'provider.disabled', 'provider_connection', providerId, tenantId, candidateId, candidateId, { providerId });
      return updated;
    },
  };
}
