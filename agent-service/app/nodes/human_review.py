from typing import Dict, Any
from app.state.receivables_state import ReceivablesState

def human_review_node(state: ReceivablesState) -> Dict[str, Any]:
    val_errors = state.get("validation_errors", [])
    error_summary = "; ".join(val_errors) if val_errors else (state.get("error") or "Validation or policy threshold failure.")

    return {
        "policy_decision": "HUMAN_REVIEW",
        "policy_reason": f"System routed to Human Review: {error_summary}",
        "rules_triggered": ["RULE_HUMAN_REVIEW_ROUTED"],
        "safe_action": "Assign invoice to human credit analyst for manual review.",
        "workflow_status": "COMPLETED",
    }
