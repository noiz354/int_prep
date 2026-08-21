export class BoundaryViolationError extends Error {
  constructor(message) { super(message); this.name = 'BoundaryViolationError'; }
}

export function assertPreparationOnly({ sessionContext, consentForAi = false, sourceApproval }) {
  if (sessionContext !== 'preparation') {
    throw new BoundaryViolationError('Candidate readiness tools are not available during a live hiring assessment.');
  }
  if (sourceApproval && !['candidate_owned', 'tenant_approved', 'admin_approved'].includes(sourceApproval)) {
    throw new BoundaryViolationError('The job-description source is not approved for preparation use.');
  }
  return { preparationOnly: true, consentForAi: Boolean(consentForAi) };
}

export function assertCandidateControlledShare({ candidateId, candidateApprovedAt, sharedFields }) {
  if (!candidateId || !candidateApprovedAt || !sharedFields?.length) {
    throw new BoundaryViolationError('A candidate-controlled, time-stamped sharing choice is required.');
  }
  return true;
}

export function canCoachAccess({ coachProfile, candidateTenantId, coachTenantId }) {
  return coachProfile?.verificationStatus === 'verified'
    && candidateTenantId === coachTenantId
    && !coachProfile.conflictDeclarations?.includes('blocked');
}
