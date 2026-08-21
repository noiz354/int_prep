"""Structured JSON logging for SignalRoom Python services.

Zero new dependencies: uses the stdlib `logging` module with a JSON formatter.
Event names are stable and machine-queryable; no PII, transcripts, or raw email
content is ever logged. Tenant IDs are emitted as a stable short hash.
"""

import hashlib
import json
import logging
import sys
from datetime import datetime, timezone


def _hash_tenant(tenant_id: str) -> str:
    if not tenant_id:
        return "unknown"
    return hashlib.sha256(tenant_id.encode("utf-8")).hexdigest()[:12]


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "event": record.getMessage(),
            "level": record.levelname.lower(),
            "logger": record.name,
            "at": datetime.now(timezone.utc).isoformat(),
        }
        extra = getattr(record, "fields", None)
        if isinstance(extra, dict):
            payload.update(extra)
        return json.dumps(payload, default=str)


def get_logger(name: str, level: int = logging.INFO) -> logging.Logger:
    logger = logging.getLogger(name)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        handler.setFormatter(JsonFormatter())
        logger.addHandler(handler)
        logger.setLevel(level)
        logger.propagate = False
    return logger


def log_event(logger: logging.Logger, event: str, tenant_id: str | None = None, **fields) -> None:
    """Emit one structured event with bounded, non-sensitive fields."""
    payload = {"tenant": _hash_tenant(tenant_id) if tenant_id else "unknown"}
    payload.update(fields)
    logger.info(event, extra={"fields": payload})
