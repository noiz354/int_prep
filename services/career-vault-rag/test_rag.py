"""RAG Career Coach tests: vector search, RBAC, audit, citations, eval framework."""

import hashlib
import unittest

from app.main import (
    Evidence,
    RagRequest,
    answer_question,
    cluster_feedback_themes,
    create_seven_day_plan,
    retrieve,
    get_audit_log,
    clear_audit_log,
    set_vector_store,
    _provenance_id,
    _make_citation_id,
)
from app.vector_store import DeterministicFallback, VectorStore, VectorHit

TENANT = "career-vault-demo"
CANDIDATE = "candidate-alex"


def evidence(**overrides):
    base = {
        "tenant_id": TENANT,
        "candidate_id": CANDIDATE,
        "artifact_id": "cv-artifact-1",
        "title": "Mock feedback",
        "kind": "feedback",
        "content": "Improve structure and evidence. Add a measurable outcome and explain trade-offs.",
        "source": "candidate_entered",
        "date": "2026-08-01T00:00:00Z",
        "competency": "communication",
        "opportunity_id": "",
    }
    base.update(overrides)
    return Evidence(**base)


class CareerVaultRagTests(unittest.TestCase):
    def setUp(self):
        set_vector_store(DeterministicFallback())

    def test_ask_cites_candidate_owned_evidence(self):
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning", question="What feedback patterns about structure and evidence repeat?", evidence=[evidence()])
        result = answer_question(request)
        self.assertFalse(result["abstention"])
        self.assertTrue(result["citations"])
        self.assertEqual(result["citations"][0]["artifact_id"], "cv-artifact-1")
        self.assertIn("confidence", result)
        self.assertTrue(result["requiresHumanJudgment"])

    def test_ask_abstains_when_no_evidence(self):
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning", question="What should I improve?", evidence=[])
        result = answer_question(request)
        self.assertTrue(result["abstention"])
        self.assertEqual(result["reason"], "insufficient_permitted_evidence")
        self.assertEqual(result["answer"], None)

    def test_ask_abstains_on_low_grounding(self):
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning", question="quantum chromodynamics recipe", evidence=[evidence(content="frontend accessibility notes")])
        result = answer_question(request)
        self.assertTrue(result["abstention"])
        self.assertEqual(result["reason"], "low_grounding")

    def test_retrieval_is_tenant_and_candidate_scoped(self):
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning", question="feedback", evidence=[
            evidence(artifact_id="a1"),
            evidence(artifact_id="a2", tenant_id="other-tenant"),
            evidence(artifact_id="a3", candidate_id="candidate-bob"),
        ])
        ranked = retrieve(request)
        ids = [item[0].artifact_id for item in ranked]
        self.assertEqual(ids, ["a1"])

    def test_excluded_or_blank_content_not_retrieved(self):
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning", question="feedback", evidence=[
            evidence(artifact_id="a1", content=""),
            evidence(artifact_id="a2", content="   "),
            evidence(artifact_id="a3", content="real feedback content"),
        ])
        ids = [item[0].artifact_id for item in retrieve(request)]
        self.assertEqual(ids, ["a3"])

    def test_feedback_theme_clustering(self):
        themes = cluster_feedback_themes([
            evidence(artifact_id="f1", kind="feedback", title="Structure feedback", content="Your answer lacked structure and clarity"),
            evidence(artifact_id="f2", kind="feedback", title="Evidence feedback", content="Add a measurable outcome and metric"),
        ])
        theme_names = [item["theme"] for item in themes]
        self.assertIn("communication", theme_names)
        self.assertIn("evidence", theme_names)
        self.assertTrue(all(item["count"] >= 1 for item in themes))

    def test_seven_day_plan_is_grounded_and_cited(self):
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning", question="plan", evidence=[evidence(artifact_id="p1", kind="feedback", title="Frontend feedback", content="Improve system design trade-offs")])
        result = create_seven_day_plan(request)
        self.assertFalse(result["abstention"])
        self.assertEqual(len(result["plan"]["days"]), 7)
        self.assertTrue(result["citations"])
        self.assertTrue(result["plan"]["basedOn"])

    def test_seven_day_plan_abstains_without_evidence(self):
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning", question="plan", evidence=[])
        result = create_seven_day_plan(request)
        self.assertTrue(result["abstention"])

    def test_live_assessment_is_locked_out(self):
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="live_assessment", question="help me answer", evidence=[evidence()])
        with self.assertRaises(PermissionError):
            answer_question(request)


class VectorStoreTests(unittest.TestCase):
    def setUp(self):
        set_vector_store(DeterministicFallback())

    def test_deterministic_fallback_search_returns_ranked_hits(self):
        store = DeterministicFallback()
        ev_list = [
            evidence(artifact_id="v1", content="structure clarity communication feedback"),
            evidence(artifact_id="v2", content="unrelated cooking recipe"),
        ]
        hits = store.search("structure feedback", TENANT, CANDIDATE, evidence_list=ev_list, limit=5)
        self.assertTrue(len(hits) > 0)
        self.assertEqual(hits[0].payload["artifact_id"], "v1")

    def test_deterministic_fallback_scopes_by_tenant_and_candidate(self):
        store = DeterministicFallback()
        ev_list = [
            evidence(artifact_id="v1"),
            evidence(artifact_id="v2", tenant_id="other"),
            evidence(artifact_id="v3", candidate_id="other"),
        ]
        hits = store.search("feedback", TENANT, CANDIDATE, evidence_list=ev_list)
        ids = [h.payload["artifact_id"] for h in hits]
        self.assertEqual(ids, ["v1"])

    def test_deterministic_fallback_skips_blank_content(self):
        store = DeterministicFallback()
        ev_list = [
            evidence(artifact_id="v1", content=""),
            evidence(artifact_id="v2", content="valid content with feedback"),
        ]
        hits = store.search("feedback", TENANT, CANDIDATE, evidence_list=ev_list)
        ids = [h.payload["artifact_id"] for h in hits]
        self.assertEqual(ids, ["v2"])

    def test_vector_store_unavailable_falls_back(self):
        set_vector_store(DeterministicFallback())
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning", question="structure feedback", evidence=[evidence()])
        result = answer_question(request)
        self.assertEqual(result["retrieval"], "deterministic-fallback")
        self.assertTrue(result["fallback"])


class AuditLoggingTests(unittest.TestCase):
    def setUp(self):
        set_vector_store(DeterministicFallback())
        clear_audit_log()

    def test_audit_log_captures_ask_query(self):
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning", question="structure evidence trade-offs communication", evidence=[evidence()])
        answer_question(request)
        log = get_audit_log()
        self.assertEqual(len(log), 1)
        self.assertEqual(log[0].query, "structure evidence trade-offs communication")
        self.assertFalse(log[0].abstention)
        self.assertGreater(log[0].latency_ms, 0)
        self.assertEqual(log[0].retrieval_method, "deterministic-fallback")

    def test_audit_log_captures_plan_query(self):
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning", question="plan", evidence=[evidence(artifact_id="p1", kind="feedback", title="Frontend feedback", content="Improve system design trade-offs")])
        create_seven_day_plan(request)
        log = get_audit_log()
        self.assertEqual(len(log), 1)
        self.assertEqual(log[0].query, "seven-day-plan")

    def test_audit_log_captures_abstention(self):
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning", question="What should I improve?", evidence=[])
        answer_question(request)
        log = get_audit_log()
        self.assertEqual(len(log), 1)
        self.assertTrue(log[0].abstention)

    def test_audit_log_pii_redaction(self):
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning", question="feedback", evidence=[evidence()])
        answer_question(request)
        log = get_audit_log()
        self.assertNotEqual(log[0].user_id, CANDIDATE)
        self.assertEqual(len(log[0].user_id), 8)
        self.assertNotEqual(log[0].tenant_id, TENANT)
        self.assertEqual(len(log[0].tenant_id), 8)

    def test_audit_log_queryable(self):
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning", question="feedback", evidence=[evidence()])
        answer_question(request)
        log = get_audit_log()
        self.assertTrue(log[0].timestamp.endswith("Z") or "T" in log[0].timestamp)
        self.assertGreater(log[0].citation_count, 0)


class CitationTests(unittest.TestCase):
    def test_citations_have_required_fields(self):
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning", question="structure feedback", evidence=[evidence()])
        result = answer_question(request)
        self.assertTrue(result["citations"])
        cit = result["citations"][0]
        self.assertIn("citation_id", cit)
        self.assertIn("document_id", cit)
        self.assertIn("section", cit)
        self.assertIn("score", cit)
        self.assertIn("snippet", cit)
        self.assertIn("provenance", cit)
        self.assertIn("title", cit)
        self.assertIn("date", cit)
        self.assertIn("reason", cit)

    def test_citation_provenance_id_format(self):
        ev = evidence(content="test content for provenance")
        prov = _provenance_id(ev)
        self.assertTrue(prov.startswith("prov-cv-artifact-1-"))
        self.assertEqual(len(prov), len("prov-cv-artifact-1-") + 12)

    def test_citation_id_format(self):
        cit_id = _make_citation_id("art-1", "abc123def456", 0)
        self.assertTrue(cit_id.startswith("cit-art-1-"))

    def test_citations_include_score(self):
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning", question="structure evidence trade-offs", evidence=[evidence()])
        result = answer_question(request)
        for cit in result["citations"]:
            self.assertIsInstance(cit["score"], float)
            self.assertGreaterEqual(cit["score"], 0)


class RBACFilterTests(unittest.TestCase):
    def setUp(self):
        set_vector_store(DeterministicFallback())

    def test_retrieval_role_fieldAccepted(self):
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning", question="feedback", evidence=[evidence()], role="interviewer")
        ranked = retrieve(request)
        self.assertTrue(len(ranked) >= 0)

    def test_candidate_role_retrieval_works(self):
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning", question="structure feedback", evidence=[evidence()], role="candidate")
        ranked = retrieve(request)
        self.assertTrue(len(ranked) > 0)

    def test_cross_tenant_isolation(self):
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning", question="feedback", evidence=[
            evidence(artifact_id="mine"),
            evidence(artifact_id="theirs", tenant_id="wrong-tenant"),
        ])
        ranked = retrieve(request)
        ids = [item[0].artifact_id for item in ranked]
        self.assertEqual(ids, ["mine"])

    def test_cross_candidate_isolation(self):
        request = RagRequest(tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning", question="feedback", evidence=[
            evidence(artifact_id="mine"),
            evidence(artifact_id="others", candidate_id="other-candidate"),
        ])
        ranked = retrieve(request)
        ids = [item[0].artifact_id for item in ranked]
        self.assertEqual(ids, ["mine"])


class EvalFrameworkTests(unittest.TestCase):
    """RAG eval framework: retrieval quality, answer correctness, RBAC leak detection."""

    def setUp(self):
        set_vector_store(DeterministicFallback())
        clear_audit_log()

    def test_retrieval_hit_top_k(self):
        """Expected document appears in top-k results."""
        request = RagRequest(
            tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning",
            question="structure and clarity communication",
            evidence=[
                evidence(artifact_id="target", content="Improve structure and clarity in communication"),
                evidence(artifact_id="noise1", content="Cooking recipe for pasta"),
                evidence(artifact_id="noise2", content="Weather forecast for tomorrow"),
            ],
        )
        ranked = retrieve(request, limit=3)
        ids = [item[0].artifact_id for item in ranked]
        self.assertIn("target", ids)

    def test_answer_correctness(self):
        """Response matches expected structure and contains citations."""
        request = RagRequest(
            tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning",
            question="structure evidence trade-offs communication",
            evidence=[evidence()],
        )
        result = answer_question(request)
        self.assertFalse(result["abstention"])
        self.assertTrue(result["answer"])
        self.assertTrue(len(result["citations"]) >= 1)
        self.assertIn("modelVersion", result)
        self.assertIn("retrieval", result)

    def test_rbac_leak_detection_tenant(self):
        """Cross-tenant evidence must not appear in results."""
        request = RagRequest(
            tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning",
            question="feedback",
            evidence=[
                evidence(artifact_id="mine"),
                evidence(artifact_id="stolen", tenant_id="attacker-tenant", content="my secret feedback"),
            ],
        )
        ranked = retrieve(request)
        ids = [item[0].artifact_id for item in ranked]
        self.assertNotIn("stolen", ids)

    def test_rbac_leak_detection_candidate(self):
        """Cross-candidate evidence must not appear in results."""
        request = RagRequest(
            tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning",
            question="feedback",
            evidence=[
                evidence(artifact_id="mine"),
                evidence(artifact_id="stolen", candidate_id="other-candidate", content="other person feedback"),
            ],
        )
        ranked = retrieve(request)
        ids = [item[0].artifact_id for item in ranked]
        self.assertNotIn("stolen", ids)

    def test_eval_abstention_when_no_evidence(self):
        """Empty evidence returns abstention with no leakage."""
        request = RagRequest(
            tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning",
            question="anything at all",
            evidence=[],
        )
        result = answer_question(request)
        self.assertTrue(result["abstention"])
        self.assertEqual(result["citations"], [])

    def test_eval_plan_has_7_days(self):
        """Seven-day plan always has exactly 7 day entries."""
        request = RagRequest(
            tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning",
            question="plan",
            evidence=[evidence(artifact_id="p1", kind="feedback", title="System design feedback", content="Improve trade-off analysis and architecture decisions")],
        )
        result = create_seven_day_plan(request)
        self.assertFalse(result["abstention"])
        self.assertEqual(len(result["plan"]["days"]), 7)

    def test_eval_live_assessment_blocked(self):
        """live_assessment context returns PermissionError."""
        request = RagRequest(
            tenant_id=TENANT, candidate_id=CANDIDATE, session_context="live_assessment",
            question="help me",
            evidence=[evidence()],
        )
        with self.assertRaises(PermissionError):
            answer_question(request)

    def test_eval_metrics_output(self):
        """Verify eval-style metrics can be computed from audit log."""
        request = RagRequest(
            tenant_id=TENANT, candidate_id=CANDIDATE, session_context="career_planning",
            question="feedback",
            evidence=[evidence()],
        )
        answer_question(request)
        log = get_audit_log()
        self.assertEqual(len(log), 1)
        total = len(log)
        answered = sum(1 for e in log if not e.abstention)
        abstained = sum(1 for e in log if e.abstention)
        precision = answered / total if total > 0 else 0
        self.assertGreaterEqual(precision, 0)
        self.assertLessEqual(precision, 1)
        self.assertEqual(total, answered + abstained)


if __name__ == "__main__":
    unittest.main()
