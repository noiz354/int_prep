import { randomUUID } from 'node:crypto';

const MODEL_VERSION = 'career-vault-rag-v0.1';
const FEEDBACK_THEMES = {
  communication: ['structure', 'concise', 'clarity', 'communication', 'explain'],
  technical_depth: ['technical', 'depth', 'architecture', 'trade-off', 'tradeoff', 'system design'],
  evidence: ['evidence', 'metric', 'outcome', 'result', 'impact', 'measurable'],
  role_fit: ['role fit', 'fit', 'seniority', 'level', 'experience'],
  timing: ['timing', 'pace', 'deadline', 'late', 'speed'],
  portfolio: ['portfolio', 'project', 'artifact', 'repo'],
  environment: ['environment', 'setup', 'camera', 'microphone', 'network', 'lighting'],
};
const SOURCE_QUALITY = { candidate_entered: 1, email_import: 2, calendar_import: 2, coach_shared: 3, practice_artifact: 2, approved_connector: 3 };

export function createRagService() {
  const tokens = (text) => new Set(String(text || '').toLowerCase().split(/\W+/).filter((word) => word.length > 2));

  function scopeCheck(evidence, tenantId, candidateId) {
    return evidence.tenantId === tenantId && evidence.candidateId === candidateId;
  }

  function score(evidence, queryTokens) {
    const haystack = `${evidence.title} ${evidence.content} ${evidence.competency || ''} ${evidence.opportunityId || ''}`.toLowerCase();
    const overlap = [...queryTokens].filter((token) => haystack.includes(token)).length;
    let metadataBonus = 0;
    for (const token of queryTokens) {
      if ((evidence.title || '').toLowerCase().includes(token) || (evidence.competency || '').toLowerCase().includes(token)) metadataBonus += 2;
    }
    return overlap * 10 + metadataBonus + (SOURCE_QUALITY[evidence.source] || 1);
  }

  function retrieve({ tenantId, candidateId, question, evidence, opportunityId, limit = 6 }) {
    const queryTokens = tokens(question);
    return evidence
      .filter((item) => scopeCheck(item, tenantId, candidateId))
      .filter((item) => String(item.content || '').trim().length > 0)
      .filter((item) => !opportunityId || !item.opportunityId || item.opportunityId === opportunityId)
      .map((item) => ({ evidence: item, score: score(item, queryTokens) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  const cite = (evidence, reason) => ({
    artifact_id: evidence.artifactId,
    title: evidence.title,
    date: evidence.date,
    excerpt: String(evidence.content || '').trim().replace(/\s+/g, ' ').slice(0, 220),
    reason,
  });

  return {
    clusterFeedbackThemes(evidenceList) {
      const themes = Object.fromEntries(Object.keys(FEEDBACK_THEMES).map((theme) => [theme, { count: 0, examples: [] }]));
      for (const evidence of evidenceList) {
        if (!['feedback', 'note'].includes(evidence.kind)) continue;
        const text = `${evidence.title} ${evidence.content}`.toLowerCase();
        for (const [theme, keywords] of Object.entries(FEEDBACK_THEMES)) {
          if (keywords.some((keyword) => text.includes(keyword))) {
            themes[theme].count += 1;
            if (themes[theme].examples.length < 3) {
              themes[theme].examples.push({ artifact_id: evidence.artifactId, date: evidence.date, excerpt: String(evidence.content || '').trim().slice(0, 120) });
            }
          }
        }
      }
      return Object.entries(themes)
        .filter(([, data]) => data.count > 0)
        .map(([theme, data]) => ({ theme, count: data.count, examples: data.examples }));
    },

    ask({ tenantId, candidateId, sessionContext, question, evidence, opportunityId }) {
      if (sessionContext === 'live_assessment') throw new Error('Career Coach is not available during a live hiring assessment.');
      const ranked = retrieve({ tenantId, candidateId, question, evidence, opportunityId });
      if (!ranked.length) {
        return { answer: null, abstention: true, reason: 'insufficient_permitted_evidence', message: 'There is not enough candidate-authorized evidence to answer that. Add notes, feedback, or practice records, or ask a human coach.', citations: [], suggestedNextAction: 'Add candidate-owned feedback/notes or request human coaching.', confidence: 0, modelVersion: MODEL_VERSION, requiresHumanJudgment: true };
      }
      const top = ranked[0].evidence;
      if (ranked[0].score < 14) {
        return { answer: null, abstention: true, reason: 'low_grounding', message: 'The available candidate-authorized evidence is not specific enough to answer that. Add relevant notes or feedback, or ask a human coach.', citations: [cite(top, 'low relevance candidate evidence')], suggestedNextAction: 'Capture more candidate-owned evidence or request human coaching.', confidence: 0.2, modelVersion: MODEL_VERSION, requiresHumanJudgment: true };
      }
      return {
        answer: `Based on your candidate-owned records, the most relevant evidence is '${top.title}' (${top.date}). This is a ${top.kind} record from ${top.source}.`,
        abstention: false,
        citations: ranked.slice(0, 3).map(({ evidence, score: s }) => cite(evidence, `score ${s}`)),
        confidence: Math.min(0.95, Math.round((0.4 + ranked[0].score / 100) * 100) / 100),
        factVsReflection: { fact: String(top.content || '').trim().slice(0, 160), reflection: 'Candidate-owned records may include personal reflection; verify before acting.', inference: 'This answer is an AI inference over candidate-authorized evidence only.' },
        modelVersion: MODEL_VERSION,
        requiresHumanJudgment: true,
      };
    },

    createSevenDayPlan({ tenantId, candidateId, sessionContext, evidence, targetOpportunityId }) {
      if (sessionContext === 'live_assessment') throw new Error('Career Coach is not available during a live hiring assessment.');
      const ranked = retrieve({ tenantId, candidateId, question: 'create a seven day preparation plan', evidence, opportunityId: targetOpportunityId, limit: 8 });
      if (!ranked.length) {
        return { plan: null, abstention: true, reason: 'insufficient_permitted_evidence', message: 'No candidate-authorized evidence is available to ground a seven-day plan.', citations: [], suggestedNextAction: 'Save a target opportunity and add notes/feedback first.', confidence: 0, modelVersion: MODEL_VERSION, requiresHumanJudgment: true };
      }
      const themes = this.clusterFeedbackThemes(evidence);
      const citations = ranked.slice(0, 4).map(({ evidence: item, score: s }) => cite(item, `plan evidence score ${s}`));
      const focus = themes[0]?.theme || 'general';
      return {
        plan: {
          days: [
            { day: 1, focus: `Address '${focus}' feedback theme`, action: 'Review the cited feedback and rewrite one answer with concrete evidence.' },
            { day: 2, focus: 'Role requirements', action: 'Map the target role requirements to candidate-owned stories.' },
            { day: 3, focus: 'Practice', action: 'Run one timed practice session and capture a note.' },
            { day: 4, focus: 'Feedback closure', action: 'Re-answer the highest-priority feedback item and compare.' },
            { day: 5, focus: 'Portfolio/evidence', action: 'Select the portfolio item that best demonstrates the role core competency.' },
            { day: 6, focus: 'Mock interview', action: 'Complete a mock with a human coach or AI, then log the result.' },
            { day: 7, focus: 'Review and plan', action: 'Review the week evidence and update the action inbox.' },
          ],
          basedOn: citations,
          nextActions: [
            { type: 'practice', label: `Complete a practice session focused on '${focus}'` },
            { type: 'evidence', label: 'Add one measurable outcome to a candidate story' },
            { type: 'human', label: 'Request a human coach review if evidence is conflicting' },
          ],
        },
        abstention: false,
        citations,
        confidence: 0.7,
        modelVersion: MODEL_VERSION,
        requiresHumanJudgment: true,
      };
    },
  };
}

export const ragModelVersion = MODEL_VERSION;
export const ragId = (prefix) => `${prefix}-${randomUUID().slice(0, 8)}`;
