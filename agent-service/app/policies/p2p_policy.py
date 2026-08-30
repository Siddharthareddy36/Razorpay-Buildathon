from typing import Dict, Any, List, Tuple
from app.state.p2p_state import P2PAgentState

def evaluate_p2p_policy_rules(state: P2PAgentState) -> Dict[str, Any]:
    """
    Applies deterministic safety guardrails to P2P Agent recommendations.
    Precedence:
      1. Unsafe Financial Mutation -> REJECTED
      2. Data Consistency Warning -> HUMAN_REVIEW
      3. Paid Invoice Protection -> APPROVED (NO_ACTION)
      4. Active Dispute Pause -> HUMAN_REVIEW
      5. Missing Payment Evidence -> HUMAN_REVIEW
      6. Low Confidence Gate (< 0.60) -> HUMAN_REVIEW
      7. Active Promise Unexpired -> APPROVED (MONITOR)
      8. Broken Promise Escalation -> APPROVED (COLLECT)
    """
    rules_triggered: List[str] = []
    policy_decision = "APPROVED"
    policy_reason = "All deterministic safety policy guardrails passed."
    safe_action = state.get("recommended_action") or "Monitor account"

    inv_status = str(state.get("invoice_status", "")).upper()
    outstanding = float(state.get("invoice_outstanding_amount", 0.0))
    fulfilled_amt = float(state.get("fulfilled_amount", 0.0))
    promised_amt = float(state.get("promised_amount", 0.0))
    deterministic_state = str(state.get("deterministic_promise_state", "ACTIVE")).upper()
    commitment_reliability = str(state.get("commitment_reliability", "MEDIUM")).upper()
    data_warning = bool(state.get("data_consistency_warning", False))
    dispute_signal = bool(state.get("dispute_signal", False))
    exceptions = state.get("exception_context") or []
    has_evidence = bool(state.get("has_qualifying_payment_evidence", False))
    confidence = float(state.get("confidence", 0.90))
    recommended_action = str(state.get("recommended_action", "")).lower()

    # Rule 1: Unsafe Financial Mutation
    mutation_keywords = ["write off", "cancel invoice", "waive balance", "adjust total", "refund customer"]
    if any(kw in recommended_action for kw in mutation_keywords):
        rules_triggered.append("RULE_7_UNSAFE_FINANCIAL_MUTATION")
        return {
            "policy_decision": "REJECTED",
            "policy_reason": "AI recommendation proposes unsafe financial data mutation or balance alteration.",
            "rules_triggered": rules_triggered,
            "safe_action": "BLOCK_ACTION_REQUIRED_HUMAN_APPROVAL",
        }

    # Rule 2: Data Consistency Warning
    if data_warning:
        rules_triggered.append("RULE_5_DATA_CONSISTENCY_WARNING")
        return {
            "policy_decision": "HUMAN_REVIEW",
            "policy_reason": "Conflict detected between database status and deterministic payment allocation evidence.",
            "rules_triggered": rules_triggered,
            "safe_action": "FLAG_FOR_OPERATIONAL_DATA_AUDIT",
        }

    # Rule 3: Paid Invoice Protection
    if inv_status == "PAID" or outstanding <= 0:
        rules_triggered.append("RULE_1_PAID_INVOICE_PROTECTION")
        return {
            "policy_decision": "APPROVED",
            "policy_reason": "Invoice balance is zero/paid. Automated collections halted.",
            "rules_triggered": rules_triggered,
            "safe_action": "NO_ACTION_INVOICE_FULFILLED",
        }

    # Rule 4: Active Dispute / Exception Pause
    if dispute_signal or len(exceptions) > 0:
        rules_triggered.append("RULE_3_DISPUTED_INVOICE_PAUSE")
        return {
            "policy_decision": "HUMAN_REVIEW",
            "policy_reason": "Active invoice dispute or reconciliation exception detected. Automated escalation paused for human review.",
            "rules_triggered": rules_triggered,
            "safe_action": "PAUSE_COLLECTIONS_RESOLVE_DISPUTE",
        }

    # Rule 5: Claimed Fulfillment without Payment Evidence
    if state.get("promise_db_status") == "FULFILLED" and not has_evidence:
        rules_triggered.append("RULE_4_MISSING_PAYMENT_EVIDENCE")
        return {
            "policy_decision": "HUMAN_REVIEW",
            "policy_reason": "Promise is marked FULFILLED in database but missing verified bank allocation evidence.",
            "rules_triggered": rules_triggered,
            "safe_action": "REQUEST_BANK_REMITTANCE_PROOF",
        }

    # Rule 6: Low Confidence Gate
    if confidence < 0.60:
        rules_triggered.append("RULE_6_LOW_CONFIDENCE_GATE")
        return {
            "policy_decision": "HUMAN_REVIEW",
            "policy_reason": f"Agent reasoning confidence ({confidence:.2f}) is below the required 0.60 safety threshold.",
            "rules_triggered": rules_triggered,
            "safe_action": "MANUAL_OPERATIONAL_REVIEW",
        }

    # Rule 7: Active Promise Unexpired
    if deterministic_state == "ACTIVE" and state.get("days_until_promise", 0) >= 0:
        if has_evidence and fulfilled_amt >= promised_amt:
            rules_triggered.append("RULE_2_ACTIVE_PROMISE_VERIFIED_PAYMENT")
            return {
                "policy_decision": "APPROVED",
                "policy_reason": "Active promise backed by full qualifying payment evidence in Supabase.",
                "rules_triggered": rules_triggered,
                "safe_action": "MONITOR_PAYMENT_CLEARANCE",
            }
        else:
            rules_triggered.append("RULE_9_ACTIVE_UNEXPIRED_PROMISE_MONITORING")
            return {
                "policy_decision": "APPROVED",
                "policy_reason": "Promise date is unexpired. Maintain standard monitoring until promised date.",
                "rules_triggered": rules_triggered,
                "safe_action": "MONITOR_UNTIL_PROMISED_DATE",
            }

    # Rule 8: Broken Promise Escalation
    if deterministic_state in ["BROKEN", "PARTIALLY_FULFILLED"] or state.get("days_past_promise", 0) > 0:
        rules_triggered.append("RULE_8_BROKEN_PROMISE_ESCALATION_APPROVED")
        return {
            "policy_decision": "APPROVED",
            "policy_reason": f"Approved collections escalation for {deterministic_state} promise with {commitment_reliability} commitment reliability.",
            "rules_triggered": rules_triggered,
            "safe_action": safe_action or "INITIATE_OUTBOUND_COLLECTIONS_CALL",
        }

    return {
        "policy_decision": policy_decision,
        "policy_reason": policy_reason,
        "rules_triggered": rules_triggered,
        "safe_action": safe_action,
    }
