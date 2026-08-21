export function calculateScorecard(criteria = []) {
  const totalWeight = criteria.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  const complete = criteria.filter((item) => Number.isFinite(item.score));
  const completedWeight = complete.reduce((sum, item) => sum + Number(item.weight || 0), 0);
  const weighted = complete.reduce((sum, item) => sum + Number(item.score) * Number(item.weight || 0), 0);
  const completeness = totalWeight ? Math.round((completedWeight / totalWeight) * 100) : 0;
  return {
    completeness,
    average: completedWeight ? Number((weighted / completedWeight).toFixed(1)) : 0,
    recommendation: completeness < 100 ? 'Needs evidence' : weighted / completedWeight >= 4.2 ? 'Strong hire' : weighted / completedWeight >= 3.2 ? 'Hire' : weighted / completedWeight >= 2.5 ? 'Mixed signal' : 'No hire',
  };
}

export function validateScorecard(body) {
  if (!Array.isArray(body?.criteria) || body.criteria.length === 0) return 'criteria must be a non-empty array';
  if (body.criteria.some((item) => !item.id || !Number.isFinite(item.weight))) return 'each criterion requires an id and numeric weight';
  return null;
}

export function newInterview({ candidateName, role, stage, scheduledAt, tenantId }) {
  if (!candidateName?.trim() || !role?.trim() || !stage?.trim()) {
    throw new Error('candidateName, role, and stage are required');
  }
  return {
    id: `int-${crypto.randomUUID().slice(0, 8)}`,
    tenantId,
    candidateName: candidateName.trim(),
    role: role.trim(),
    stage: stage.trim(),
    scheduledAt: scheduledAt || new Date(Date.now() + 86400000).toISOString(),
    status: 'draft',
    scorecards: [],
    createdAt: new Date().toISOString(),
  };
}
