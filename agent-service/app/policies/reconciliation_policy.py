from typing import Dict, Any, List
from app.state.reconciliation_state import ReconciliationAgentState

def evaluate_reconciliation_policy_rules(state: ReconciliationAgentState) -> Dict[str, Any]:
    """
    Applies deterministic safety guardrails & policy precedence (Phase 5.5).
    Precedence Order:
      1. Data Conflict Detected -> HUMAN_REVIEW
      2. Unsafe Financial Mutation -> REJECTED
      3. Missing Financial Evidence -> HUMAN_REVIEW
      4. Unknown Reconciliation -> HUMAN_REVIEW
      5. Active Dispute -> HUMAN_REVIEW
      6. Low Confidence Gate (< 0.60) -> HUMAN_REVIEW
      7. Paid Invoice Protection -> APPROVED (NO_ACTION)
      8. Confirmed Tax/Fee Verification -> HUMAN_REVIEW / APPROVED
    """
    rules_triggered: List[str] = []
    policy_decision = "APPROVED"
    policy_reason = "All deterministic reconciliation policy guardrails passed."
    safe_action = state.get("recommended_action") or "Review reconciliation exception"

    inv_status = str(state.get("invoice_status", "")).upper()
    outstanding = float(state.get("invoice_outstanding_amount", 0.0))
    expected_amt = float(state.get("expected_amount", 0.0))
    received_amt = float(state.get("received_amount", 0.0))
    primary_hyp = str(state.get("primary_hypothesis", "UNKNOWN")).upper()
    confidence = float(state.get("confidence", 0.90))
    dispute_signal = bool(state.get("dispute_signal", False))
    has_conflict = bool(state.get("has_conflict", False))
    conflict_reason = state.get("conflict_reason")
    recommended_action = str(state.get("recommended_action", "")).lower()

    # Rule 0: Data Conflict Detected
    if has_conflict:
        rules_triggered.append("RULE_0_DATA_CONFLICT")
        why = f"Data conflict detected: {conflict_reason}"
        details = {
            "whyRequired": why,
            "evidenceConflict": conflict_reason,
            "missingEvidence": "Independent transaction audit required to reconcile level 1 vs level 4 discrepancy.",
            "whatHumanShouldVerify": "Verify bank statement allocation and customer remittance advice before taking action."
        }
        return {
            "policy_decision": "HUMAN_REVIEW",
            "policy_reason": why,
            "rules_triggered": rules_triggered,
            "safe_action": "OPERATOR_MANUAL_DATA_AUDIT",
            "human_review_reason": why,
            "human_review_details": details,
        }

    # Rule 1: Unsafe Financial Mutation
    mutation_keywords = ["write off", "cancel invoice", "waive balance", "adjust total", "refund customer", "mark as settled", "post accounting entry"]
    if any(kw in recommended_action for kw in mutation_keywords):
        rules_triggered.append("RULE_1_UNSAFE_MUTATION")
        return {
            "policy_decision": "REJECTED",
            "policy_reason": "AI recommendation proposes unsafe financial balance write-off or ledger mutation.",
            "rules_triggered": rules_triggered,
            "safe_action": "BLOCK_ACTION_REQUIRED_HUMAN_APPROVAL",
            "human_review_reason": "Unsafe financial data mutation proposed by AI model.",
            "human_review_details": {
                "whyRequired": "AI model proposed balance write-off or ledger mutation.",
                "evidenceConflict": None,
                "missingEvidence": "Finance operator sign-off required.",
                "whatHumanShouldVerify": "Review requested balance adjustment in accounting ledger."
            }
        }

    # Rule 2: Missing Financial Evidence
    if expected_amt == 0 and received_amt == 0:
        rules_triggered.append("RULE_2_MISSING_FINANCIAL_EVIDENCE")
        why = "Missing key transaction financial context in Supabase PostgreSQL."
        return {
            "policy_decision": "HUMAN_REVIEW",
            "policy_reason": why,
            "rules_triggered": rules_triggered,
            "safe_action": "MANUAL_DATA_AUDIT",
            "human_review_reason": why,
            "human_review_details": {
                "whyRequired": why,
                "evidenceConflict": None,
                "missingEvidence": "Invoice amount and payment record missing.",
                "whatHumanShouldVerify": "Verify invoice record creation in ERP/Supabase."
            }
        }

    # Rule 3: Unknown Reconciliation Hypothesis
    if primary_hyp == "UNKNOWN":
        rules_triggered.append("RULE_3_UNKNOWN_RECONCILIATION")
        why = "Reconciliation reason is inconclusive from available Level 1-4 evidence."
        return {
            "policy_decision": "HUMAN_REVIEW",
            "policy_reason": why,
            "rules_triggered": rules_triggered,
            "safe_action": "OPERATOR_MANUAL_RECONCILIATION",
            "human_review_reason": why,
            "human_review_details": {
                "whyRequired": why,
                "evidenceConflict": None,
                "missingEvidence": "Form 16A TDS certificate or gateway fee remittance statement missing.",
                "whatHumanShouldVerify": "Request tax/fee documentation from customer finance department."
            }
        }

    # Rule 4: Active Dispute Pause
    if dispute_signal:
        rules_triggered.append("RULE_4_ACTIVE_DISPUTE")
        why = "Active invoice dispute detected in communication logs."
        return {
            "policy_decision": "HUMAN_REVIEW",
            "policy_reason": why,
            "rules_triggered": rules_triggered,
            "safe_action": "PAUSE_COLLECTIONS_RESOLVE_DISPUTE",
            "human_review_reason": why,
            "human_review_details": {
                "whyRequired": why,
                "evidenceConflict": "Customer contests invoice billing or delivery.",
                "missingEvidence": "Dispute resolution sign-off.",
                "whatHumanShouldVerify": "Contact account owner to resolve commercial dispute."
            }
        }

    # Rule 5: Low Confidence Gate (< 0.60)
    if confidence < 0.60:
        rules_triggered.append("RULE_5_LOW_CONFIDENCE")
        why = f"Agent reasoning confidence ({confidence:.2f}) is below 0.60 threshold."
        return {
            "policy_decision": "HUMAN_REVIEW",
            "policy_reason": why,
            "rules_triggered": rules_triggered,
            "safe_action": "HUMAN_FINANCE_REVIEW",
            "human_review_reason": why,
            "human_review_details": {
                "whyRequired": why,
                "evidenceConflict": None,
                "missingEvidence": "Evidence strength score is weak.",
                "whatHumanShouldVerify": "Review candidate hypotheses against transaction log."
            }
        }

    # Rule 6: Paid Invoice Protection
    if inv_status == "PAID" or outstanding <= 0:
        rules_triggered.append("RULE_6_PAID_INVOICE_PROTECTION")
        return {
            "policy_decision": "APPROVED",
            "policy_reason": "Invoice is fully paid. No collections action required.",
            "rules_triggered": rules_triggered,
            "safe_action": "NO_ACTION_INVOICE_FULFILLED",
            "human_review_reason": None,
            "human_review_details": None,
        }

    # Rule 7: Confirmed Reconciliation Verification (e.g. TDS withholding requires Form 16A audit)
    if primary_hyp in ["TDS", "MDR", "GST", "WRONG_INVOICE", "DUPLICATE_PAYMENT"]:
        rules_triggered.append("RULE_7_CONFIRMED_RECONCILIATION")
        why = f"{primary_hyp} identified. Human operator review required to verify tax/fee documentation."
        return {
            "policy_decision": "HUMAN_REVIEW",
            "policy_reason": why,
            "rules_triggered": rules_triggered,
            "safe_action": safe_action or "REQUEST_TAX_DEDUCTION_CERTIFICATE",
            "human_review_reason": why,
            "human_review_details": {
                "whyRequired": why,
                "evidenceConflict": None,
                "missingEvidence": f"Supporting {primary_hyp} certificate or bank allocation documentation required.",
                "whatHumanShouldVerify": f"Verify {primary_hyp} documentation before closing exception."
            }
        }

    rules_triggered.append("RULE_8_SAFE_RECOMMENDATION")
    return {
        "policy_decision": policy_decision,
        "policy_reason": policy_reason,
        "rules_triggered": rules_triggered,
        "safe_action": safe_action,
        "human_review_reason": None,
        "human_review_details": None,
    }
