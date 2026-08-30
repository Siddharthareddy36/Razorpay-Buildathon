from typing import TypedDict, List, Dict, Any, Optional, Literal

class ReconciliationAgentState(TypedDict, total=False):
    # Identifiers
    business_id: str
    customer_id: str
    invoice_id: str
    payment_id: str
    exception_id: str

    # Invoice Facts (Level 1 Financial Fact)
    invoice_number: str
    invoice_amount: float
    invoice_paid_amount: float
    invoice_outstanding_amount: float
    invoice_status: str

    # Payment Facts (Level 1 Financial Fact)
    payment_amount: float
    payment_status: str
    payment_method: str
    payment_date: str
    payment_reference: str

    # Allocation Math (Level 1 Financial Fact)
    allocated_amount: float
    unallocated_amount: float
    allocation_coverage_ratio: float
    payment_to_invoice_ratio: float

    # Exception Facts (Supabase DB)
    expected_amount: float
    received_amount: float
    difference: float
    exception_type_db: str
    exception_status_db: str
    db_ai_hypothesis: str
    db_resolution_notes: str

    # Qualitative & Deterministic Signals
    tds_signal: bool
    partial_payment_signal: bool
    mdr_signal: bool
    gst_signal: bool
    refund_signal: bool
    wrong_invoice_signal: bool
    duplicate_payment_signal: bool
    unallocated_payment_signal: bool
    overpayment_signal: bool
    dispute_signal: bool

    # Conflict Detection Engine (Phase 5.5)
    has_conflict: bool
    conflict_reason: Optional[str]
    conflict_details: List[str]

    # Evidence Priority Hierarchy (Levels 1 - 4)
    level_1_evidence: List[str]  # Direct Financial Facts
    level_2_evidence: List[str]  # Transaction Metadata & References
    level_3_evidence: List[str]  # Customer Account History & Trends
    level_4_evidence: List[str]  # Supporting Communications & Claims

    # Candidate Hypotheses & Evidence Quality Score (0 - 100)
    candidate_hypotheses: List[Dict[str, Any]]
    ranked_hypotheses: List[str]
    evidence_quality_score: float

    # Customer & Relational Context
    customer_name: str
    customer_risk_score: int
    recent_communications: List[Dict[str, Any]]
    communication_signals: List[str]
    payment_history_context: List[Dict[str, Any]]

    # Gemini Structured Output
    primary_hypothesis: Literal[
        "TDS", "MDR", "GST", "PARTIAL_PAYMENT", "REFUND",
        "WRONG_INVOICE", "DUPLICATE_PAYMENT", "UNALLOCATED_PAYMENT", "UNKNOWN"
    ]
    reason: str
    evidence: List[str]
    alternative_hypotheses: List[str]
    recommended_action: str
    confidence: float
    reasoning_mode: Literal["GEMINI", "DETERMINISTIC_FALLBACK"]

    # Validation & Policy
    validation_status: Literal["VALID", "INVALID"]
    validation_errors: List[str]
    policy_decision: Literal["APPROVED", "REJECTED", "HUMAN_REVIEW"]
    policy_reason: str
    rules_triggered: List[str]
    safe_action: Optional[str]

    # Human Review Explanation Breakdown (Phase 5.5)
    human_review_reason: Optional[str]
    human_review_details: Optional[Dict[str, Any]]

    # Control & Traceability
    workflow_status: Literal["PENDING", "COMPLETED", "FAILED", "HUMAN_REVIEW_REQUIRED"]
    error: Optional[str]
    agent_run_id: Optional[str]
    agent_decision_id: Optional[str]

def create_initial_reconciliation_state(exception_id: str) -> ReconciliationAgentState:
    return ReconciliationAgentState(
        business_id="",
        customer_id="",
        invoice_id="",
        payment_id="",
        exception_id=exception_id,

        invoice_number="",
        invoice_amount=0.0,
        invoice_paid_amount=0.0,
        invoice_outstanding_amount=0.0,
        invoice_status="UNKNOWN",

        payment_amount=0.0,
        payment_status="UNKNOWN",
        payment_method="UNKNOWN",
        payment_date="",
        payment_reference="-",

        allocated_amount=0.0,
        unallocated_amount=0.0,
        allocation_coverage_ratio=0.0,
        payment_to_invoice_ratio=0.0,

        expected_amount=0.0,
        received_amount=0.0,
        difference=0.0,
        exception_type_db="UNKNOWN",
        exception_status_db="UNKNOWN",
        db_ai_hypothesis="",
        db_resolution_notes="",

        tds_signal=False,
        partial_payment_signal=False,
        mdr_signal=False,
        gst_signal=False,
        refund_signal=False,
        wrong_invoice_signal=False,
        duplicate_payment_signal=False,
        unallocated_payment_signal=False,
        overpayment_signal=False,
        dispute_signal=False,

        has_conflict=False,
        conflict_reason=None,
        conflict_details=[],

        level_1_evidence=[],
        level_2_evidence=[],
        level_3_evidence=[],
        level_4_evidence=[],

        candidate_hypotheses=[],
        ranked_hypotheses=[],
        evidence_quality_score=0.5,

        customer_name="",
        customer_risk_score=50,
        recent_communications=[],
        communication_signals=[],
        payment_history_context=[],

        primary_hypothesis="UNKNOWN",
        reason="",
        evidence=[],
        alternative_hypotheses=[],
        recommended_action="",
        confidence=0.0,
        reasoning_mode="DETERMINISTIC_FALLBACK",

        validation_status="VALID",
        validation_errors=[],

        policy_decision="HUMAN_REVIEW",
        policy_reason="State initialized",
        rules_triggered=[],
        safe_action=None,

        human_review_reason=None,
        human_review_details=None,

        workflow_status="PENDING",
        error=None,
        agent_run_id=None,
        agent_decision_id=None,
    )
