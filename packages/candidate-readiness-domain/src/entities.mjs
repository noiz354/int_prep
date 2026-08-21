import { z } from 'zod';

export const ActorRole = z.enum(['candidate', 'coach', 'program_admin', 'trust_reviewer']);
export const CoachingMode = z.enum(['ai', 'human', 'hybrid', 'none']);
export const SessionContext = z.enum(['preparation', 'live_assessment']);
export const SourceApproval = z.enum(['candidate_owned', 'tenant_approved', 'admin_approved']);
export const OpportunitySource = z.enum(['official_career_page', 'approved_ats', 'partner_feed', 'referral', 'recruiter_invitation', 'candidate_added']);
export const ApplicationStatus = z.enum(['saved', 'review_required', 'submitted', 'received', 'reviewing', 'interview_requested', 'paused', 'closed', 'withdrawn']);

export const CandidateProfileInput = z.object({
  tenantId: z.string().min(1),
  candidateId: z.string().min(1),
  displayName: z.string().trim().min(2).max(100),
  headline: z.string().trim().min(2).max(180),
  skills: z.array(z.string().trim().min(2).max(100)).min(1).max(50),
  languages: z.array(z.string().trim().min(2).max(35)).min(1).max(10),
  timeZone: z.string().min(3).max(60),
  preferences: z.object({
    workTypes: z.array(z.string().max(50)).max(10).default([]),
    locations: z.array(z.string().max(80)).max(20).default([]),
    compensation: z.string().max(100).default('Not specified'),
    accessibility: z.array(z.string().max(100)).max(10).default([]),
  }).default({}),
});

export const JobDescriptionInput = z.object({
  tenantId: z.string().min(1),
  candidateId: z.string().min(1),
  title: z.string().trim().min(2).max(180),
  company: z.string().trim().min(2).max(180).default('Target company'),
  sourceApproval: SourceApproval,
  sourceReference: z.string().trim().min(3).max(500),
  content: z.string().trim().min(40).max(20_000),
  competencies: z.array(z.string().trim().min(2).max(100)).min(1).max(20),
  stack: z.array(z.string().trim().min(2).max(100)).max(30).default([]),
  sourceUrl: z.string().url().optional(),
});

export const ReadinessPlanInput = z.object({
  tenantId: z.string().min(1),
  candidateId: z.string().min(1),
  jobDescriptionId: z.string().min(1),
  coachingMode: CoachingMode,
  targetDate: z.string().datetime().optional(),
  timeBudgetHours: z.number().int().min(1).max(80),
  language: z.string().min(2).max(35),
  accessibilityPreferences: z.array(z.string().max(100)).max(10).default([]),
});

export const CoachProfileInput = z.object({
  tenantId: z.string().min(1),
  coachId: z.string().min(1),
  displayName: z.string().trim().min(2).max(100),
  specialties: z.array(z.string().trim().min(2).max(100)).min(1).max(20),
  languages: z.array(z.string().trim().min(2).max(35)).min(1).max(10),
  timeZone: z.string().min(3).max(60),
  verificationStatus: z.enum(['pending', 'verified', 'suspended']),
  conflictDeclarations: z.array(z.string().max(300)).max(20).default([]),
  availability: z.array(z.string().max(100)).max(20).default([]),
});

export const HandoffInput = z.object({
  tenantId: z.string().min(1),
  candidateId: z.string().min(1),
  planId: z.string().min(1),
  coachId: z.string().min(1),
  sharedFields: z.array(z.enum(['goals', 'milestones', 'practiceEvidence', 'accessibilityPreferences', 'storyLibrary'])).min(1),
  candidateApprovedAt: z.string().datetime(),
});

export const StoryInput = z.object({
  tenantId: z.string().min(1),
  candidateId: z.string().min(1),
  title: z.string().trim().min(3).max(160),
  competency: z.string().trim().min(2).max(100),
  situation: z.string().trim().min(10).max(2_000),
  task: z.string().trim().min(10).max(2_000),
  action: z.string().trim().min(10).max(3_000),
  result: z.string().trim().min(10).max(2_000),
  reflection: z.string().trim().max(2_000).default(''),
});

export const PracticeSessionInput = z.object({
  tenantId: z.string().min(1),
  candidateId: z.string().min(1),
  planId: z.string().min(1),
  sessionContext: z.literal('preparation'),
  consentForAi: z.boolean(),
  practiceMode: z.enum(['behavioral', 'technical', 'system_design', 'portfolio', 'coding']),
  competency: z.string().trim().min(2).max(100),
  answer: z.string().trim().max(10_000).default(''),
});

export const OpportunityInput = z.object({
  tenantId: z.string().min(1),
  candidateId: z.string().min(1),
  title: z.string().trim().min(2).max(180),
  company: z.string().trim().min(2).max(180),
  source: OpportunitySource,
  sourceReference: z.string().trim().min(3).max(500),
  sourceUrl: z.string().url().optional(),
  requirements: z.array(z.string().trim().min(2).max(100)).min(1).max(30),
  status: ApplicationStatus.default('saved'),
  verifiedSource: z.boolean().default(false),
});

export const ApplicationInput = z.object({
  tenantId: z.string().min(1),
  candidateId: z.string().min(1),
  opportunityId: z.string().min(1),
  resumeVersion: z.string().trim().min(2).max(160),
  candidateApprovedAt: z.string().datetime(),
  status: ApplicationStatus.default('review_required'),
});

export const CampaignInput = z.object({
  tenantId: z.string().min(1),
  candidateId: z.string().min(1),
  name: z.string().trim().min(3).max(120),
  sourceTypes: z.array(OpportunitySource).min(1).max(6),
  targetRoles: z.array(z.string().trim().min(2).max(100)).min(1).max(10),
  dailyLimit: z.number().int().min(1).max(20),
  reviewBeforeSend: z.boolean().default(true),
  candidateApprovedAt: z.string().datetime(),
});

export const ConsentInput = z.object({
  tenantId: z.string().min(1),
  candidateId: z.string().min(1),
  aiPractice: z.boolean(),
  recording: z.boolean(),
  transcript: z.boolean(),
  humanCoachSharing: z.boolean(),
  opportunityEmail: z.boolean(),
  instagramBusinessUpdates: z.boolean(),
  legalNoticeVersion: z.string().trim().min(1).max(120),
});
