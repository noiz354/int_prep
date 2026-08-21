"""Candidate readiness AI scaffold.

Preparation-only, consent-gated, source-labelled coaching. This module uses
safe deterministic behavior until an approved tenant-isolated model/RAG/ASR
provider, evaluation suite, and human-review workflow are configured.
"""
from datetime import datetime, timezone
from typing import Literal
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from otel_logging import get_logger, log_event

logger = get_logger("candidate-coaching-ai")

MODEL_VERSION = "candidate-readiness-demo-v2"
app = FastAPI(title="SignalRoom Ready AI", version="0.2.0")

class PreparationContext(BaseModel):
    tenant_id: str = Field(min_length=1)
    candidate_id: str = Field(min_length=1)
    plan_id: str = Field(min_length=1)
    session_context: Literal["preparation"]
    consent_for_ai: bool
    authorized_source_ids: list[str] = Field(min_length=1, max_length=10)

class RoleIntelligenceRequest(PreparationContext):
    role_title: str = Field(min_length=2, max_length=180)
    competencies: list[str] = Field(min_length=1, max_length=20)
    stack: list[str] = Field(default_factory=list, max_length=30)

class QuestionRequest(PreparationContext):
    competency: str = Field(min_length=2, max_length=120)
    practice_mode: Literal["behavioral", "technical", "system_design", "portfolio", "coding"]

class FeedbackRequest(PreparationContext):
    competency: str = Field(min_length=2, max_length=120)
    answer: str = Field(min_length=1, max_length=8000)

class HandoffRequest(PreparationContext):
    selected_fields: list[Literal["goals", "milestones", "practiceEvidence", "accessibilityPreferences", "storyLibrary"]] = Field(min_length=1)

class MaterialRequest(PreparationContext):
    topics: list[str] = Field(min_length=1, max_length=20)


def assert_safe_context(context: PreparationContext, header_tenant: str | None):
    if header_tenant and header_tenant != context.tenant_id:
        raise HTTPException(status_code=403, detail="Tenant context mismatch")
    if context.session_context != "preparation":
        raise HTTPException(status_code=409, detail="AI coaching is unavailable during a live hiring assessment")
    if not context.consent_for_ai:
        raise HTTPException(status_code=409, detail="Explicit AI preparation consent is required")

@app.get("/health")
def health():
    return {"status": "ok", "service": "candidate-coaching-ai", "model_version": MODEL_VERSION, "boundary": "preparation_only"}

@app.post("/v1/role-intelligence")
def role_intelligence(request: RoleIntelligenceRequest, x_tenant_id: str | None = Header(default=None)):
    assert_safe_context(request, x_tenant_id)
    log_event(logger, "coaching.role_intelligence", tenant_id=request.tenant_id, competency_count=len(request.competencies))
    return {
        "role_title": request.role_title,
        "skill_map": [{"skill": item, "practice_focus": "explain a truthful example, constraints, trade-offs, and validation"} for item in request.competencies],
        "stack_map": request.stack,
        "communication_blueprint": ["Context → Constraints → Approach → Trade-offs → Validation", "Situation → Task → Action → Result → Reflection"],
        "assessment_modes": ["behavioral", "technical", "system_design", "portfolio", "coding"],
        "sources": request.authorized_source_ids,
        "requires_human_judgment": True,
        "usage_boundary": "practice_only_not_for_live_assessment",
        "model_version": MODEL_VERSION,
    }

@app.post("/v1/materials")
def materials(request: MaterialRequest, x_tenant_id: str | None = Header(default=None)):
    assert_safe_context(request, x_tenant_id)
    return {
        "materials": [{"topic": topic, "recommendation": "Use public, official, or tenant-approved documentation only.", "source_policy": "no leaked questions or confidential employer material"} for topic in request.topics],
        "sources": request.authorized_source_ids,
        "model_version": MODEL_VERSION,
    }

@app.post("/v1/practice/question")
def practice_question(request: QuestionRequest, x_tenant_id: str | None = Header(default=None)):
    assert_safe_context(request, x_tenant_id)
    prompts = {
        "behavioral": f"Tell a concise STAR story that demonstrates {request.competency}. What was your measurable contribution?",
        "technical": f"Explain how you would approach {request.competency}. State assumptions, trade-offs, and how you would validate the result.",
        "system_design": f"Design a system relevant to {request.competency}. How would it behave during failure or growth?",
        "portfolio": f"Choose a portfolio example demonstrating {request.competency}. Why does it matter for this role?",
        "coding": f"Write a small practice solution related to {request.competency}. Explain correctness, edge cases, and complexity.",
    }
    return {
        "question": prompts[request.practice_mode],
        "sources": request.authorized_source_ids,
        "model_version": MODEL_VERSION,
        "confidence": 0.78,
        "requires_human_judgment": True,
        "usage_boundary": "practice_only_not_for_live_assessment",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

@app.post("/v1/practice/feedback")
def practice_feedback(request: FeedbackRequest, x_tenant_id: str | None = Header(default=None)):
    assert_safe_context(request, x_tenant_id)
    word_count = len(request.answer.split())
    has_outcome = any(term in request.answer.lower() for term in ["result", "impact", "improved", "reduced", "increased", "%"])
    has_tradeoff = any(term in request.answer.lower() for term in ["trade-off", "constraint", "however", "risk", "alternative"])
    has_validation = any(term in request.answer.lower() for term in ["test", "monitor", "measure", "validate", "metric"])
    log_event(logger, "coaching.practice_feedback", tenant_id=request.tenant_id, mode=request.practice_mode, word_count=word_count, has_outcome=has_outcome)
    return {
        "feedback": [
            {"area": "evidence", "observation": "Add a concrete outcome, decision, or metric from your own experience."},
            {"area": "structure", "observation": "Use situation, task, action, result, and reflection to keep the answer easy to follow."},
            {"area": "relevance", "observation": f"Link the example directly to {request.competency}."},
        ],
        "answer_stats": {"word_count": word_count, "has_outcome": has_outcome, "has_tradeoff": has_tradeoff, "has_validation": has_validation},
        "confidence": 0.66,
        "limitations": ["This is preparation feedback, not a hiring assessment.", "No personality, protected-trait, or employability inference is made."],
        "requires_human_judgment": True,
        "model_version": MODEL_VERSION,
    }

@app.post("/v1/handoff/summary")
def handoff_summary(request: HandoffRequest, x_tenant_id: str | None = Header(default=None)):
    assert_safe_context(request, x_tenant_id)
    return {
        "candidate_review_required": True,
        "selected_fields": request.selected_fields,
        "summary": "Candidate-controlled preparation summary. Share only after candidate confirmation.",
        "excluded": ["employer evaluation data", "live interview scorecards", "confidential interview questions"],
        "model_version": MODEL_VERSION,
    }
