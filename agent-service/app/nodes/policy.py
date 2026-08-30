from typing import Dict, Any
from app.state.receivables_state import ReceivablesState
from app.models.policy import (
    PolicyInput,
    PolicyInputInvoice,
    PolicyInputSignals,
    PolicyInputAgent,
)
from app.policies.receivables_policy import evaluate_receivables_policy

def policy_check_node(state: ReceivablesState) -> Dict[str, Any]:
    # Build PolicyInput from state
    inv_input = PolicyInputInvoice(
        status=state.get("invoice_status", "UNKNOWN"),
        outstandingAmount=state.get("outstanding_amount", 0.0),
        daysOverdue=state.get("days_overdue", 0),
    )

    signals_input = PolicyInputSignals(
        hasDispute=state.get("dispute_signal", False),
        hasOpenException=state.get("open_exception_count", 0) > 0,
        hasPartialPayment=state.get("has_partial_payment", False),
    )

    agent_input = PolicyInputAgent(
        priority=state.get("agent_priority", "LOW"),
        recommendedAction=state.get("recommended_action", "No action"),
        confidence=state.get("confidence", 0.0),
    )

    policy_input = PolicyInput(
        invoice=inv_input,
        signals=signals_input,
        agent=agent_input,
        error=state.get("error"),
    )

    decision = evaluate_receivables_policy(policy_input)

    return {
        "policy_decision": decision.decision,
        "policy_reason": decision.reason,
        "rules_triggered": decision.rulesTriggered,
        "safe_action": decision.safeAction or state.get("recommended_action"),
    }
