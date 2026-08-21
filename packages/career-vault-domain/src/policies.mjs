export class BoundaryViolationError extends Error {
  constructor(message) { super(message); this.name = 'BoundaryViolationError'; }
}

export class AccessDeniedError extends Error {
  constructor(message) { super(message); this.name = 'AccessDeniedError'; }
}

export function assertCareerPlanningContext({ sessionContext }) {
  if (sessionContext !== 'preparation' && sessionContext !== 'career_planning') {
    throw new BoundaryViolationError('Career Vault and RAG planning tools are not available during a live hiring assessment.');
  }
  return true;
}

export function assertCandidatePrivateDefault({ candidateId, actorId }) {
  if (!candidateId || actorId !== candidateId) {
    throw new AccessDeniedError('Candidate vault data is private to the candidate by default.');
  }
  return true;
}

export function assertExplicitShare({ candidateApprovedAt, fields, artifactIds }) {
  if (!candidateApprovedAt || !fields?.length || !artifactIds?.length) {
    throw new AccessDeniedError('An explicit, time-stamped, granular candidate sharing choice is required.');
  }
  return true;
}
