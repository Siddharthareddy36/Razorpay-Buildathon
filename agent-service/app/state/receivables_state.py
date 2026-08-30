from typing import TypedDict, List, Dict, Any, Optional, Literal

class ReceivablesState(TypedDict, total=False):
    # Identity
    business_id: str
    invoice_id: str
    customer_id: str
    invoice_number: str

    # Financial Facts (Supabase Ground Truth)
    invoice_amount: float
    paid_amount: float
    outstanding_amount: float
    due_date: str
    days_overdue: int
    invoice_status: str

    # Customer Context
    customer_name: str
    average_payment_delay_days: int
    total_invoices: int
    overdue_invoice_count: int
    total_promises: int
    broken_promise_count: int

    # Event Relational Context
    payment_count: int
    recent_payment_behaviour: str
    has_partial_payment: bool
    active_promise_count: int
    recent_communication_count: int
    recent_inbound_count: int
    recent_outbound_count: int
    dispute_signal: bool
    open_exception_count: int

    # Deterministic Analysis
    signals: Dict[str, Any]
    baseline_score: float
    baseline_priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    signal_summary: List[str]

    # Agent AI Output
    agent_priority: Literal["LOW", "MEDIUM", "HIGH", "CRITICAL"]
    priority_reason: str
    evidence: List[str]
    recommended_action: str
    confidence: float
    reasoning_mode: Literal["GEMINI", "DETERMINISTIC_FALLBACK"]

    # Validation
    validation_status: Literal["VALID", "INVALID"]
    validation_errors: List[str]

    # Policy Engine
    policy_decision: Literal["APPROVED", "REJECTED", "HUMAN_REVIEW"]
    policy_reason: str
    rules_triggered: List[str]
    safe_action: Optional[str]

    # Control
    workflow_status: Literal["PENDING", "COMPLETED", "FAILED"]
    error: Optional[str]

    # Persistence Telemetry
    agent_run_id: Optional[str]
    agent_decision_id: Optional[str]

def create_initial_receivables_state(invoice_id: str) -> ReceivablesState:
    return ReceivablesState(
        business_id="",
        invoice_id=invoice_id,
        customer_id="",
        invoice_number="",

        invoice_amount=0.0,
        paid_amount=0.0,
        outstanding_amount=0.0,
        due_date="",
        days_overdue=0,
        invoice_status="UNKNOWN",

        customer_name="",
        average_payment_delay_days=0,
        total_invoices=0,
        overdue_invoice_count=0,
        total_promises=0,
        broken_promise_count=0,

        payment_count=0,
        recent_payment_behaviour="",
        has_partial_payment=False,
        active_promise_count=0,
        recent_communication_count=0,
        recent_inbound_count=0,
        recent_outbound_count=0,
        dispute_signal=False,
        open_exception_count=0,

        signals={},
        baseline_score=0.0,
        baseline_priority="LOW",
        signal_summary=[],

        agent_priority="LOW",
        priority_reason="",
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
