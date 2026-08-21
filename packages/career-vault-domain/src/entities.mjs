import { z } from 'zod';

export const SessionContext = z.enum(['preparation', 'career_planning', 'live_assessment']);
export const Provenance = z.enum(['candidate_entered', 'email_import', 'calendar_import', 'coach_shared', 'practice_artifact', 'approved_connector']);
export const OpportunitySource = z.enum(['official_career_page', 'approved_ats', 'partner_feed', 'referral', 'recruiter_invitation', 'candidate_added', 'email_receipt']);
export const ApplicationStatus = z.enum(['saved', 'review_required', 'submitted', 'received', 'reviewing', 'interview_requested', 'paused', 'closed', 'withdrawn']);
export const ArtifactKind = z.enum(['note', 'feedback', 'document', 'audio', 'video', 'transcript', 'portfolio', 'practice_session']);
export const RetentionPolicy = z.enum(['keep', 'delete_after_90_days', 'delete_after_1_year', 'delete_on_request']);

export const TimelineEventInput = z.object({
  tenantId: z.string().min(1),
  candidateId: z.string().min(1),
  kind: z.enum(['opportunity', 'application', 'interview', 'feedback', 'note', 'practice', 'coaching', 'next_action']),
  title: z.string().trim().min(2).max(180),
  occurredAt: z.string().datetime().optional(),
  source: Provenance.default('candidate_entered'),
  sourceReference: z.string().trim().min(1).max(500).default('candidate-entered'),
  opportunityId: z.string().optional(),
  details: z.record(z.string(), z.unknown()).default({}),
});

export const OpportunityInput = z.object({
  tenantId: z.string().min(1),
  candidateId: z.string().min(1),
  title: z.string().trim().min(2).max(180),
  company: z.string().trim().min(2).max(180),
  source: OpportunitySource,
  sourceReference: z.string().trim().min(3).max(500),
  sourceUrl: z.string().url().optional(),
  requirements: z.array(z.string().trim().min(2).max(100)).max(30).default([]),
  status: ApplicationStatus.default('saved'),
  deadline: z.string().datetime().optional(),
  verifiedSource: z.boolean().default(false),
});

export const ArtifactInput = z.object({
  tenantId: z.string().min(1),
  candidateId: z.string().min(1),
  kind: ArtifactKind,
  title: z.string().trim().min(2).max(180),
  content: z.string().trim().max(50_000).default(''),
  source: Provenance.default('candidate_entered'),
  sourceReference: z.string().trim().min(1).max(500).default('candidate-entered'),
  opportunityId: z.string().optional(),
  competency: z.string().trim().max(100).default(''),
  retention: RetentionPolicy.default('keep'),
  consent: z.object({
    recording: z.boolean().default(false),
    transcript: z.boolean().default(false),
    rightsConfirmed: z.boolean().default(false),
  }).default({}),
  contentHash: z.string().max(128).default(''),
  excludeFromRetrieval: z.boolean().default(false),
  createdAt: z.string().datetime().optional(),
});

export const ConnectorImportInput = z.object({
  tenantId: z.string().min(1),
  candidateId: z.string().min(1),
  provider: z.enum(['gmail', 'microsoft_email', 'google_calendar', 'microsoft_calendar']),
  scopeLabel: z.string().min(2).max(200),
  candidateApprovedAt: z.string().datetime(),
  candidateSelectedFolders: z.array(z.string().max(120)).max(30).default([]),
});

export const ShareInput = z.object({
  tenantId: z.string().min(1),
  candidateId: z.string().min(1),
  artifactIds: z.array(z.string().min(1)).min(1).max(50),
  recipientRole: z.enum(['coach', 'program_admin', 'trust_reviewer']),
  fields: z.array(z.enum(['summary', 'notes', 'feedback', 'practice_evidence'])).min(1),
  candidateApprovedAt: z.string().datetime(),
});

export const ExportRequestInput = z.object({
  tenantId: z.string().min(1),
  candidateId: z.string().min(1),
  include: z.array(z.enum(['timeline', 'artifacts', 'metadata', 'audit'])).min(1),
  candidateApprovedAt: z.string().datetime(),
});

export const DeletionRequestInput = z.object({
  tenantId: z.string().min(1),
  candidateId: z.string().min(1),
  candidateApprovedAt: z.string().datetime(),
});

export const EmailImportInput = z.object({
  tenantId: z.string().min(1),
  candidateId: z.string().min(1),
  connectorId: z.string().min(1),
  subject: z.string().trim().min(2).max(300),
  from: z.string().trim().min(3).max(200),
  receivedAt: z.string().datetime(),
  body: z.string().trim().max(50_000).default(''),
  eligibleFolder: z.boolean().default(true),
  scopeLabel: z.string().trim().min(2).max(200),
  candidateConsentedFolder: z.boolean(),
});

export const ImportReviewDecisionInput = z.object({
  tenantId: z.string().min(1),
  candidateId: z.string().min(1),
  importId: z.string().min(1),
  decision: z.enum(['approve', 'reject', 'correct']),
  titleOverride: z.string().trim().min(2).max(180).optional(),
  companyOverride: z.string().trim().min(2).max(180).optional(),
  candidateApprovedAt: z.string().datetime(),
});
