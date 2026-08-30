from datetime import datetime, date, timezone
from typing import Dict, Any, List, Tuple

def evaluate_p2p_deterministic(
    promise: Dict[str, Any],
    invoice: Dict[str, Any],
    payments: List[Dict[str, Any]],
    payment_allocations: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Evaluates promise fulfillment and promise state strictly using deterministic formulas and payment evidence.
    """
    promised_amount = float(promise.get("promised_amount", 0.0))
    promised_date_str = str(promise.get("promised_date", ""))
    db_status = str(promise.get("status", "ACTIVE")).upper()
    invoice_amount = float(invoice.get("amount", 0.0))
    invoice_paid = float(invoice.get("paid_amount", 0.0))

    # Parse promised date
    today = datetime.now(timezone.utc).date()
    days_until_promise = 0
    days_past_promise = 0
    promised_dt: date = today

    if promised_date_str:
        try:
            promised_dt = datetime.fromisoformat(promised_date_str.replace("Z", "")).date()
            days_until_promise = (promised_dt - today).days
            days_past_promise = max(0, (today - promised_dt).days)
        except Exception:
            promised_dt = today
            days_until_promise = 0
            days_past_promise = 0

    # Calculate Fulfilled Amount based on Payment Allocations and Payments
    fulfilled_amount = 0.0
    qualifying_payments = []
    payment_occurred_before_promise_date = False

    # Check payment allocations first
    if payment_allocations:
        for alloc in payment_allocations:
            alloc_amt = float(alloc.get("allocated_amount") or 0.0)
            if alloc_amt > 0:
                fulfilled_amount += alloc_amt
                pmt_info = alloc.get("payments") or {}
                pmt_date_str = pmt_info.get("payment_date") or alloc.get("allocated_at") or ""
                qualifying_payments.append({
                    "allocation_id": alloc.get("id"),
                    "amount": alloc_amt,
                    "date": pmt_date_str,
                    "method": pmt_info.get("payment_method", "Bank Transfer"),
                    "reference": pmt_info.get("reference_number", "-"),
                })
                if pmt_date_str:
                    try:
                        p_date = datetime.fromisoformat(pmt_date_str.replace("Z", "+00:00")).date()
                        if p_date <= promised_dt:
                            payment_occurred_before_promise_date = True
                    except Exception:
                        pass
    elif invoice_paid > 0:
        # Fallback: check invoice paid amount
        fulfilled_amount = min(promised_amount, invoice_paid)
        for pmt in payments:
            amt = float(pmt.get("amount", 0.0))
            if amt > 0:
                qualifying_payments.append({
                    "payment_id": pmt.get("id"),
                    "amount": amt,
                    "date": pmt.get("payment_date") or pmt.get("createdAt"),
                    "method": pmt.get("paymentMethod") or pmt.get("payment_method", "Bank Transfer"),
                    "reference": pmt.get("reference") or pmt.get("reference_number", "-"),
                })

    has_qualifying_payment_evidence = len(qualifying_payments) > 0 and fulfilled_amount > 0
    remaining_promised_amount = max(0.0, promised_amount - fulfilled_amount)

    fulfillment_ratio = 1.0 if promised_amount == 0 else min(1.0, max(0.0, fulfilled_amount / promised_amount))

    # Deterministic Promise State Logic
    # 1. FULFILLED: fulfilled_amount >= promised_amount AND has_qualifying_payment_evidence
    # 2. PARTIALLY_FULFILLED: 0 < fulfilled_amount < promised_amount AND days_past_promise > 0
    # 3. BROKEN: days_past_promise > 0 AND fulfilled_amount < promised_amount
    # 4. ACTIVE: days_until_promise >= 0 AND fulfilled_amount < promised_amount

    if fulfilled_amount >= promised_amount and promised_amount > 0:
        deterministic_state = "FULFILLED"
    elif days_until_promise >= 0 and fulfilled_amount < promised_amount:
        if fulfilled_amount > 0:
            deterministic_state = "PARTIALLY_FULFILLED"
        else:
            deterministic_state = "ACTIVE"
    else:  # Promise date has passed (days_past_promise > 0)
        if fulfilled_amount > 0:
            deterministic_state = "PARTIALLY_FULFILLED"
        else:
            deterministic_state = "BROKEN"

    # Detect Data Consistency Warnings
    data_consistency_warning = False
    warning_reasons = []

    if db_status in ["FULFILLED", "FULFILLED_CLAIMED"] and (fulfilled_amount < promised_amount or not has_qualifying_payment_evidence):
        data_consistency_warning = True
        warning_reasons.append(f"DB status is FULFILLED, but fulfilled amount (₹{fulfilled_amount:,.2f}) is less than promised amount (₹{promised_amount:,.2f}) or missing payment evidence.")
    
    if db_status in ["BROKEN"] and fulfilled_amount >= promised_amount and has_qualifying_payment_evidence:
        data_consistency_warning = True
        warning_reasons.append(f"DB status is BROKEN, but qualifying payment evidence proves full fulfillment (₹{fulfilled_amount:,.2f}).")

    if db_status in ["ACTIVE", "PENDING"] and fulfilled_amount >= promised_amount and promised_amount > 0:
        data_consistency_warning = True
        warning_reasons.append(f"DB status is {db_status}, but payment allocations show full fulfillment (₹{fulfilled_amount:,.2f}).")

    return {
        "promised_amount": promised_amount,
        "promised_date": promised_date_str,
        "promise_db_status": db_status,
        "fulfilled_amount": fulfilled_amount,
        "remaining_promised_amount": remaining_promised_amount,
        "fulfillment_ratio": round(fulfillment_ratio, 4),
        "days_until_promise": days_until_promise,
        "days_past_promise": days_past_promise,
        "has_qualifying_payment_evidence": has_qualifying_payment_evidence,
        "payment_occurred_before_promise_date": payment_occurred_before_promise_date,
        "qualifying_payments": qualifying_payments,
        "deterministic_promise_state": deterministic_state,
        "data_consistency_warning": data_consistency_warning,
        "warning_reasons": warning_reasons,
    }
