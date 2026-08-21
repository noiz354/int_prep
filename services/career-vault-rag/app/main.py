"""Career Vault RAG Career Coach — deterministic retrieval scaffold.

The RAG layer is the reasoning layer over the candidate-owned Career Timeline.
It never fabricates: every answer cites candidate-authorized, dated evidence or
explicitly abstains. This module is a local, deterministic implementation of the
retrieval/citation/abstention rules so the behaviour can be tested before a
tenant-isolated vector provider is approved.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Literal

MODEL_VERSION = "career-vault-rag-v0.1"
REQUIRES_HUMAN_JUDGMENT = True

FEEDBACK_THEMES = {
    "communication": ["structure", "concise", "clarity", "communication", "explain"],
    "technical_depth": ["technical", "depth", "architecture", "trade-off", "tradeoff", "system design"],
    "evidence": ["evidence", "metric", "outcome", "result", "impact", "measurable"],
    "role_fit": ["role fit", "fit", "seniority", "level", "experience"],
    "timing": ["timing", "pace", "deadline", "late", "speed"],
    "portfolio": ["portfolio", "project", "artifact", "repo"],
    "environment": ["environment", "setup", "camera", "microphone", "network", "lighting"],
}


@dataclass
class Evidence:
    artifact_id: str
    title: str
    kind: str
    content: str
    source: str
    date: str
    tenant_id: str = ""
    candidate_id: str = ""
    competency: str = ""
    opportunity_id: str = ""


@dataclass
class RagRequest:
    tenant_id: str
    candidate_id: str
    session_context: Literal["preparation", "career_planning", "live_assessment"]
    question: str
    evidence: list[Evidence] = field(default_factory=list)
    opportunity_id: str | None = None


@dataclass
class Citation:
    artifact_id: str
    title: str
    date: str
    excerpt: str
    reason: str


def assert_career_planning_context(request: RagRequest) -> None:
    if request.session_context not in ("preparation", "career_planning"):
        raise PermissionError("Career Coach is not available during a live hiring assessment.")


def _excluded(evidence: Evidence) -> bool:
    # The API layer enforces the exclusion list; the RAG layer also treats
    # missing/blank content as non-retrievable.
    return not evidence.content.strip()


def _score(evidence: Evidence, tokens: set[str]) -> int:
    """Hybrid-ish deterministic score: structured filter + keyword overlap + recency + source quality."""
    haystack = f"{evidence.title} {evidence.content} {evidence.competency} {evidence.opportunity_id or ''}".lower()
    overlap = len(tokens & set(haystack.split()))
    metadata_bonus = 0
    for token in tokens:
        if token in evidence.title.lower() or token in evidence.competency.lower():
            metadata_bonus += 2
    source_quality = {"candidate_entered": 1, "email_import": 2, "calendar_import": 2, "coach_shared": 3, "practice_artifact": 2, "approved_connector": 3}.get(evidence.source, 1)
    return overlap * 10 + metadata_bonus + source_quality


def retrieve(request: RagRequest, limit: int = 6) -> list[tuple[Evidence, int]]:
    """Return (evidence, score) ranked by relevance, tenant/candidate-scoped by construction."""
    assert_career_planning_context(request)
    tokens = {word.strip(".,?!;:()") for word in request.question.lower().split() if len(word.strip(".,?!;:()")) > 2}
    ranked = []
    for evidence in request.evidence:
        if evidence.tenant_id != request.tenant_id or evidence.candidate_id != request.candidate_id:
            continue
        if _excluded(evidence):
            continue
        if request.opportunity_id and evidence.opportunity_id and evidence.opportunity_id != request.opportunity_id:
            continue
        ranked.append((evidence, _score(evidence, tokens)))
    ranked.sort(key=lambda item: item[1], reverse=True)
    return ranked[:limit]


def _cite(evidence: Evidence, reason: str) -> dict:
    excerpt = evidence.content.strip().replace("\n", " ")[:220]
    return {
        "artifact_id": evidence.artifact_id,
        "title": evidence.title,
        "date": evidence.date,
        "excerpt": excerpt,
        "reason": reason,
    }


def cluster_feedback_themes(evidence_list: list[Evidence]) -> list[dict]:
    """PRD E-31: feedback-theme clustering with candidate-visible pattern summary."""
    themes = {theme: {"count": 0, "examples": []} for theme in FEEDBACK_THEMES}
    for evidence in evidence_list:
        if evidence.kind not in ("feedback", "note"):
            continue
        text = f"{evidence.title} {evidence.content}".lower()
        for theme, keywords in FEEDBACK_THEMES.items():
            if any(keyword in text for keyword in keywords):
                themes[theme]["count"] += 1
                if len(themes[theme]["examples"]) < 3:
                    themes[theme]["examples"].append({"artifact_id": evidence.artifact_id, "date": evidence.date, "excerpt": evidence.content.strip()[:120]})
    return [
        {"theme": theme, "count": data["count"], "examples": data["examples"]}
        for theme, data in themes.items()
        if data["count"] > 0
    ]


def answer_question(request: RagRequest) -> dict:
    """PRD §8: cited answer or abstention."""
    assert_career_planning_context(request)
    ranked = retrieve(request)
    if not ranked:
        return {
            "answer": None,
            "abstention": True,
            "reason": "insufficient_permitted_evidence",
            "message": "There is not enough candidate-authorized evidence to answer that. Add notes, feedback, or practice records, or ask a human coach.",
            "citations": [],
            "suggestedNextAction": "Add candidate-owned feedback/notes or request human coaching.",
            "confidence": 0.0,
            "modelVersion": MODEL_VERSION,
            "provider": "deterministic-fallback",
            "retrieval": "local-keyword",
            "fallback": True,
            "requiresHumanJudgment": REQUIRES_HUMAN_JUDGMENT,
        }
    top = ranked[0][0]
    # Low overlap means weak grounding: abstain rather than fabricate.
    if ranked[0][1] < 14:
        return {
            "answer": None,
            "abstention": True,
            "reason": "low_grounding",
            "message": "The available candidate-authorized evidence is not specific enough to answer that. Add relevant notes or feedback, or ask a human coach.",
            "citations": [_cite(top, "low relevance candidate evidence")],
            "suggestedNextAction": "Capture more candidate-owned evidence or request human coaching.",
            "confidence": 0.2,
            "modelVersion": MODEL_VERSION,
            "provider": "deterministic-fallback",
            "retrieval": "local-keyword",
            "fallback": True,
            "requiresHumanJudgment": REQUIRES_HUMAN_JUDGMENT,
        }
    citations = [_cite(evidence, f"score {score}") for evidence, score in ranked[:3]]
    confidence = min(0.95, 0.4 + ranked[0][1] / 100)
    return {
        "answer": f"Based on your candidate-owned records, the most relevant evidence is '{top.title}' ({top.date}). "
                  f"This is a {top.kind} record from {top.source}.",
        "abstention": False,
        "citations": citations,
        "confidence": round(confidence, 2),
        "factVsReflection": {
            "fact": top.content.strip()[:160],
            "reflection": "Candidate-owned records may include personal reflection; verify before acting.",
            "inference": "This answer is an AI inference over candidate-authorized evidence only.",
        },
        "modelVersion": MODEL_VERSION,
        "requiresHumanJudgment": REQUIRES_HUMAN_JUDGMENT,
    }


def create_seven_day_plan(request: RagRequest, target_opportunity_id: str | None = None) -> dict:
    """PRD E-34: seven-day preparation plan grounded in role, feedback, practice, and calendar evidence."""
    assert_career_planning_context(request)
    plan_request = request
    if target_opportunity_id:
        plan_request = RagRequest(**{**request.__dict__, "opportunity_id": target_opportunity_id})
    ranked = retrieve(plan_request, limit=8)
    if not ranked:
        return {
            "plan": None,
            "abstention": True,
            "reason": "insufficient_permitted_evidence",
            "message": "No candidate-authorized evidence is available to ground a seven-day plan.",
            "citations": [],
            "suggestedNextAction": "Save a target opportunity and add notes/feedback first.",
            "confidence": 0.0,
            "modelVersion": MODEL_VERSION,
            "provider": "deterministic-fallback",
            "retrieval": "local-keyword",
            "fallback": True,
            "requiresHumanJudgment": REQUIRES_HUMAN_JUDGMENT,
        }
    themes = cluster_feedback_themes(request.evidence)
    citations = [_cite(evidence, f"plan evidence score {score}") for evidence, score in ranked[:4]]
    focus = themes[0]["theme"] if themes else "general"
    return {
        "plan": {
            "days": [
                {"day": 1, "focus": f"Address '{focus}' feedback theme", "action": "Review the cited feedback and rewrite one answer with concrete evidence."},
                {"day": 2, "focus": "Role requirements", "action": "Map the target role's requirements to candidate-owned stories."},
                {"day": 3, "focus": "Practice", "action": "Run one timed practice session and capture a note."},
                {"day": 4, "focus": "Feedback closure", "action": "Re-answer the highest-priority feedback item and compare."},
                {"day": 5, "focus": "Portfolio/evidence", "action": "Select the portfolio item that best demonstrates the role's core competency."},
                {"day": 6, "focus": "Mock interview", "action": "Complete a mock with a human coach or AI, then log the result."},
                {"day": 7, "focus": "Review and plan", "action": "Review the week's evidence and update the action inbox."},
            ],
            "basedOn": [dict(c) for c in citations],
            "nextActions": [
                {"type": "practice", "label": f"Complete a practice session focused on '{focus}'"},
                {"type": "evidence", "label": "Add one measurable outcome to a candidate story"},
                {"type": "human", "label": "Request a human coach review if evidence is conflicting"},
            ],
        },
        "abstention": False,
        "citations": citations,
        "confidence": 0.7,
        "modelVersion": MODEL_VERSION,
        "requiresHumanJudgment": REQUIRES_HUMAN_JUDGMENT,
    }
