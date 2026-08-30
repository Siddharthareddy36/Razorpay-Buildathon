from typing import Dict, Any
from app.state.receivables_state import ReceivablesState
from app.services.context import fetch_invoice_context_by_number
from app.services.signals import compute_baseline_priority

def baseline_node(state: ReceivablesState) -> Dict[str, Any]:
    invoice_number = state.get("invoice_number")
    if not invoice_number:
        return {"workflow_status": "FAILED", "error": "Missing invoice_number in state for baseline calculation."}

    context = fetch_invoice_context_by_number(invoice_number)
    if not context:
        return {"workflow_status": "FAILED", "error": f"Failed to fetch context for baseline node: '{invoice_number}'."}

    analysis = compute_baseline_priority(context)

    return {
        "baseline_score": analysis.baselineScore,
        "baseline_priority": analysis.baselinePriority,
        "signal_summary": analysis.signalSummary,
    }
