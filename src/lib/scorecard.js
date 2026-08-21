export function calculateScorecard(criteria) {
  const scorable = criteria.filter((criterion) => Number.isFinite(criterion.score));
  const totalWeight = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  const earnedWeight = scorable.reduce((sum, criterion) => sum + criterion.weight, 0);
  const weightedScore = scorable.reduce((sum, criterion) => sum + criterion.score * criterion.weight, 0);

  return {
    completeness: totalWeight ? Math.round((earnedWeight / totalWeight) * 100) : 0,
    average: earnedWeight ? Number((weightedScore / earnedWeight).toFixed(1)) : 0,
    missing: criteria.filter((criterion) => !Number.isFinite(criterion.score)),
  };
}

export function recommendationFor(scorecard) {
  if (scorecard.completeness < 100) return 'Needs evidence';
  if (scorecard.average >= 4.2) return 'Strong hire';
  if (scorecard.average >= 3.2) return 'Hire';
  if (scorecard.average >= 2.5) return 'Mixed signal';
  return 'No hire';
}
