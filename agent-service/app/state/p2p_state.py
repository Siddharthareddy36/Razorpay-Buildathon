from typing import TypedDict, List, Dict, Any, Optional, Literal

class P2PAgentState(TypedDict, total=False):
    # Identifiers
    business_id: str
    customer_id: str
    invoice_id: str
    promise_id: str

    # Invoice Facts (Supabase Ground Truth)
    invoice_number: str
    invoice_amount: float
    invoice_paid_amount: float
    invoice_outstanding_amount: float
    invoice_status: str
    invoice_due_date: str
    days_overdue: int

    # Promise Facts (Supabase Ground Truth)
    promised_amount: float
    promised_date: str
    promise_db_status: str  # ACTIVE / FULFILLED / BROKEN from DB

    # Deterministic Promise Fulfillment Analysis
    fulfilled_amount: float
    remaining_promised_amount: float
    fulfillment_ratio: float
    days_until_promise: int
    days_past_promise: int
    days_to_fulfill: Optional[int]
    has_qualifying_payment_evidence: bool
    payment_occurred_before_promise_date: bool
    deterministic_promise_state: Literal["ACTIVE", "FULFILLED", "PARTIALLY_FULFILLED", "BROKEN"]
    data_consistency_warning: bool

    # Historical Customer Commitment Metrics
    historical_promise_count: int
    historical_fulfilled_count: int
    historical_partial_count: int
    historical_broken_count: int
    historical_cancelled_count: int
    historical_broken_ratio: float
    historical_fulfillment_ratio: float
    historical_average_promised_amount: float
    historical_average_fulfillment_amount: float
    recent_broken_trend: Literal["NO_HISTORY", "STABLE_FULFILLMENT", "IMPROVING", "DETERIORATING", "REPEATED_BROKEN"]
    commitment_reliability: Literal["HIGH", "MEDIUM", "LOW", "CRITICAL"]

    # Customer Facts
    customer_name: str
    customer_risk_score: int
    customer_average_payment_delay: float
    customer_overdue_invoice_count: int

    # Relational Context
    payment_evidence: List[Dict[str, Any]]
    recent_communications: List[Dict[str, Any]]
    extension_requests: bool
    delay_signals: bool
    dispute_signal: bool
    communication_signals: List[str]
    exception_context: List[Dict[str, Any]]

    # Gemini Structured Output
    promise_assessment: Literal["RELIABLE", "AT_RISK", "BROKEN", "PARTIALLY_FULFILLED", "FULFILLED"]
    reason: str
    evidence: List[str]
    recommended_action: str
    confidence: float
    reasoning_mode: Literal["GEMINI", "DETERMINISTIC_FALLBACK"]

    # Validation
    validation_status: Literal["VALID", "INVALID"]
    validation_errors: List[str]

    # Policy & Governance
    policy_decision: Literal["APPROVED", "REJECTED", "HUMAN_REVIEW"]
    policy_reason: str
    rules_triggered: List[str]
    safe_action: Optional[str]

    # Control & Traceability
    workflow_status: Literal["PENDING", "COMPLETED", "FAILED"]
    error: Optional[str]
    failed_component: Optional[str]
    retryable: Optional[bool]
    agent_run_id: Optional[str]
    agent_decision_id: Optional[str]

def create_initial_p2p_state(promise_id: str) -> P2PAgentState:
    return P2PAgentState(
        business_id="",
        customer_id="",
        invoice_id="",
        promise_id=promise_id,

        invoice_number="",
        invoice_amount=0.0,
        invoice_paid_amount=0.0,
        invoice_outstanding_amount=0.0,
        invoice_status="UNKNOWN",
        invoice_due_date="",
        days_overdue=0,

        promised_amount=0.0,
        promised_date="",
        promise_db_status="UNKNOWN",

        fulfilled_amount=0.0,
        remaining_promised_amount=0.0,
        fulfillment_ratio=0.0,
        days_until_promise=0,
        days_past_promise=0,
        days_to_fulfill=None,
        has_qualifying_payment_evidence=False,
        payment_occurred_before_promise_date=False,
        deterministic_promise_state="ACTIVE",
        data_consistency_warning=False,

        historical_promise_count=0,
        historical_fulfilled_count=0,
        historical_partial_count=0,
        historical_broken_count=0,
        historical_cancelled_count=0,
        historical_broken_ratio=0.0,
        historical_fulfillment_ratio=0.0,
        historical_average_promised_amount=0.0,
        historical_average_fulfillment_amount=0.0,
        recent_broken_trend="NO_HISTORY",
        commitment_reliability="MEDIUM",

        customer_name="",
        customer_risk_score=50,
        customer_average_payment_delay=0.0,
        customer_overdue_invoice_count=0,

        payment_evidence=[],
        recent_communications=[],
        extension_requests=False,
        delay_signals=False,
        dispute_signal=False,
        communication_signals=[],
        exception_context=[],

        promise_assessment="AT_RISK",
        reason="",
        evidence=[],
        recommended_action="",
        confidence=0.0,
        reasoning_mode="DETERMINISTIC_FALLBACK",

        validation_status="VALID",
        validation_errors=[],

        policy_decision="HUMAN_REVIEW",
        policy_reason="State initialized",
        rules_triggered=[],
        safe_action=None,

        workflow_status="PENDING",
        error=None,
        agent_run_id=None,
        agent_decision_id=None,
    )
