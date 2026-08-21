"""FastAPI wrapper around the deterministic Career Vault RAG Career Coach.

Exposes /v1/rag/ask and /v1/rag/plan with tenant/candidate context, consent
gate, and preparation-only lockout. Raw transcripts/recordings/email content
are never logged; only citations and excerpts are returned.
"""

import os

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from .main import (
    Evidence,
    RagRequest,
    answer_question,
    assert_career_planning_context,
    create_seven_day_plan,
    retrieve,
    cluster_feedback_themes,
    MODEL_VERSION,
)

app = FastAPI(title="SignalRoom Compass Vault RAG", version="0.1.0")


class EvidenceIn(BaseModel):
    artifact_id: str = Field(min_length=1)
    title: str = Field(min_length=2, max_length=180)
    kind: str = Field(min_length=2)
    content: str = Field(default="", max_length=50_000)
    source: str = Field(default="candidate_entered")
    date: str = Field(min_length=1)
    tenant_id: str = Field(default="")
    candidate_id: str = Field(default="")
    competency: str = Field(default="", max_length=100)
    opportunity_id: str | None = None


class AskRequest(BaseModel):
    tenant_id: str = Field(min_length=1)
    candidate_id: str = Field(min_length=1)
    session_context: str = Field(default="career_planning")
    question: str = Field(min_length=3, max_length=1000)
    evidence: list[EvidenceIn] = Field(default_factory=list, max_length=200)
    opportunity_id: str | None = None


class PlanRequest(BaseModel):
    tenant_id: str = Field(min_length=1)
    candidate_id: str = Field(min_length=1)
    session_context: str = Field(default="career_planning")
    evidence: list[EvidenceIn] = Field(default_factory=list, max_length=200)
    target_opportunity_id: str | None = None


def _to_evidence(items: list[EvidenceIn]) -> list[Evidence]:
    return [Evidence(**item.model_dump()) for item in items]

def _gate(request, x_tenant_id: str | None, x_actor_id: str | None, x_actor_role: str | None) -> None:
    if not x_tenant_id or not x_actor_id or not x_actor_role:
        raise HTTPException(status_code=401, detail="Tenant, actor, and role context are required.")
    if x_tenant_id != request.tenant_id:
        raise HTTPException(status_code=403, detail="Tenant context mismatch.")
    if x_actor_id != request.candidate_id or x_actor_role != "candidate":
        raise HTTPException(status_code=403, detail="Career Vault is candidate-private by default.")
    try:
        assert_career_planning_context(RagRequest(**request.model_dump(), evidence=[]))
    except PermissionError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc


@app.get("/health")
def health():
    return {"status": "ok", "service": "career-vault-rag", "model_version": MODEL_VERSION, "boundary": "candidate_private_default"}


@app.post("/v1/rag/ask")
def ask(request: AskRequest, x_tenant_id: str | None = Header(default=None), x_actor_id: str | None = Header(default=None), x_actor_role: str | None = Header(default=None)):
    _gate(request, x_tenant_id, x_actor_id, x_actor_role)
    rag_request = RagRequest(tenant_id=request.tenant_id, candidate_id=request.candidate_id, session_context=request.session_context, question=request.question, evidence=_to_evidence(request.evidence), opportunity_id=request.opportunity_id)
    return answer_question(rag_request)


@app.post("/v1/rag/plan")
def plan(request: PlanRequest, x_tenant_id: str | None = Header(default=None), x_actor_id: str | None = Header(default=None), x_actor_role: str | None = Header(default=None)):
    _gate(request, x_tenant_id, x_actor_id, x_actor_role)
    rag_request = RagRequest(tenant_id=request.tenant_id, candidate_id=request.candidate_id, session_context=request.session_context, question="create a seven day preparation plan", evidence=_to_evidence(request.evidence))
    return create_seven_day_plan(rag_request, target_opportunity_id=request.target_opportunity_id)
