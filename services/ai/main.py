"""Consent-aware, deterministic Python AI adapter for the vertical slice.

Replace the rule-based functions with an approved provider/model gateway in
production. The API deliberately returns assistive recommendations only; it
never returns an automated hiring disposition.

Run locally on its unique port (default 8788, override with AI_PORT):

    AI_PORT=8788 uvicorn main:app --host 0.0.0.0 --port "${AI_PORT:-8788}"
"""
import os
from datetime import datetime, timezone
from typing import Literal
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

MODEL_VERSION = "signal-reasoner-demo-4.2"
app = FastAPI(title="SignalRoom AI Adapter", version="0.1.0")

class CopilotRequest(BaseModel):
    tenant_id: str = Field(min_length=1)
    interview_id: str = Field(min_length=1)
    consent_for_ai: bool
    uncovered_competencies: list[str] = []
    transcript_excerpt: str = Field(min_length=1, max_length=6000)

class IntegrityRequest(BaseModel):
    tenant_id: str = Field(min_length=1)
    interview_id: str = Field(min_length=1)
    consent_for_integrity_processing: bool
    indicators: dict[str, float] = {}

class TranscriptRequest(BaseModel):
    tenant_id: str
    interview_id: str
    consent_for_transcription: bool
    audio_reference: str
    language: str = "en"


def require_tenant(header_tenant: str | None, tenant_id: str) -> None:
    if header_tenant and header_tenant != tenant_id:
        raise HTTPException(status_code=403, detail="Tenant context mismatch")

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "ai-adapter",
        "model_version": MODEL_VERSION,
        "port": int(os.environ.get("AI_PORT", "8788")),
    }

@app.post("/v1/copilot/suggest")
def suggest(request: CopilotRequest, x_tenant_id: str | None = Header(default=None)):
    require_tenant(x_tenant_id, request.tenant_id)
    if not request.consent_for_ai:
        raise HTTPException(status_code=409, detail="AI processing consent is required")
    competency = request.uncovered_competencies[0] if request.uncovered_competencies else "the remaining rubric area"
    lower = request.transcript_excerpt.lower()
    if "offline" in lower or "network" in lower:
        question = f"For {competency}, how would you reconcile a local edit with a newer remote edit without silently losing intent?"
    else:
        question = f"Could you describe a concrete example that demonstrates {competency}, including the trade-off you made?"
    return {
        "recommendation_type": "neutral_follow_up",
        "question": question,
        "grounded_in": ["approved_rubric", "candidate_transcript_excerpt"],
        "confidence": 0.84,
        "requires_human_judgment": True,
        "model_version": MODEL_VERSION,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

@app.post("/v1/transcription/segment")
def transcribe(request: TranscriptRequest, x_tenant_id: str | None = Header(default=None)):
    require_tenant(x_tenant_id, request.tenant_id)
    if not request.consent_for_transcription:
        raise HTTPException(status_code=409, detail="Transcription consent is required")
    return {
        "status": "accepted",
        "job_id": f"tr-{request.interview_id}-{int(datetime.now().timestamp())}",
        "language": request.language,
        "speaker_diarization": True,
        "word_timestamps": True,
        "artifact_reference": request.audio_reference,
    }

@app.post("/v1/integrity/analyze")
def analyze_integrity(request: IntegrityRequest, x_tenant_id: str | None = Header(default=None)):
    require_tenant(x_tenant_id, request.tenant_id)
    if not request.consent_for_integrity_processing:
        raise HTTPException(status_code=409, detail="Integrity processing consent is required")
    weighted = sum(max(0.0, min(value, 1.0)) for value in request.indicators.values()) / max(len(request.indicators), 1)
    level: Literal["low", "review", "elevated"] = "low" if weighted < .35 else "review" if weighted < .7 else "elevated"
    return {
        "risk_level": level,
        "score": round(weighted, 2),
        "action": "Route to trained human reviewer" if level != "low" else "No action required",
        "automated_decision": False,
        "model_version": MODEL_VERSION,
    }
