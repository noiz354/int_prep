"""RAG Career Coach unit tests: citations, abstention, themes, lockout, exclusion."""

import unittest

from app.main import Evidence, RagRequest, answer_question, cluster_feedback_themes, create_seven_day_plan, retrieve

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


if __name__ == "__main__":
    unittest.main()
