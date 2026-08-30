from typing import TypedDict, List, Dict, Any, Optional, Literal

class SupervisorState(TypedDict, total=False):
    # Identifiers
    request_id: str
    business_id: str
    user_query: str

    # Intent Classification & Entities
    detected_intent: Literal[
        "RECEIVABLES", "PROMISE", "RECONCILIATION",
        "CUSTOMER_ANALYSIS", "PORTFOLIO_SUMMARY", "CROSS_DOMAIN_INVESTIGATION", "NOT_FOUND", "UNKNOWN"
    ]
    resolved_entities: Dict[str, Any]  # invoice_id, customer_id, promise_id, payment_id, exception_id, invoice_number
    entity_not_found: bool
    missing_entity_id: Optional[str]
    is_ambiguous: bool
    clarification_prompt: Optional[str]

    # Execution Plan & Specialist Routing
    selected_agents: List[Literal["RECEIVABLES", "P2P", "RECONCILIATION"]]
    execution_plan: List[Dict[str, Any]]

    # Shared Context & Specialist Results
    shared_context: Dict[str, Any]
    specialist_results: Dict[str, Any]  # {"receivables": {...}, "p2p": {...}, "reconciliation": {...}}
    specialist_errors: Dict[str, str]

    # Cross-Agent Conflict & Synthesis
    has_cross_agent_conflict: bool
    conflict_summary: Optional[str]
    final_summary: str
    cross_domain_findings: List[str]
    final_recommendation: str

    # Policy & Telemetry
    policy_decision: Literal["APPROVED", "HUMAN_REVIEW", "REJECTED"]
    policy_reason: str
    rules_triggered: List[str]
    confidence: float
    reasoning_mode: Literal["DETERMINISTIC", "GEMINI_SYNTHESIS"]

    # Control & Traceability
    workflow_status: Literal["PENDING", "COMPLETED", "FAILED", "HUMAN_REVIEW_REQUIRED", "NOT_FOUND", "UNKNOWN"]
    error: Optional[str]
    audit_id: Optional[str]

def create_initial_supervisor_state(user_query: str, request_id: Optional[str] = None) -> SupervisorState:
    import uuid
    req_id = request_id or str(uuid.uuid4())
    return SupervisorState(
        request_id=req_id,
        business_id="10000000-0000-4000-8000-000000000003",
        user_query=user_query,

        detected_intent="UNKNOWN",
        resolved_entities={},
        entity_not_found=False,
        missing_entity_id=None,
        is_ambiguous=False,
        clarification_prompt=None,

        selected_agents=[],
        execution_plan=[],

        shared_context={},
        specialist_results={},
        specialist_errors={},

        has_cross_agent_conflict=False,
        conflict_summary=None,
        final_summary="",
        cross_domain_findings=[],
        final_recommendation="",

        policy_decision="HUMAN_REVIEW",
        policy_reason="Supervisor state initialized",
        rules_triggered=[],
        confidence=0.0,
        reasoning_mode="DETERMINISTIC",

        workflow_status="PENDING",
        error=None,
        audit_id=None,
    )
