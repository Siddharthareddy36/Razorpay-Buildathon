from datetime import datetime, timezone
from typing import Dict, Any, Optional

from app.models.action_models import OutcomeTrackingRequest, OutcomeTrackingResponse
from app.services.supabase import get_supabase_client

def track_financial_outcome(request: OutcomeTrackingRequest) -> OutcomeTrackingResponse:
    """
    Independent Financial Outcome Tracking & Recovery Measurement Engine (Part 10 & 11).
    Measures money recovered EXCLUSIVELY from authoritative Supabase PostgreSQL payment records.
    """
    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()

    inv_id = request.invoiceId
    action_id = request.actionId
    window_hours = request.observationWindowHours or 72

    # 1. Query Supabase for authoritative invoice state
    inv_res = supabase.from_("invoices").select("*").eq("id", inv_id).execute()
    if not inv_res.data:
        # Check by invoice_number if inv_id is formatted like INV-1002
        inv_res = supabase.from_("invoices").select("*").eq("invoice_number", inv_id).execute()

    if not inv_res.data:
        return OutcomeTrackingResponse(
            success=False,
            invoiceId=inv_id,
            actionId=action_id,
            outstandingBefore=0.0,
            outstandingAfter=0.0,
            paymentReceivedAfterAction=0.0,
            recoveredAmount=0.0,
            recoveryRatePercentage=0.0,
            outcomeStatus="NO_RECOVERY_OBSERVED",
            observationWindowHours=window_hours,
            evaluatedAt=now_iso
        )

    inv = inv_res.data[0]
    real_inv_id = inv["id"]
    total_amount = float(inv.get("total_amount", 0.0))
    outstanding_after = float(inv.get("outstanding_amount", 0.0))

    # 2. Query payment_allocations table for payment allocations received for this invoice
    alloc_res = supabase.from_("payment_allocations").select("*").eq("invoice_id", real_inv_id).execute()
    allocations_list = alloc_res.data or []

    payment_received_after = sum(float(a.get("allocated_amount", 0.0)) for a in allocations_list)
    outstanding_before = max(outstanding_after, total_amount)

    # Calculate recovered amount: max(0, outstandingBefore - outstandingAfter)
    recovered_amount = max(0.0, outstanding_before - outstanding_after)
    if payment_received_after > 0 and recovered_amount == 0:
        recovered_amount = min(payment_received_after, outstanding_before)

    recovery_rate = (recovered_amount / outstanding_before * 100.0) if outstanding_before > 0 else 0.0

    if recovered_amount >= (outstanding_before - 0.01) and outstanding_before > 0:
        outcome_status = "FULL_RECOVERY_OBSERVED"
    elif recovered_amount > 0:
        outcome_status = "PARTIAL_RECOVERY_OBSERVED"
    else:
        outcome_status = "NO_RECOVERY_OBSERVED"

    return OutcomeTrackingResponse(
        success=True,
        invoiceId=real_inv_id,
        actionId=action_id,
        outstandingBefore=outstanding_before,
        outstandingAfter=outstanding_after,
        paymentReceivedAfterAction=payment_received_after,
        recoveredAmount=recovered_amount,
        recoveryRatePercentage=round(recovery_rate, 2),
        outcomeStatus=outcome_status,
        observationWindowHours=window_hours,
        evaluatedAt=now_iso
    )
