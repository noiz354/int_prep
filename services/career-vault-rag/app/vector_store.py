"""Qdrant vector store adapter for Career Vault RAG.

Provides vector search via Qdrant with Ollama embeddings, tenant/candidate
scoping via payload filters, and a deterministic fallback when Qdrant is
unavailable.
"""

import hashlib
import os
import time
from dataclasses import dataclass, field
from typing import Any

import httpx
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    FieldCondition,
    Filter,
    MatchValue,
    PointStruct,
    VectorParams,
)

COLLECTION_NAME = "career_vault_artifacts"
DEFAULT_VECTOR_DIM = 384  # nomic-embed-text default
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://172.24.16.1:11434")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:8799")


def _hash_tenant(tenant_id: str) -> str:
    return hashlib.sha256(tenant_id.encode()).hexdigest()[:8]


def _content_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()[:16]


@dataclass
class VectorHit:
    point_id: str
    score: float
    payload: dict[str, Any]


class VectorStore:
    """Qdrant-backed vector store with Ollama embedding and deterministic fallback."""

    def __init__(self, qdrant_url: str | None = None, ollama_url: str | None = None):
        self._qdrant_url = qdrant_url or QDRANT_URL
        self._ollama_url = ollama_url or OLLAMA_BASE_URL
        self._client: QdrantClient | None = None
        self._available = False

    def _get_client(self) -> QdrantClient:
        if self._client is None:
            self._client = QdrantClient(url=self._qdrant_url, timeout=5)
        return self._client

    def ensure_collection(self) -> bool:
        """Create collection if it doesn't exist. Returns True if available."""
        try:
            client = self._get_client()
            collections = [c.name for c in client.get_collections().collections]
            if COLLECTION_NAME not in collections:
                client.create_collection(
                    collection_name=COLLECTION_NAME,
                    vectors_config=VectorParams(size=DEFAULT_VECTOR_DIM, distance=Distance.COSINE),
                )
            self._available = True
            return True
        except Exception:
            self._available = False
            return False

    def embed_text(self, text: str) -> list[float] | None:
        """Get embedding from Ollama. Returns None on failure."""
        try:
            with httpx.Client(timeout=10) as http:
                resp = http.post(
                    f"{self._ollama_url}/api/embeddings",
                    json={"model": EMBEDDING_MODEL, "prompt": text},
                )
                resp.raise_for_status()
                return resp.json()["embedding"]
        except Exception:
            return None

    def upsert_artifact(
        self,
        artifact_id: str,
        tenant_id: str,
        candidate_id: str,
        text: str,
        metadata: dict[str, Any],
    ) -> bool:
        """Upsert a single artifact vector. Returns True on success."""
        if not self._available:
            return False
        embedding = self.embed_text(text)
        if embedding is None:
            return False
        try:
            client = self._get_client()
            payload = {
                "tenant_id": tenant_id,
                "candidate_id": candidate_id,
                "artifact_id": artifact_id,
                "text_preview": text[:200],
                "content_hash": _content_hash(text),
                **metadata,
            }
            client.upsert(
                collection_name=COLLECTION_NAME,
                points=[
                    PointStruct(
                        id=artifact_id,
                        vector=embedding,
                        payload=payload,
                    )
                ],
            )
            return True
        except Exception:
            return False

    def search(
        self,
        query: str,
        tenant_id: str,
        candidate_id: str,
        limit: int = 6,
        role_filters: dict[str, str] | None = None,
    ) -> list[VectorHit]:
        """Search with tenant+candidate scope. Optional role-based filters."""
        if not self._available:
            return []

        embedding = self.embed_text(query)
        if embedding is None:
            return []

        must_conditions = [
            FieldCondition(key="tenant_id", match=MatchValue(value=tenant_id)),
            FieldCondition(key="candidate_id", match=MatchValue(value=candidate_id)),
        ]

        query_filter = Filter(must=must_conditions)

        try:
            client = self._get_client()
            results = client.query_points(
                collection_name=COLLECTION_NAME,
                query=embedding,
                query_filter=query_filter,
                limit=limit,
                with_payload=True,
            )
            return [
                VectorHit(
                    point_id=str(hit.id),
                    score=hit.score,
                    payload=hit.payload or {},
                )
                for hit in results.points
            ]
        except Exception:
            return []

    @property
    def is_available(self) -> bool:
        return self._available


class DeterministicFallback:
    """Keyword-based fallback when Qdrant is unavailable.

    Preserves the original scoring logic so the system works without vector search.
    """

    def embed_text(self, text: str) -> list[float] | None:
        return None

    def upsert_artifact(self, **kwargs) -> bool:
        return False

    def search(
        self,
        query: str,
        tenant_id: str,
        candidate_id: str,
        evidence_list: list[Any] | None = None,
        limit: int = 6,
        role_filters: dict[str, str] | None = None,
    ) -> list[VectorHit]:
        if not evidence_list:
            return []
        tokens = {w.strip(".,?!;:()") for w in query.lower().split() if len(w.strip(".,?!;:()")) > 2}
        hits: list[VectorHit] = []
        for ev in evidence_list:
            if getattr(ev, "tenant_id", "") != tenant_id or getattr(ev, "candidate_id", "") != candidate_id:
                continue
            content = getattr(ev, "content", "")
            if not content or not content.strip():
                continue
            haystack = f"{getattr(ev, 'title', '')} {content} {getattr(ev, 'competency', '')}".lower()
            overlap = len(tokens & set(haystack.split()))
            score = overlap * 10 + 1
            hits.append(
                VectorHit(
                    point_id=getattr(ev, "artifact_id", "unknown"),
                    score=score,
                    payload={
                        "artifact_id": getattr(ev, "artifact_id", ""),
                        "title": getattr(ev, "title", ""),
                        "date": getattr(ev, "date", ""),
                        "kind": getattr(ev, "kind", ""),
                        "source": getattr(ev, "source", ""),
                        "content": content,
                    },
                )
            )
        hits.sort(key=lambda h: h.score, reverse=True)
        return hits[:limit]

    def ensure_collection(self) -> bool:
        return False

    @property
    def is_available(self) -> bool:
        return False


def create_vector_store(qdrant_url: str | None = None) -> VectorStore | DeterministicFallback:
    """Factory: try Qdrant first, fall back to deterministic."""
    store = VectorStore(qdrant_url=qdrant_url)
    if store.ensure_collection():
        return store
    return DeterministicFallback()
