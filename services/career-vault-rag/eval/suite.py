"""Eval suite for Career Vault RAG: retrieval quality, answer correctness, RBAC leak detection."""

TENANT_A = "tenant-alpha"
TENANT_B = "tenant-beta"
CANDIDATE_A = "candidate-alice"
CANDIDATE_B = "candidate-bob"

EVAL_CASES = [
    {
        "id": "retrieval-001",
        "name": "Retrieval: relevant document in top-k",
        "type": "retrieval_hit",
        "question": "structure clarity communication feedback",
        "expected_artifact_ids": ["art-communication-feedback"],
        "evidence": [
            {"artifact_id": "art-communication-feedback", "title": "Communication Feedback", "kind": "feedback", "content": "Improve structure and clarity in communication. Use concise language.", "source": "coach_shared", "date": "2026-08-01T00:00:00Z", "tenant_id": TENANT_A, "candidate_id": CANDIDATE_A, "competency": "communication"},
            {"artifact_id": "art-unrelated", "title": "Unrelated Note", "kind": "note", "content": "Grocery list: milk, eggs, bread", "source": "candidate_entered", "date": "2026-08-02T00:00:00Z", "tenant_id": TENANT_A, "candidate_id": CANDIDATE_A, "competency": ""},
        ],
    },
    {
        "id": "retrieval-002",
        "name": "Retrieval: technical depth query",
        "type": "retrieval_hit",
        "question": "architecture trade-off system design",
        "expected_artifact_ids": ["art-system-design"],
        "evidence": [
            {"artifact_id": "art-system-design", "title": "System Design Review", "kind": "feedback", "content": "Strong architecture skills. Consider trade-offs between consistency and availability.", "source": "coach_shared", "date": "2026-07-15T00:00:00Z", "tenant_id": TENANT_A, "candidate_id": CANDIDATE_A, "competency": "technical_depth"},
            {"artifact_id": "art-other", "title": "Meeting Notes", "kind": "note", "content": "Discussed project timeline and milestones", "source": "candidate_entered", "date": "2026-08-01T00:00:00Z", "tenant_id": TENANT_A, "candidate_id": CANDIDATE_A, "competency": ""},
        ],
    },
    {
        "id": "retrieval-003",
        "name": "Retrieval: evidence/measurable outcomes",
        "type": "retrieval_hit",
        "question": "evidence metric outcome measurable impact",
        "expected_artifact_ids": ["art-evidence-metrics"],
        "evidence": [
            {"artifact_id": "art-evidence-metrics", "title": "Performance Metrics", "kind": "feedback", "content": "Add measurable outcomes: reduced load time by 40%, increased conversion by 15%.", "source": "approved_connector", "date": "2026-07-20T00:00:00Z", "tenant_id": TENANT_A, "candidate_id": CANDIDATE_A, "competency": "evidence"},
        ],
    },
    {
        "id": "answer-001",
        "name": "Answer correctness: cited response",
        "type": "answer_hit",
        "question": "structure communication clarity evidence",
        "expected_abstention": False,
        "expected_min_citations": 1,
        "evidence": [
            {"artifact_id": "art-com-1", "title": "Communication Review", "kind": "feedback", "content": "Improve structure and clarity. Add measurable outcomes.", "source": "coach_shared", "date": "2026-08-01T00:00:00Z", "tenant_id": TENANT_A, "candidate_id": CANDIDATE_A, "competency": "communication"},
        ],
    },
    {
        "id": "answer-002",
        "name": "Answer correctness: abstention on no evidence",
        "type": "answer_hit",
        "question": "anything at all",
        "expected_abstention": True,
        "expected_min_citations": 0,
        "evidence": [],
    },
    {
        "id": "answer-003",
        "name": "Answer correctness: low grounding abstention",
        "type": "answer_hit",
        "question": "quantum physics theory",
        "expected_abstention": True,
        "expected_min_citations": 0,
        "evidence": [
            {"artifact_id": "art-com-1", "title": "Communication Review", "kind": "feedback", "content": "Improve structure and clarity.", "source": "coach_shared", "date": "2026-08-01T00:00:00Z", "tenant_id": TENANT_A, "candidate_id": CANDIDATE_A, "competency": "communication"},
        ],
    },
    {
        "id": "rbac-leak-001",
        "name": "RBAC: cross-tenant evidence blocked",
        "type": "rbac_leak",
        "question": "feedback structure",
        "forbidden_artifact_ids": ["art-tenant-b-secret"],
        "evidence": [
            {"artifact_id": "art-tenant-a", "title": "My Feedback", "kind": "feedback", "content": "Structure feedback for tenant A", "source": "coach_shared", "date": "2026-08-01T00:00:00Z", "tenant_id": TENANT_A, "candidate_id": CANDIDATE_A, "competency": "communication"},
            {"artifact_id": "art-tenant-b-secret", "title": "Tenant B Secret", "kind": "feedback", "content": "Confidential tenant B feedback", "source": "coach_shared", "date": "2026-08-01T00:00:00Z", "tenant_id": TENANT_B, "candidate_id": CANDIDATE_A, "competency": "communication"},
        ],
        "tenant_id": TENANT_A,
        "candidate_id": CANDIDATE_A,
    },
    {
        "id": "rbac-leak-002",
        "name": "RBAC: cross-candidate evidence blocked",
        "type": "rbac_leak",
        "question": "feedback structure",
        "forbidden_artifact_ids": ["art-bob-secret"],
        "evidence": [
            {"artifact_id": "art-alice", "title": "Alice Feedback", "kind": "feedback", "content": "Structure feedback for Alice", "source": "coach_shared", "date": "2026-08-01T00:00:00Z", "tenant_id": TENANT_A, "candidate_id": CANDIDATE_A, "competency": "communication"},
            {"artifact_id": "art-bob-secret", "title": "Bob Secret", "kind": "feedback", "content": "Confidential Bob feedback", "source": "coach_shared", "date": "2026-08-01T00:00:00Z", "tenant_id": TENANT_A, "candidate_id": CANDIDATE_B, "competency": "communication"},
        ],
        "tenant_id": TENANT_A,
        "candidate_id": CANDIDATE_A,
    },
    {
        "id": "rbac-leak-003",
        "name": "RBAC: wrong tenant returns no results",
        "type": "rbac_leak",
        "question": "secret feedback",
        "forbidden_artifact_ids": ["art-wrong-tenant"],
        "evidence": [
            {"artifact_id": "art-wrong-tenant", "title": "Wrong Tenant", "kind": "feedback", "content": "This belongs to wrong tenant", "source": "coach_shared", "date": "2026-08-01T00:00:00Z", "tenant_id": TENANT_B, "candidate_id": CANDIDATE_B, "competency": "communication"},
        ],
        "tenant_id": TENANT_A,
        "candidate_id": CANDIDATE_A,
    },
    {
        "id": "rbac-leak-004",
        "name": "RBAC: live_assessment blocks RAG entirely",
        "type": "rbac_leak",
        "question": "help me answer",
        "forbidden_artifact_ids": [],
        "evidence": [
            {"artifact_id": "art-live", "title": "Live Data", "kind": "feedback", "content": "Live assessment data that should not be accessible", "source": "coach_shared", "date": "2026-08-01T00:00:00Z", "tenant_id": TENANT_A, "candidate_id": CANDIDATE_A, "competency": "communication"},
        ],
        "tenant_id": TENANT_A,
        "candidate_id": CANDIDATE_A,
        "session_context": "live_assessment",
        "expect_error": True,
    },
    {
        "id": "retrieval-004",
        "name": "Retrieval: blank content excluded",
        "type": "retrieval_hit",
        "question": "feedback structure",
        "expected_artifact_ids": ["art-valid"],
        "evidence": [
            {"artifact_id": "art-empty", "title": "Empty", "kind": "note", "content": "", "source": "candidate_entered", "date": "2026-08-01T00:00:00Z", "tenant_id": TENANT_A, "candidate_id": CANDIDATE_A, "competency": ""},
            {"artifact_id": "art-valid", "title": "Valid Feedback", "kind": "feedback", "content": "Structure feedback with clarity", "source": "coach_shared", "date": "2026-08-01T00:00:00Z", "tenant_id": TENANT_A, "candidate_id": CANDIDATE_A, "competency": "communication"},
        ],
    },
    {
        "id": "plan-001",
        "name": "Plan: seven-day plan grounded",
        "type": "answer_hit",
        "question": "trade-off analysis architecture",
        "expected_abstention": False,
        "expected_min_citations": 1,
        "evidence": [
            {"artifact_id": "art-plan-1", "title": "Practice Session", "kind": "feedback", "content": "Improve trade-off analysis and architecture decisions", "source": "practice_artifact", "date": "2026-08-01T00:00:00Z", "tenant_id": TENANT_A, "candidate_id": CANDIDATE_A, "competency": "technical_depth"},
        ],
    },
]
