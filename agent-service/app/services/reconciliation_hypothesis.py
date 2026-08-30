from typing import Dict, Any, List, Tuple

def calculate_evidence_quality_score(
    level_1_evidence: List[str],
    level_2_evidence: List[str],
    level_3_evidence: List[str],
    level_4_evidence: List[str],
    has_conflict: bool,
) -> float:
    """
    Computes deterministic Evidence Quality Score (0 to 100 normalized to 0.0 - 1.0).
    Formula:
      L1_Proof (40) + L2_Metadata (25) + L3_History (15) + L4_Comms (20) - Conflict_Penalty (50)
    """
    score = 0

    if len(level_1_evidence) > 0:
        score += 40
    if len(level_2_evidence) > 0:
        score += 25
    if len(level_3_evidence) > 0:
        score += 15
    if len(level_4_evidence) > 0:
        score += 20

    if has_conflict:
        score -= 50

    score_clamped = max(10, min(100, score))
    return round(score_clamped / 100.0, 2)


def build_reconciliation_hypotheses(
    exception: Dict[str, Any],
    invoice: Dict[str, Any],
    payment: Dict[str, Any],
    signals: Dict[str, Any],
    expected_amount: float,
    received_amount: float,
    difference: float,
    allocated_amount: float,
    unallocated_amount: float,
) -> Dict[str, Any]:
    """
    Generates, scores, and ranks candidate reconciliation hypotheses using an evidence priority hierarchy.
    Level 1 (Direct Financial Facts) > Level 2 (Metadata) > Level 3 (History) > Level 4 (Communications).
    Level 4 Communication claims can NEVER override contradictory Level 1 facts.
    """
    db_exc_type = str(exception.get("exception_type", "")).upper()
    diff_abs = abs(difference)
    diff_ratio = 0.0 if expected_amount == 0 else diff_abs / expected_amount
    pmt_method = str(payment.get("payment_method", "")).upper()
    has_conflict = bool(signals.get("has_conflict", False))

    level_1_evidence: List[str] = []
    level_2_evidence: List[str] = []
    level_3_evidence: List[str] = []
    level_4_evidence: List[str] = []

    # Build Level 1 Evidence (Direct Financial Facts)
    if expected_amount > 0 or received_amount > 0:
        level_1_evidence.append(f"Level 1 Fact: Expected total INR {expected_amount:,.2f} vs Received INR {received_amount:,.2f} (Discrepancy: INR {diff_abs:,.2f}).")
    if allocated_amount > 0:
        level_1_evidence.append(f"Level 1 Fact: Payment allocated amount INR {allocated_amount:,.2f} (Coverage ratio: {1.0 if received_amount == 0 else allocated_amount/received_amount:.1%}).")
    elif received_amount > 0 and allocated_amount == 0:
        level_1_evidence.append(f"Level 1 Fact: Unallocated payment — received INR {received_amount:,.2f} with 0 allocation.")


    # Build Level 2 Evidence (Transaction Metadata)
    if pmt_method and pmt_method != "UNKNOWN":
        level_2_evidence.append(f"Level 2 Metadata: Verified payment method '{pmt_method}'.")
    pmt_ref = str(payment.get("reference_number") or payment.get("reference") or "-")
    if pmt_ref != "-":
        level_2_evidence.append(f"Level 2 Metadata: Transaction reference '{pmt_ref}'.")

    # Build Level 3 Evidence (Customer History)
    if exception.get("customer_name"):
        level_3_evidence.append(f"Level 3 History: Customer account '{exception.get('customer_name')}' transaction history.")

    # Build Level 4 Evidence (Communication Claims)
    for comm_sig in signals.get("communication_signals", []):
        level_4_evidence.append(f"Level 4 Communication Claim: Extracted qualitative signal '{comm_sig}'.")

    candidates: List[Dict[str, Any]] = []

    def add_candidate(hypothesis: str, score: float, reasons: List[str]):
        candidates.append({
            "hypothesis": hypothesis,
            "score": round(score, 2),
            "reasons": reasons,
        })

    # If data conflict detected, penalize all specific hypotheses and promote UNKNOWN
    if has_conflict:
        add_candidate("UNKNOWN", 0.90, [f"Data Conflict Detected: {signals.get('conflict_reason')}"])
    else:
        # 1. TDS Candidate Evaluation
        tds_reasons = []
        tds_score = 0.0
        if expected_amount > received_amount and (0.01 <= diff_ratio <= 0.25) and pmt_method in ["BANK_TRANSFER", "NEFT", "RTGS", "ACH", "CHQ"]:
            tds_score += 0.55
            tds_reasons.append(f"Level 1 & 2 Fact: Discrepancy of INR {diff_abs:,.2f} ({diff_ratio*100:.1f}%) on {pmt_method} matches statutory tax withholding threshold.")
        if "SIGNAL_TDS_WITHHOLDING" in signals.get("communication_signals", []):
            tds_score += 0.25
            tds_reasons.append("Level 4 Comms: Customer communication explicitly references tax withholding / Form 16A.")
        if db_exc_type == "TDS":
            tds_score += 0.15
            tds_reasons.append("Exception Database Record: DB type specifies TDS.")
        if tds_score > 0:
            add_candidate("TDS", min(0.98, tds_score), tds_reasons)

        # 2. MDR Candidate Evaluation
        mdr_reasons = []
        mdr_score = 0.0
        if expected_amount > received_amount and (0.005 <= diff_ratio <= 0.04) and pmt_method in ["CARD", "CREDIT_CARD", "UPI", "PAYMENT_GATEWAY", "ONLINE", "RAZORPAY"]:
            mdr_score += 0.60
            mdr_reasons.append(f"Level 1 & 2 Fact: Gateway fee discrepancy of INR {diff_abs:,.2f} ({diff_ratio*100:.2f}%) on {pmt_method} transaction.")
        if "SIGNAL_MDR_GATEWAY_FEE" in signals.get("communication_signals", []):
            mdr_score += 0.25
            mdr_reasons.append("Level 4 Comms: Communication references merchant discount rate / gateway processing fees.")
        if db_exc_type == "MDR":
            mdr_score += 0.10
            mdr_reasons.append("Exception Database Record: DB type specifies MDR.")
        if mdr_score > 0:
            add_candidate("MDR", min(0.95, mdr_score), mdr_reasons)

        # 3. GST Candidate Evaluation
        gst_reasons = []
        gst_score = 0.0
        if expected_amount > received_amount and (0.15 <= diff_ratio <= 0.20):
            gst_score += 0.50
            gst_reasons.append(f"Level 1 Fact: Discrepancy ratio of {diff_ratio*100:.1f}% matches 18% GST tax rate component mismatch.")
        if "SIGNAL_GST_TAX_DISCREPANCY" in signals.get("communication_signals", []):
            gst_score += 0.30
            gst_reasons.append("Level 4 Comms: Communication references GST tax treatment discrepancy.")
        if db_exc_type in ["GST", "TAX"]:
            gst_score += 0.15
            gst_reasons.append("Exception Database Record: DB type specifies GST.")
        if gst_score > 0:
            add_candidate("GST", min(0.92, gst_score), gst_reasons)

        # 4. Partial Payment Candidate Evaluation
        partial_reasons = []
        partial_score = 0.0
        if received_amount > 0 and received_amount < expected_amount:
            partial_score += 0.60
            partial_reasons.append(f"Level 1 Fact: Received INR {received_amount:,.2f} against expected INR {expected_amount:,.2f} (Residual: INR {difference:,.2f}).")
        if "SIGNAL_PARTIAL_PAYMENT_TRANCHE" in signals.get("communication_signals", []):
            partial_score += 0.20
            partial_reasons.append("Level 4 Comms: Customer communication references installment tranche.")
        if db_exc_type == "PARTIAL_PAYMENT":
            partial_score += 0.15
            partial_reasons.append("Exception Database Record: DB type specifies PARTIAL_PAYMENT.")
        if partial_score > 0:
            add_candidate("PARTIAL_PAYMENT", min(0.96, partial_score), partial_reasons)

        # 5. Overpayment / Duplicate Payment Candidate Evaluation
        dup_reasons = []
        dup_score = 0.0
        if received_amount > expected_amount:
            dup_score += 0.70
            dup_reasons.append(f"Level 1 Fact: Received INR {received_amount:,.2f} exceeds expected invoice total INR {expected_amount:,.2f} by INR {abs(difference):,.2f}.")
        if "SIGNAL_DUPLICATE_PAYMENT_EXCESS" in signals.get("communication_signals", []):
            dup_score += 0.20
            dup_reasons.append("Level 4 Comms: Communication references duplicate transfer.")
        if db_exc_type == "DUPLICATE_PAYMENT":
            dup_score += 0.10
            dup_reasons.append("Exception Database Record: DB type specifies DUPLICATE_PAYMENT.")
        if dup_score > 0:
            add_candidate("DUPLICATE_PAYMENT", min(0.96, dup_score), dup_reasons)

        # 6. Unallocated Payment Candidate Evaluation
        unalloc_reasons = []
        unalloc_score = 0.0
        if received_amount > 0 and allocated_amount == 0:
            unalloc_score += 0.85
            unalloc_reasons.append(f"Level 1 Fact: Successful payment of INR {received_amount:,.2f} has zero allocation to target invoice.")
            add_candidate("UNALLOCATED_PAYMENT", min(0.95, unalloc_score), unalloc_reasons)


        # 7. Refund Candidate Evaluation
        refund_reasons = []
        refund_score = 0.0
        if signals.get("refund_signal"):
            refund_score += 0.75
            refund_reasons.append("Level 2 Metadata & Comms: Reversal / chargeback refund markers detected.")
            add_candidate("REFUND", min(0.92, refund_score), refund_reasons)

        # 8. Wrong Invoice Candidate Evaluation
        wrong_reasons = []
        wrong_score = 0.0
        if signals.get("wrong_invoice_signal"):
            wrong_score += 0.70
            wrong_reasons.append("Level 2 Metadata & Comms: Reference indicates mismatch with target invoice.")
            add_candidate("WRONG_INVOICE", min(0.90, wrong_score), wrong_reasons)

    # Fallback UNKNOWN candidate
    unknown_score = 0.40 if len(candidates) == 0 else 0.20
    add_candidate("UNKNOWN", unknown_score, ["Supporting Level 1 transaction evidence is incomplete or inconclusive."])

    # Sort candidates by score descending
    candidates.sort(key=lambda c: c["score"], reverse=True)
    ranked_hypotheses = [c["hypothesis"] for c in candidates]
    top_hypothesis = candidates[0]["hypothesis"] if candidates else "UNKNOWN"

    evidence_quality = calculate_evidence_quality_score(
        level_1_evidence, level_2_evidence, level_3_evidence, level_4_evidence, has_conflict
    )

    return {
        "candidate_hypotheses": candidates,
        "ranked_hypotheses": ranked_hypotheses,
        "top_hypothesis": top_hypothesis,
        "evidence_quality_score": evidence_quality,
        "level_1_evidence": level_1_evidence,
        "level_2_evidence": level_2_evidence,
        "level_3_evidence": level_3_evidence,
        "level_4_evidence": level_4_evidence,
    }
