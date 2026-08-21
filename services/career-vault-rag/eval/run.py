"""RAG eval runner: retrieval quality, answer correctness, RBAC leak detection.

Usage: python -m eval.run
"""

import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import (
    Evidence,
    RagRequest,
    answer_question,
    create_seven_day_plan,
    retrieve,
    set_vector_store,
    clear_audit_log,
)
from app.vector_store import DeterministicFallback

from eval.suite import EVAL_CASES


def _to_evidence(items: list[dict]) -> list[Evidence]:
    return [Evidence(**item) for item in items]


def run_eval():
    set_vector_store(DeterministicFallback())
    clear_audit_log()

    results = []
    total = len(EVAL_CASES)
    passed = 0
    failed = 0

    for case in EVAL_CASES:
        start = time.monotonic()
        try:
            evidence_list = _to_evidence(case.get("evidence", []))
            tenant = case.get("tenant_id", "tenant-alpha")
            candidate = case.get("candidate_id", "candidate-alice")
            ctx = case.get("session_context", "career_planning")

            if case["type"] == "retrieval_hit":
                request = RagRequest(
                    tenant_id=tenant, candidate_id=candidate,
                    session_context=ctx, question=case["question"],
                    evidence=evidence_list,
                )
                ranked = retrieve(request, limit=10)
                result_ids = [item[0].artifact_id for item in ranked]
                expected = case.get("expected_artifact_ids", [])
                ok = all(eid in result_ids for eid in expected)

            elif case["type"] == "answer_hit":
                request = RagRequest(
                    tenant_id=tenant, candidate_id=candidate,
                    session_context=ctx, question=case["question"],
                    evidence=evidence_list,
                )
                if case.get("expect_error"):
                    try:
                        answer_question(request)
                        ok = False
                    except PermissionError:
                        ok = True
                else:
                    result = answer_question(request)
                    ok = result["abstention"] == case.get("expected_abstention", True)
                    if "expected_min_citations" in case:
                        ok = ok and len(result.get("citations", [])) >= case["expected_min_citations"]

            elif case["type"] == "rbac_leak":
                request = RagRequest(
                    tenant_id=tenant, candidate_id=candidate,
                    session_context=ctx, question=case["question"],
                    evidence=evidence_list,
                )
                if case.get("expect_error"):
                    try:
                        answer_question(request)
                        ok = False
                    except PermissionError:
                        ok = True
                else:
                    ranked = retrieve(request, limit=20)
                    result_ids = [item[0].artifact_id for item in ranked]
                    forbidden = case.get("forbidden_artifact_ids", [])
                    ok = not any(fid in result_ids for fid in forbidden)

            else:
                ok = False

        except Exception as exc:
            ok = False
            case["error"] = str(exc)

        latency_ms = (time.monotonic() - start) * 1000
        status = "PASS" if ok else "FAIL"
        if ok:
            passed += 1
        else:
            failed += 1

        results.append({
            "id": case["id"],
            "name": case["name"],
            "type": case["type"],
            "status": status,
            "latency_ms": round(latency_ms, 2),
        })

    # Compute metrics
    precision = passed / total if total > 0 else 0
    retrieval_cases = [r for r in results if r["type"] == "retrieval_hit"]
    retrieval_hits = sum(1 for r in retrieval_cases if r["status"] == "PASS")
    retrieval_precision = retrieval_hits / len(retrieval_cases) if retrieval_cases else 0

    answer_cases = [r for r in results if r["type"] == "answer_hit"]
    answer_hits = sum(1 for r in answer_cases if r["status"] == "PASS")
    answer_accuracy = answer_hits / len(answer_cases) if answer_cases else 0

    rbac_cases = [r for r in results if r["type"] == "rbac_leak"]
    rbac_passes = sum(1 for r in rbac_cases if r["status"] == "PASS")
    leak_rate = 1 - (rbac_passes / len(rbac_cases)) if rbac_cases else 0

    report = {
        "total": total,
        "passed": passed,
        "failed": failed,
        "precision": round(precision, 4),
        "retrieval_precision": round(retrieval_precision, 4),
        "answer_accuracy": round(answer_accuracy, 4),
        "rbac_leak_rate": round(leak_rate, 4),
        "results": results,
    }

    print(json.dumps(report, indent=2))
    return report


if __name__ == "__main__":
    report = run_eval()
    sys.exit(0 if report["failed"] == 0 else 1)
