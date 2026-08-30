from typing import Dict, Any, List

def detect_reconciliation_conflicts(
    exception: Dict[str, Any],
    invoice: Dict[str, Any],
    payment: Dict[str, Any],
    communications: List[Dict[str, Any]],
    expected_amount: float,
    received_amount: float,
    difference: float,
    allocated_amount: float,
) -> Dict[str, Any]:
    """
    Explicit Data Conflict Detection Engine (Phase 5.5).
    Identifies contradictory evidence between Level 1 Financial Facts and Level 4 Communication claims.
    """
    conflicts: List[str] = []

    db_exc_type = str(exception.get("exception_type", "")).upper()
    pmt_method = str(payment.get("payment_method", "")).upper()
    diff_abs = abs(difference)
    diff_ratio = 0.0 if expected_amount == 0 else diff_abs / expected_amount

    # Aggregate communication text
    comm_text = ""
    for c in communications:
        comm_text += " " + (c.get("summary") or c.get("message") or c.get("body") or "").lower()

    # Rule 1: Customer claims payment made / TDS deducted, but no successful payment record exists
    claims_paid_or_tds = any(kw in comm_text for kw in ["paid", "transferred", "remitted", "tds", "withheld", "form 16a"])
    if claims_paid_or_tds and received_amount == 0:
        conflicts.append("CONFLICT_COMMUNICATION_NO_PAYMENT: Customer claims payment/tax withholding in communications, but no successful payment record exists in Supabase.")

    # Rule 2: TDS claim made, but discrepancy ratio > 25% or payment method is Cash/Card
    if any(kw in comm_text for kw in ["tds", "tax deducted", "form 16a"]) and diff_ratio > 0.25:
        conflicts.append(f"CONFLICT_TDS_MATH_MISMATCH: Customer claims TDS withholding, but discrepancy ratio ({diff_ratio*100:.1f}%) exceeds plausible statutory threshold (<= 25%).")

    # Rule 3: DB exception states PARTIAL_PAYMENT, but received > expected (Overpayment / Duplicate)
    if db_exc_type == "PARTIAL_PAYMENT" and received_amount > expected_amount:
        conflicts.append(f"CONFLICT_OVERPAYMENT_PARTIAL_DB: Database exception record states PARTIAL_PAYMENT, but received amount (₹{received_amount:,.2f}) exceeds expected invoice total (₹{expected_amount:,.2f}).")

    # Rule 4: Exception states UNALLOCATED_PAYMENT, but active payment allocation exists in DB
    if db_exc_type == "UNALLOCATED_PAYMENT" and allocated_amount >= received_amount and received_amount > 0:
        conflicts.append(f"CONFLICT_UNALLOCATED_CLAIM: Exception states UNALLOCATED_PAYMENT, but active payment allocation of ₹{allocated_amount:,.2f} is recorded in Supabase.")

    has_conflict = len(conflicts) > 0
    conflict_reason = conflicts[0] if conflicts else None

    return {
        "has_conflict": has_conflict,
        "conflict_reason": conflict_reason,
        "conflict_details": conflicts,
    }


def extract_reconciliation_signals(
    exception: Dict[str, Any],
    invoice: Dict[str, Any],
    payment: Dict[str, Any],
    communications: List[Dict[str, Any]],
    expected_amount: float,
    received_amount: float,
    difference: float,
    allocated_amount: float,
) -> Dict[str, Any]:
    """
    Extracts qualitative and quantitative signals for reconciliation hypothesis ranking.
    """
    db_exc_type = str(exception.get("exception_type", "")).upper()
    pmt_method = str(payment.get("payment_method", "")).upper()
    pmt_ref = str(payment.get("reference_number") or payment.get("reference") or "").lower()

    # Calculate difference ratio relative to expected
    diff_ratio = 0.0 if expected_amount == 0 else abs(difference) / expected_amount

    # Parse communication text
    comm_text = ""
    for c in communications:
        comm_text += " " + (c.get("summary") or c.get("message") or c.get("body") or "").lower()

    # 1. TDS Signal
    tds_kw = any(kw in comm_text for kw in ["tds", "withholding", "form 16a", "194c", "194j", "tax deducted", "tax withholding"])
    tds_ratio_match = (0.01 <= diff_ratio <= 0.25)
    tds_signal = (tds_kw or (tds_ratio_match and abs(difference) > 0 and pmt_method in ["BANK_TRANSFER", "NEFT", "RTGS", "ACH", "CHQ"]))

    # 2. MDR Signal
    mdr_kw = any(kw in comm_text for kw in ["mdr", "gateway fee", "processing fee", "merchant fee", "bank charge"])
    mdr_method_match = pmt_method in ["CARD", "CREDIT_CARD", "UPI", "PAYMENT_GATEWAY", "ONLINE", "RAZORPAY"]
    mdr_ratio_match = (0.005 <= diff_ratio <= 0.04)
    mdr_signal = (mdr_kw or (mdr_method_match and mdr_ratio_match and difference > 0))

    # 3. GST Signal
    gst_kw = any(kw in comm_text for kw in ["gst", "tax discrepancy", "igst", "cgst", "sgst", "vat"])
    gst_ratio_match = (0.15 <= diff_ratio <= 0.20)
    gst_signal = (gst_kw or (gst_ratio_match and difference > 0))

    # 4. Partial Payment Signal
    partial_kw = any(kw in comm_text for kw in ["part payment", "installment", "balance later", "partial", "tranche", "first installment"])
    partial_payment_signal = (partial_kw or (difference > 0 and received_amount > 0 and not tds_signal and not mdr_signal and not gst_signal))

    # 5. Refund Signal
    refund_kw = any(kw in comm_text or kw in pmt_ref for kw in ["refund", "reversal", "chargeback", "reversed", "returned"])
    refund_signal = refund_kw

    # 6. Wrong Invoice Signal
    wrong_inv_kw = any(kw in comm_text for kw in ["wrong invoice", "incorrect invoice", "wrong account", "billed incorrectly", "misallocated"])
    wrong_invoice_signal = wrong_inv_kw

    # 7. Duplicate Payment Signal
    duplicate_kw = any(kw in comm_text for kw in ["duplicate payment", "paid twice", "double payment", "two transfers"])
    duplicate_payment_signal = (duplicate_kw or (received_amount > expected_amount and difference < 0))

    # 8. Unallocated Payment Signal
    unallocated_payment_signal = (received_amount > 0 and allocated_amount == 0)

    # 9. Overpayment Signal
    overpayment_signal = (received_amount > expected_amount)

    # 10. Dispute Signal
    dispute_kw = any(kw in comm_text for kw in ["dispute", "contested", "refuse to pay", "short pay dispute", "quality issue"])
    dispute_signal = (dispute_kw or bool(exception.get("human_review_required", False) and db_exc_type == "UNKNOWN"))

    communication_signals = []
    if tds_signal: communication_signals.append("SIGNAL_TDS_WITHHOLDING")
    if mdr_signal: communication_signals.append("SIGNAL_MDR_GATEWAY_FEE")
    if gst_signal: communication_signals.append("SIGNAL_GST_TAX_DISCREPANCY")
    if partial_payment_signal: communication_signals.append("SIGNAL_PARTIAL_PAYMENT_TRANCHE")
    if refund_signal: communication_signals.append("SIGNAL_REFUND_REVERSAL")
    if wrong_invoice_signal: communication_signals.append("SIGNAL_WRONG_INVOICE_CLAIM")
    if duplicate_payment_signal: communication_signals.append("SIGNAL_DUPLICATE_PAYMENT_EXCESS")
    if unallocated_payment_signal: communication_signals.append("SIGNAL_UNALLOCATED_PAYMENT")
    if overpayment_signal: communication_signals.append("SIGNAL_OVERPAYMENT_EXCESS")
    if dispute_signal: communication_signals.append("SIGNAL_DISPUTE_RAISED")

    # Run conflict detection
    conflict_res = detect_reconciliation_conflicts(
        exception=exception,
        invoice=invoice,
        payment=payment,
        communications=communications,
        expected_amount=expected_amount,
        received_amount=received_amount,
        difference=difference,
        allocated_amount=allocated_amount,
    )

    return {
        "tds_signal": tds_signal,
        "partial_payment_signal": partial_payment_signal,
        "mdr_signal": mdr_signal,
        "gst_signal": gst_signal,
        "refund_signal": refund_signal,
        "wrong_invoice_signal": wrong_invoice_signal,
        "duplicate_payment_signal": duplicate_payment_signal,
        "unallocated_payment_signal": unallocated_payment_signal,
        "overpayment_signal": overpayment_signal,
        "dispute_signal": dispute_signal,
        "communication_signals": communication_signals,
        "has_conflict": conflict_res["has_conflict"],
        "conflict_reason": conflict_res["conflict_reason"],
        "conflict_details": conflict_res["conflict_details"],
    }
