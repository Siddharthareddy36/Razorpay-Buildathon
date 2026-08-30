from typing import Dict, Any, List
from app.state.supervisor_state import SupervisorState

def evaluate_supervisor_policy_rules(state: SupervisorState) -> Dict[str, Any]:
    """
    Applies Supervisor Policy Gate & Safety Rules (Phase 6.1 Hardened).
    Precedence Order:
      1. NOT_FOUND Entity Policy -> REJECTED / NOT_FOUND
      2. Ambiguous Query Clarification Policy -> HUMAN_REVIEW
      3. Unsafe Financial Mutation -> REJECTED
      4. Specialist Rejection Preservation -> REJECTED
      5. Cross-Agent Conflict Gate -> HUMAN_REVIEW
      6. Specialist Human Review Preservation -> HUMAN_REVIEW
      7. Default Approved -> APPROVED
    """
    rules_triggered: List[str] = []

    intent = state.get("detected_intent")

    # Rule 0A: NOT_FOUND Entity Safety
    if intent == "NOT_FOUND":
        rules_triggered.append("RULE_0A_NOT_FOUND_ENTITY_SAFETY")
        return {
            "policy_decision": "REJECTED",
            "policy_reason": f"Execution halted because requested entity '{state.get('missing_entity_id')}' does not exist in database.",
            "rules_triggered": rules_triggered,
        }

    # Rule 0B: Ambiguous Query Clarification Safety
    if intent == "UNKNOWN":
        rules_triggered.append("RULE_0B_AMBIGUOUS_CLARIFICATION_SAFETY")
        return {
            "policy_decision": "HUMAN_REVIEW",
            "policy_reason": "Query is ambiguous. User clarification requested before executing specialist agent reasoning.",
            "rules_triggered": rules_triggered,
        }

    user_q = str(state.get("user_query") or "").lower()
    rec_action = str(state.get("final_recommendation") or "").lower()
    specialist_results = state.get("specialist_results") or {}
    has_conflict = bool(state.get("has_cross_agent_conflict", False))
    conflict_summary = state.get("conflict_summary")

    # Rule 1: Unsafe Financial Mutation Block
    mutation_keywords = ["write off", "cancel invoice", "waive balance", "adjust total", "refund customer", "mark as settled", "post accounting entry"]
    if any(kw in rec_action for kw in mutation_keywords) or any(kw in user_q for kw in mutation_keywords):
        rules_triggered.append("RULE_4_UNSAFE_BALANCE_MUTATION_BLOCK")
        return {
            "policy_decision": "REJECTED",
            "policy_reason": "Supervisor blocked request proposing unsafe financial balance write-off, invoice total waiver, or accounting mutation.",
            "rules_triggered": rules_triggered,
        }

    # Gather specialist policy decisions
    spec_decisions = []
    for spec_name, spec_res in specialist_results.items():
        if isinstance(spec_res, dict):
            dec = str(spec_res.get("policy_decision") or spec_res.get("policyDecision") or "").upper()
            if dec:
                spec_decisions.append((spec_name, dec))

    # Rule 2: Specialist Rejection Preservation
    for spec_name, dec in spec_decisions:
        if dec == "REJECTED":
            rules_triggered.append("RULE_1_SPECIALIST_REJECTION_PRESERVATION")
            return {
                "policy_decision": "REJECTED",
                "policy_reason": f"Supervisor preserved policy REJECTED decision from {spec_name.upper()} Agent.",
                "rules_triggered": rules_triggered,
            }

    # Rule 3: Cross-Agent Conflict Gate
    if has_conflict:
        rules_triggered.append("RULE_3_CROSS_AGENT_CONFLICT_GATE")
        return {
            "policy_decision": "HUMAN_REVIEW",
            "policy_reason": f"Cross-agent conflict detected: {conflict_summary}",
            "rules_triggered": rules_triggered,
        }

    # Rule 4: Specialist Human Review Preservation
    for spec_name, dec in spec_decisions:
        if dec == "HUMAN_REVIEW":
            rules_triggered.append("RULE_2_CRITICAL_HUMAN_REVIEW_PRESERVATION")
            return {
                "policy_decision": "HUMAN_REVIEW",
                "policy_reason": f"Supervisor preserved HUMAN_REVIEW requirement from {spec_name.upper()} Agent.",
                "rules_triggered": rules_triggered,
            }

    rules_triggered.append("RULE_5_DEFAULT_APPROVED")
    return {
        "policy_decision": "APPROVED",
        "policy_reason": "All specialist and cross-agent policy guardrails passed.",
        "rules_triggered": rules_triggered,
    }
