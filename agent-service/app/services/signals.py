from app.models.context import NormalizedContext
from app.models.signals import DeterministicSignals, BaselineAnalysis

def compute_deterministic_signals(context: NormalizedContext) -> DeterministicSignals:
    inv = context.invoice
    cust = context.customer

    # Check promise signals
    has_broken_promise = (
        cust.brokenPromises > 0
        or any(p.status in ["BROKEN", "broken"] for p in context.promises)
    )
    has_active_promise = any(
        p.status in ["PENDING", "pending", "ACTIVE", "active"] for p in context.promises
    )

    # Check exception signals
    has_open_exception = len(context.exceptions) > 0 or any(
        e.status in ["OPEN", "open", "EXPLAINED", "explained"] for e in context.exceptions
    )

    # Check dispute signals in communication logs
    dispute_keywords = ["dispute", "incorrect", "wrong invoice", "short pay", "deduction"]
    has_dispute = any(
        any(kw in (c.message or "").lower() for kw in dispute_keywords)
        for c in context.communications
    )

    # Partial payment indicator
    has_partial_payment = inv.paidAmount > 0 and inv.outstandingAmount > 0

    # Count communications
    recent_inbound = sum(1 for c in context.communications if c.direction.upper() == "INBOUND")
    recent_outbound = sum(1 for c in context.communications if c.direction.upper() == "OUTBOUND")

    return DeterministicSignals(
        outstandingAmount=inv.outstandingAmount,
        daysOverdue=inv.daysOverdue,
        averagePaymentDelayDays=cust.averagePaymentDelayDays,
        overdueInvoiceCount=cust.overdueInvoices,
        totalPromises=cust.totalPromises,
        brokenPromiseCount=cust.brokenPromises,
        hasActivePromise=has_active_promise,
        hasBrokenPromise=has_broken_promise,
        hasOpenException=has_open_exception,
        hasDispute=has_dispute,
        hasPartialPayment=has_partial_payment,
        recentCommunicationCount=len(context.communications),
        recentInboundCount=recent_inbound,
        recentOutboundCount=recent_outbound,
        paymentCount=len(context.payments),
    )

def compute_baseline_priority(context: NormalizedContext) -> BaselineAnalysis:
    signals = compute_deterministic_signals(context)
    inv = context.invoice
    cust = context.customer

    # 1. Outstanding Exposure Score (Max 35.0)
    exposure_score = min(35.0, (inv.outstandingAmount / 1000000.0) * 35.0)

    # 2. Days Overdue Score (Max 40.0)
    overdue_score = min(40.0, inv.daysOverdue * 1.25)

    # 3. Broken Promise Score (Max 15.0)
    broken_promise_score = min(15.0, cust.brokenPromises * 7.5)

    # 4. Exception / Dispute Score (Max 10.0)
    exception_score = 10.0 if (signals.hasOpenException or signals.hasDispute) else 0.0

    raw_score = exposure_score + overdue_score + broken_promise_score + exception_score
    baseline_score = min(100.0, round(raw_score * 10) / 10.0)

    # Priority Mapping Thresholds matching TypeScript build-signals.ts
    if baseline_score >= 70 or inv.daysOverdue > 60 or cust.brokenPromises > 1:
        priority = "CRITICAL"
    elif baseline_score >= 45 or inv.daysOverdue > 30:
        priority = "HIGH"
    elif baseline_score >= 20 or inv.daysOverdue > 0:
        priority = "MEDIUM"
    else:
        priority = "LOW"

    # Build Factual Signal Summary Bullets
    summary = [
        f"Outstanding: ₹{inv.outstandingAmount:,.0f}",
        f"Days Overdue: {inv.daysOverdue} days",
    ]

    if signals.hasBrokenPromise:
        summary.append(f"Broken Promise Flagged ({cust.brokenPromises})")
    if signals.hasOpenException:
        summary.append("Open Reconciliation Exception Flagged")
    if signals.hasDispute:
        summary.append("Dispute/Deduction Indicator Detected")
    if signals.hasPartialPayment:
        summary.append(f"Partial Payment Recorded (₹{inv.paidAmount:,.0f})")

    return BaselineAnalysis(
        invoiceId=inv.invoiceId,
        invoiceNumber=inv.invoiceNumber,
        outstandingAmount=inv.outstandingAmount,
        daysOverdue=inv.daysOverdue,
        signals=signals,
        baselineScore=baseline_score,
        baselinePriority=priority,
        signalSummary=summary,
    )
