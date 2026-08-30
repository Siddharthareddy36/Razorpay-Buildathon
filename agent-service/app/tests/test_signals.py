import pytest
from app.models.context import (
    NormalizedContext,
    InvoiceFact,
    CustomerFact,
    PaymentFact,
    PromiseFact,
    CommunicationFact,
    ExceptionFact,
)
from app.services.signals import compute_deterministic_signals, compute_baseline_priority

def build_test_context(
    invoice_id="inv-1",
    invoice_number="INV-TEST",
    amount=100000.0,
    paid_amount=0.0,
    days_overdue=10,
    status="OVERDUE",
    broken_promises=0,
    communications=None,
    exceptions=None,
    payments=None,
) -> NormalizedContext:
    outstanding = max(0.0, amount - paid_amount)
    return NormalizedContext(
        invoice=InvoiceFact(
            invoiceId=invoice_id,
            invoiceNumber=invoice_number,
            businessId="biz-1",
            customerId="cust-1",
            amount=amount,
            paidAmount=paid_amount,
            outstandingAmount=outstanding,
            dueDate="2026-07-01",
            daysOverdue=days_overdue,
            status=status,
        ),
        customer=CustomerFact(
            customerId="cust-1",
            name="Test Customer",
            averagePaymentDelayDays=15,
            totalInvoices=10,
            overdueInvoices=2,
            totalPromises=2,
            brokenPromises=broken_promises,
        ),
        payments=payments or [],
        promises=[],
        communications=communications or [],
        exceptions=exceptions or [],
    )

def test_paid_invoice():
    ctx = build_test_context(amount=100000.0, paid_amount=100000.0, days_overdue=0, status="PAID")
    res = compute_baseline_priority(ctx)
    assert res.outstandingAmount == 0.0
    assert res.daysOverdue == 0
    assert res.baselinePriority == "LOW"
    assert res.baselineScore == 0.0

def test_future_due_invoice():
    ctx = build_test_context(amount=420000.0, paid_amount=0.0, days_overdue=0, status="UNPAID")
    res = compute_baseline_priority(ctx)
    assert res.daysOverdue == 0
    # exposure = (420000 / 1000000) * 35 = 14.7
    assert res.baselineScore == 14.7
    assert res.baselinePriority == "LOW"

def test_high_value_overdue_invoice():
    ctx = build_test_context(amount=2200000.0, paid_amount=0.0, days_overdue=34, status="OVERDUE")
    res = compute_baseline_priority(ctx)
    # exposure = 35.0, overdue = min(40, 34*1.25=42.5) = 40.0, total = 75.0 (or >60/days>30) -> CRITICAL
    assert res.baselineScore >= 70.0
    assert res.baselinePriority == "CRITICAL"

def test_severely_overdue_invoice():
    ctx = build_test_context(amount=60000.0, paid_amount=0.0, days_overdue=54, status="OVERDUE")
    res = compute_baseline_priority(ctx)
    # exposure = (60000 / 1000000) * 35 = 2.1
    # overdue = min(40, 54 * 1.25 = 67.5) = 40.0
    assert res.daysOverdue == 54
    assert res.signals.daysOverdue == 54

def test_broken_promises_signal():
    ctx = build_test_context(amount=60000.0, paid_amount=0.0, days_overdue=54, broken_promises=3)
    res = compute_baseline_priority(ctx)
    assert res.signals.hasBrokenPromise is True
    assert res.signals.brokenPromiseCount == 3
    # exposure: 2.1, overdue: 40.0, brokenPromise: 15.0 -> raw = 57.1
    assert res.baselineScore == 57.1
    assert res.baselinePriority == "CRITICAL"

def test_partial_payment_signal():
    ctx = build_test_context(amount=100000.0, paid_amount=20000.0, days_overdue=21)
    res = compute_baseline_priority(ctx)
    assert res.signals.hasPartialPayment is True
    assert res.outstandingAmount == 80000.0

def test_disputed_invoice_signal():
    comms = [
        CommunicationFact(
            id="c1",
            channel="EMAIL",
            direction="INBOUND",
            message="We dispute this invoice amount due to wrong pricing.",
        )
    ]
    ctx = build_test_context(communications=comms)
    res = compute_baseline_priority(ctx)
    assert res.signals.hasDispute is True

def test_missing_optional_history():
    ctx = build_test_context(communications=[], exceptions=[], payments=[])
    res = compute_baseline_priority(ctx)
    assert res.baselineScore >= 0.0

def test_inv_1013_cross_check():
    """
    Cross-check INV-1013 against TypeScript implementation:
    INV-1013 Ground Truth Context:
    - amount = 60000
    - paidAmount = 0
    - daysOverdue = 54
    - customer brokenPromises = 3
    - exceptions = 0, disputes = 0
    TypeScript calculated score: 57.1, Priority: CRITICAL
    """
    ctx = build_test_context(
        invoice_id="13257fa4-220b-4a8f-9184-2d8545d0bad3",
        invoice_number="INV-1013",
        amount=60000.0,
        paid_amount=0.0,
        days_overdue=54,
        broken_promises=3,
    )
    res = compute_baseline_priority(ctx)

    assert res.baselineScore == 57.1
    assert res.baselinePriority == "CRITICAL"
    assert res.signals.hasBrokenPromise is True
