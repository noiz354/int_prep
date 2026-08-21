import { randomUUID } from 'node:crypto';
import {
  ApplicationInput, CampaignInput, CandidateProfileInput, CoachProfileInput, ConsentInput,
  HandoffInput, JobDescriptionInput, OpportunityInput, PracticeSessionInput, ReadinessPlanInput, StoryInput,
} from './entities.mjs';
import { assertCandidateControlledShare, assertPreparationOnly, canCoachAccess } from './policies.mjs';

const id = (prefix) => `${prefix}-${randomUUID().slice(0, 8)}`;
const now = () => new Date().toISOString();

const sourceCatalog = [
  { id: 'mdn-web-performance', title: 'MDN Web Performance', type: 'official documentation', url: 'https://developer.mozilla.org/', topics: ['performance', 'browser', 'web'] },
  { id: 'react-docs', title: 'React Documentation', type: 'official documentation', url: 'https://react.dev/', topics: ['react', 'frontend', 'components'] },
  { id: 'owasp', title: 'OWASP Application Security', type: 'official guidance', url: 'https://owasp.org/', topics: ['security', 'authentication', 'web'] },
  { id: 'web-a11y', title: 'W3C Web Accessibility Initiative', type: 'official guidance', url: 'https://www.w3.org/WAI/', topics: ['accessibility', 'a11y', 'inclusive'] },
];

function buildSkillMatrix(job, profile) {
  return job.competencies.map((competency) => {
    const evidence = profile?.skills?.filter((skill) => skill.toLowerCase().includes(competency.toLowerCase()) || competency.toLowerCase().includes(skill.toLowerCase())) || [];
    const stackEvidence = job.stack.filter((stack) => profile?.skills?.some((skill) => skill.toLowerCase().includes(stack.toLowerCase()) || stack.toLowerCase().includes(skill.toLowerCase())));
    const status = evidence.length || stackEvidence.length ? 'evidence_found' : 'practice_needed';
    return { competency, status, evidence, stackEvidence, recommendedAction: status === 'evidence_found' ? 'prepare a concrete story and trade-off' : 'learn fundamentals and complete a practice task' };
  });
}

function buildMaterials(job) {
  const tokens = `${job.title} ${job.competencies.join(' ')} ${job.stack.join(' ')}`.toLowerCase();
  const matched = sourceCatalog.filter((source) => source.topics.some((topic) => tokens.includes(topic)));
  return (matched.length ? matched : sourceCatalog.slice(0, 2)).map((source) => ({ ...source, provenance: 'public_authorized_reference', relevance: `Supports role requirements in ${job.title}` }));
}

function practiceFeedback(session) {
  const words = session.answer ? session.answer.trim().split(/\s+/).filter(Boolean).length : 0;
  const containsOutcome = /result|impact|improved|reduced|increased|saved|delivered|percent|%/i.test(session.answer);
  const containsTradeoff = /trade.?off|constraint|because|however|risk|alternative/i.test(session.answer);
  const containsValidation = /test|monitor|measure|validate|metric|verify/i.test(session.answer);
  const score = Math.min(100, Math.round((Math.min(words, 180) / 180) * 35 + (containsOutcome ? 25 : 0) + (containsTradeoff ? 20 : 0) + (containsValidation ? 20 : 0)));
  return {
    readinessSignal: score,
    dimensions: {
      structure: words >= 60 ? 'developing' : 'needs_detail',
      evidence: containsOutcome ? 'present' : 'add_concrete_outcome',
      tradeoffs: containsTradeoff ? 'present' : 'explain_constraints_and_tradeoffs',
      validation: containsValidation ? 'present' : 'explain_how_you_test_or_measure',
    },
    guidance: [
      `Connect your answer explicitly to ${session.competency}.`,
      containsOutcome ? 'Keep the outcome concrete and truthful.' : 'Add a real, candidate-owned result, metric, or observable impact.',
      containsTradeoff ? 'Name why the selected approach fit the constraints.' : 'Name one constraint and one trade-off you considered.',
    ],
    limitations: ['Practice-only feedback. It is not a hiring prediction or a live-assessment evaluation.'],
  };
}

function readinessBreakdown(plan, stories, sessions, job, profile) {
  const skillMatrix = buildSkillMatrix(job, profile);
  const skillCoverage = Math.round((skillMatrix.filter((item) => item.status === 'evidence_found').length / Math.max(1, skillMatrix.length)) * 100);
  const evidenceScore = Math.min(100, stories.length * 25);
  const practiceScore = sessions.length ? Math.round(sessions.reduce((sum, session) => sum + (session.feedback?.readinessSignal || 0), 0) / sessions.length) : 0;
  const communicationScore = sessions.length ? Math.round(sessions.reduce((sum, session) => sum + (session.feedback?.dimensions?.structure === 'developing' ? 75 : 40), 0) / sessions.length) : 0;
  const sessionReadiness = plan?.deviceChecklist?.completed ? 100 : 40;
  const total = Math.round(skillCoverage * .25 + evidenceScore * .20 + practiceScore * .20 + communicationScore * .15 + sessionReadiness * .10 + Math.min(100, plan?.milestones?.filter((milestone) => milestone.status === 'complete').length * 25) * .10);
  return { total, skillCoverage, evidenceScore, practiceScore, communicationScore, sessionReadiness, label: total >= 80 ? 'ready_to_apply_or_schedule_assessment' : total >= 70 ? 'schedule_mock_and_human_review' : total >= 50 ? 'practice_priority_areas' : 'build_fundamentals_first', skillMatrix };
}

export function createReadinessService() {
  const profiles = new Map();
  const jobs = new Map();
  const plans = new Map();
  const coaches = new Map();
  const handoffs = new Map();
  const stories = new Map();
  const sessions = new Map();
  const opportunities = new Map();
  const applications = new Map();
  const campaigns = new Map();
  const bookings = new Map();
  const consents = new Map();
  const audit = [];

  const record = (action, entityType, entityId, tenantId, candidateId, metadata = {}) => {
    const entry = { id: id('cr-audit'), action, entityType, entityId, tenantId, candidateId, metadata, at: now() };
    audit.unshift(entry);
    return entry;
  };

  const scope = (entity, tenantId, candidateId) => entity && entity.tenantId === tenantId && entity.candidateId === candidateId;

  return {
    upsertProfile(input) {
      const profile = { ...CandidateProfileInput.parse(input), updatedAt: now() };
      profiles.set(`${profile.tenantId}:${profile.candidateId}`, profile);
      record('profile.upserted', 'candidate_profile', profile.candidateId, profile.tenantId, profile.candidateId);
      return profile;
    },

    createJobDescription(input) {
      const value = JobDescriptionInput.parse(input);
      assertPreparationOnly({ sessionContext: 'preparation', sourceApproval: value.sourceApproval });
      const job = { id: id('cr-job'), ...value, createdAt: now(), status: 'approved_for_preparation' };
      jobs.set(job.id, job);
      record('job_description.created', 'job_description', job.id, job.tenantId, job.candidateId, { sourceApproval: job.sourceApproval });
      return job;
    },

    buildRoleIntelligence({ tenantId, candidateId, jobDescriptionId }) {
      const job = jobs.get(jobDescriptionId);
      if (!scope(job, tenantId, candidateId)) throw new Error('Authorized job description not found.');
      const profile = profiles.get(`${tenantId}:${candidateId}`);
      const rolePack = {
        jobDescriptionId: job.id,
        title: job.title,
        company: job.company,
        skillMatrix: buildSkillMatrix(job, profile),
        materials: buildMaterials(job),
        communicationBlueprint: ['Context → Constraints → Approach → Trade-offs → Validation', 'Situation → Task → Action → Result → Reflection'],
        assessmentModes: ['behavioral', 'technical', 'system_design', 'portfolio', 'coding'],
        sourcePolicy: 'public_or_candidate_owned_or_tenant_approved_only',
        createdAt: now(),
      };
      record('role_intelligence.generated', 'job_description', job.id, tenantId, candidateId);
      return rolePack;
    },

    createPlan(input) {
      const value = ReadinessPlanInput.parse(input);
      const job = jobs.get(value.jobDescriptionId);
      if (!scope(job, value.tenantId, value.candidateId)) throw new Error('Authorized job description not found.');
      const plan = {
        id: id('cr-plan'), ...value, createdAt: now(), status: 'active', boundary: 'preparation_only', deviceChecklist: { completed: false, checks: ['camera', 'microphone', 'network', 'quiet_space', 'accessibility'] },
        milestones: job.competencies.map((competency, index) => ({ id: `milestone-${index + 1}`, competency, status: 'not_started', practiceMinutes: Math.max(30, Math.round((value.timeBudgetHours * 60) / job.competencies.length)), nextAction: `Create one truthful evidence story for ${competency}` })),
      };
      plans.set(plan.id, plan);
      record('readiness_plan.created', 'readiness_plan', plan.id, plan.tenantId, plan.candidateId, { coachingMode: plan.coachingMode });
      return plan;
    },

    updateMilestone({ tenantId, candidateId, planId, milestoneId, status }) {
      const plan = plans.get(planId);
      if (!scope(plan, tenantId, candidateId)) throw new Error('Readiness plan not found.');
      const milestone = plan.milestones.find((item) => item.id === milestoneId);
      if (!milestone) throw new Error('Milestone not found.');
      milestone.status = status;
      record('milestone.updated', 'readiness_plan', plan.id, tenantId, candidateId, { milestoneId, status });
      return plan;
    },

    addStory(input) {
      const story = { id: id('cr-story'), ...StoryInput.parse(input), createdAt: now() };
      stories.set(story.id, story);
      record('story.created', 'story', story.id, story.tenantId, story.candidateId, { competency: story.competency });
      return story;
    },

    createPracticeSession(input) {
      const value = PracticeSessionInput.parse(input);
      assertPreparationOnly(value);
      const plan = plans.get(value.planId);
      if (!scope(plan, value.tenantId, value.candidateId)) throw new Error('Readiness plan not found.');
      const session = { id: id('cr-practice'), ...value, createdAt: now(), feedback: practiceFeedback(value), liveAssessmentAccess: false };
      sessions.set(session.id, session);
      record('practice.completed', 'practice_session', session.id, session.tenantId, session.candidateId, { practiceMode: session.practiceMode, competency: session.competency });
      return session;
    },

    upsertCoach(input) {
      const coach = { ...CoachProfileInput.parse(input), updatedAt: now() };
      coaches.set(coach.coachId, coach);
      record('coach.upserted', 'coach_profile', coach.coachId, coach.tenantId, 'system', { verificationStatus: coach.verificationStatus });
      return coach;
    },

    matchCoaches({ tenantId, planId, language, timeZone }) {
      const plan = plans.get(planId);
      if (!plan || plan.tenantId !== tenantId) throw new Error('Readiness plan not found.');
      return [...coaches.values()]
        .filter((coach) => canCoachAccess({ coachProfile: coach, candidateTenantId: tenantId, coachTenantId: coach.tenantId }))
        .map((coach) => ({
          ...coach,
          matchReasons: [
            `Role preparation coverage: ${coach.specialties.join(', ')}`,
            coach.languages.includes(language) ? `Language match: ${language}` : `Language review needed: ${language}`,
            coach.timeZone === timeZone ? `Time-zone match: ${timeZone}` : 'Time-zone conversion available',
          ],
        }));
    },

    createBooking({ tenantId, candidateId, planId, coachId, slot, candidateApprovedAt }) {
      const plan = plans.get(planId);
      const coach = coaches.get(coachId);
      if (!scope(plan, tenantId, candidateId)) throw new Error('Readiness plan not found.');
      if (!candidateApprovedAt || !canCoachAccess({ coachProfile: coach, candidateTenantId: tenantId, coachTenantId: coach?.tenantId })) throw new Error('Verified coach and candidate approval are required.');
      const booking = { id: id('cr-booking'), tenantId, candidateId, planId, coachId, slot, status: 'requested', candidateApprovedAt, createdAt: now(), sessionType: 'preparation_only' };
      bookings.set(booking.id, booking);
      record('coach_booking.requested', 'coach_booking', booking.id, tenantId, candidateId, { coachId });
      return booking;
    },

    createHandoff(input) {
      const value = HandoffInput.parse(input);
      assertCandidateControlledShare(value);
      const plan = plans.get(value.planId);
      const coach = coaches.get(value.coachId);
      if (!scope(plan, value.tenantId, value.candidateId)) throw new Error('Readiness plan not found.');
      if (!canCoachAccess({ coachProfile: coach, candidateTenantId: value.tenantId, coachTenantId: coach?.tenantId })) throw new Error('Coach is not eligible for this handoff.');
      const handoff = { id: id('cr-handoff'), ...value, createdAt: now(), scope: 'candidate_selected_preparation_data_only', excluded: ['hiring_evaluation', 'employer_scorecards', 'confidential_interview_questions'] };
      handoffs.set(handoff.id, handoff);
      record('handoff.created', 'coach_handoff', handoff.id, handoff.tenantId, handoff.candidateId, { sharedFields: handoff.sharedFields });
      return handoff;
    },

    createOpportunity(input) {
      const opportunity = { id: id('cr-opportunity'), ...OpportunityInput.parse(input), createdAt: now(), updatedAt: now() };
      opportunities.set(opportunity.id, opportunity);
      record('opportunity.saved', 'opportunity', opportunity.id, opportunity.tenantId, opportunity.candidateId, { source: opportunity.source, verifiedSource: opportunity.verifiedSource });
      return opportunity;
    },

    createApplication(input) {
      const value = ApplicationInput.parse(input);
      const opportunity = opportunities.get(value.opportunityId);
      if (!scope(opportunity, value.tenantId, value.candidateId)) throw new Error('Opportunity not found.');
      const duplicate = [...applications.values()].find((item) => item.opportunityId === value.opportunityId && item.candidateId === value.candidateId && !['withdrawn', 'closed'].includes(item.status));
      if (duplicate) throw new Error('An active application already exists for this opportunity.');
      const application = { id: id('cr-application'), ...value, createdAt: now(), sourceReceipt: null, autoSubmitted: false };
      applications.set(application.id, application);
      record('application.review_requested', 'application', application.id, application.tenantId, application.candidateId, { opportunityId: application.opportunityId });
      return application;
    },

    createCampaign(input) {
      const campaign = { id: id('cr-campaign'), ...CampaignInput.parse(input), createdAt: now(), status: 'active', autoSubmitAllowed: false, policy: 'review_before_send_or_official_partner_api_only' };
      campaigns.set(campaign.id, campaign);
      record('campaign.created', 'application_campaign', campaign.id, campaign.tenantId, campaign.candidateId, { dailyLimit: campaign.dailyLimit, reviewBeforeSend: campaign.reviewBeforeSend });
      return campaign;
    },

    updateConsent(input) {
      const consent = { ...ConsentInput.parse(input), updatedAt: now() };
      consents.set(`${consent.tenantId}:${consent.candidateId}`, consent);
      record('consent.updated', 'candidate_consent', consent.candidateId, consent.tenantId, consent.candidateId);
      return consent;
    },

    markDeviceReady({ tenantId, candidateId, planId }) {
      const plan = plans.get(planId);
      if (!scope(plan, tenantId, candidateId)) throw new Error('Readiness plan not found.');
      plan.deviceChecklist.completed = true;
      record('device_check.completed', 'readiness_plan', plan.id, tenantId, candidateId);
      return plan;
    },

    getDashboard({ tenantId, candidateId }) {
      const profile = profiles.get(`${tenantId}:${candidateId}`) || null;
      const candidatePlans = [...plans.values()].filter((plan) => scope(plan, tenantId, candidateId));
      const plan = candidatePlans[0] || null;
      const candidateStories = [...stories.values()].filter((story) => scope(story, tenantId, candidateId));
      const candidateSessions = [...sessions.values()].filter((session) => scope(session, tenantId, candidateId));
      const job = plan ? jobs.get(plan.jobDescriptionId) : null;
      const candidateOpportunities = [...opportunities.values()].filter((opportunity) => scope(opportunity, tenantId, candidateId));
      const candidateApplications = [...applications.values()].filter((application) => application.tenantId === tenantId && application.candidateId === candidateId);
      const candidateCampaigns = [...campaigns.values()].filter((campaign) => campaign.tenantId === tenantId && campaign.candidateId === candidateId);
      const readiness = plan && job ? readinessBreakdown(plan, candidateStories, candidateSessions, job, profile) : null;
      return {
        profile, plan, job, readiness, stories: candidateStories, sessions: candidateSessions,
        opportunities: candidateOpportunities, applications: candidateApplications, campaigns: candidateCampaigns,
        consent: consents.get(`${tenantId}:${candidateId}`) || null,
        actionInbox: [
          ...(plan?.milestones || []).filter((milestone) => milestone.status !== 'complete').slice(0, 3).map((milestone) => ({ type: 'milestone', label: milestone.nextAction, priority: 'high' })),
          ...candidateApplications.filter((application) => application.status === 'review_required').map((application) => ({ type: 'application', label: 'Review application before submission', applicationId: application.id, priority: 'high' })),
        ],
      };
    },

    getPlan(planId, { tenantId, candidateId }) {
      const plan = plans.get(planId);
      if (!scope(plan, tenantId, candidateId)) return null;
      return plan;
    },

    exportCandidateData({ tenantId, candidateId }) {
      return {
        profile: profiles.get(`${tenantId}:${candidateId}`) || null,
        plans: [...plans.values()].filter((plan) => scope(plan, tenantId, candidateId)),
        stories: [...stories.values()].filter((story) => scope(story, tenantId, candidateId)),
        practiceSessions: [...sessions.values()].filter((session) => scope(session, tenantId, candidateId)),
        opportunities: [...opportunities.values()].filter((opportunity) => scope(opportunity, tenantId, candidateId)),
        applications: [...applications.values()].filter((application) => application.tenantId === tenantId && application.candidateId === candidateId),
        audit: audit.filter((entry) => entry.tenantId === tenantId && entry.candidateId === candidateId),
      };
    },
  };
}
