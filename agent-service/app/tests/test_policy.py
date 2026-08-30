from app.models.policy import (
    PolicyInput,
    PolicyInputInvoice,
    PolicyInputSignals,
    PolicyInputAgent,
)
from app.policies.receivables_policy import evaluate_receivables_policy

def test_paid_invoice_policy():
    inp = PolicyInput(
        invoice=PolicyInputInvoice(status="PAID", outstandingAmount=0.0, daysOverdue=0),
        signals=PolicyInputSignals(hasDispute=False),
        agent=PolicyInputAgent(priority="LOW", recommendedAction="Follow-up", confidence=0.9),
    )
    res = evaluate_receivables_policy(inp)
    assert res.decision == "APPROVED"
    assert res.safeAction == "No action required"
    assert "RULE_PAID_INVOICE" in res.rulesTriggered

def test_normal_overdue_invoice_policy():
    inp = PolicyInput(
        invoice=PolicyInputInvoice(status="OVERDUE", outstandingAmount=60000.0, daysOverdue=54),
        signals=PolicyInputSignals(hasDispute=False),
        agent=PolicyInputAgent(priority="CRITICAL", recommendedAction="Escalate to senior credit manager", confidence=0.92),
    )
    res = evaluate_receivables_policy(inp)
    assert res.decision == "APPROVED"
    assert "RULE_DEFAULT_APPROVED" in res.rulesTriggered
    assert res.safeAction == "Escalate to senior credit manager"

def test_active_dispute_policy():
    inp = PolicyInput(
        invoice=PolicyInputInvoice(status="OVERDUE", outstandingAmount=60000.0, daysOverdue=54),
        signals=PolicyInputSignals(hasDispute=True),
        agent=PolicyInputAgent(priority="CRITICAL", recommendedAction="Immediate aggressive collection call", confidence=0.95),
    )
    res = evaluate_receivables_policy(inp)
    assert res.decision == "HUMAN_REVIEW"
    assert "RULE_ACTIVE_DISPUTE" in res.rulesTriggered
    assert "dispute" in res.reason.lower()

def test_low_confidence_policy():
    inp = PolicyInput(
        invoice=PolicyInputInvoice(status="OVERDUE", outstandingAmount=100000.0, daysOverdue=20),
        signals=PolicyInputSignals(),
        agent=PolicyInputAgent(priority="MEDIUM", recommendedAction="Send notice", confidence=0.35),
    )
    res = evaluate_receivables_policy(inp)
    assert res.decision == "HUMAN_REVIEW"
    assert "RULE_LOW_CONFIDENCE" in res.rulesTriggered

def test_missing_invoice_policy():
    inp = PolicyInput(
        invoice=None,
        signals=PolicyInputSignals(),
        agent=PolicyInputAgent(priority="LOW", recommendedAction="Action", confidence=0.9),
    )
    res = evaluate_receivables_policy(inp)
    assert res.decision == "HUMAN_REVIEW"
    assert "RULE_INVALID_CONTEXT" in res.rulesTriggered

def test_workflow_error_policy():
    inp = PolicyInput(
        invoice=PolicyInputInvoice(status="OVERDUE", outstandingAmount=5000.0, daysOverdue=10),
        signals=PolicyInputSignals(),
        agent=PolicyInputAgent(priority="LOW", recommendedAction="Action", confidence=0.9),
        error="Supabase query timeout",
    )
    res = evaluate_receivables_policy(inp)
    assert res.decision == "HUMAN_REVIEW"
    assert "RULE_INVALID_CONTEXT" in res.rulesTriggered

def test_unsafe_financial_mutation_policy():
    inp = PolicyInput(
        invoice=PolicyInputInvoice(status="OVERDUE", outstandingAmount=50000.0, daysOverdue=15),
        signals=PolicyInputSignals(),
        agent=PolicyInputAgent(priority="HIGH", recommendedAction="Change invoice amount to 40K", confidence=0.90),
    )
    res = evaluate_receivables_policy(inp)
    assert res.decision == "REJECTED"
    assert "RULE_UNSAFE_FINANCIAL_MUTATION" in res.rulesTriggered

def test_payment_exception_policy():
    inp = PolicyInput(
        invoice=PolicyInputInvoice(status="OVERDUE", outstandingAmount=20000.0, daysOverdue=10),
        signals=PolicyInputSignals(hasOpenException=True),
        agent=PolicyInputAgent(priority="MEDIUM", recommendedAction="Send payment reminder", confidence=0.85),
    )
    res = evaluate_receivables_policy(inp)
    assert res.decision == "HUMAN_REVIEW"
    assert "RULE_PAYMENT_EXCEPTION" in res.rulesTriggered

def test_partial_payment_without_dispute_policy():
    inp = PolicyInput(
        invoice=PolicyInputInvoice(status="OVERDUE", outstandingAmount=80000.0, daysOverdue=21),
        signals=PolicyInputSignals(hasPartialPayment=True, hasDispute=False),
        agent=PolicyInputAgent(priority="HIGH", recommendedAction="Contact accounts payable for remaining balance", confidence=0.91),
    )
    res = evaluate_receivables_policy(inp)
    assert res.decision == "APPROVED"
    assert "RULE_DEFAULT_APPROVED" in res.rulesTriggered

def test_high_confidence_valid_recommendation_policy():
    inp = PolicyInput(
        invoice=PolicyInputInvoice(status="OVERDUE", outstandingAmount=2200000.0, daysOverdue=34),
        signals=PolicyInputSignals(),
        agent=PolicyInputAgent(priority="CRITICAL", recommendedAction="Senior credit manager direct outreach", confidence=0.98),
    )
    res = evaluate_receivables_policy(inp)
    assert res.decision == "APPROVED"
    assert res.safeAction == "Senior credit manager direct outreach"
