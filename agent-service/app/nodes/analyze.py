from typing import Dict, Any
from app.state.receivables_state import ReceivablesState
from app.services.gemini import call_gemini_api
from app.models.agent_output import AgentStructuredOutput

def analyze_with_gemini_node(state: ReceivablesState) -> Dict[str, Any]:
    # Build normalized context payload for LLM
    context_payload = {
        "invoice": {
            "number": state.get("invoice_number"),
            "amount": state.get("invoice_amount"),
            "outstanding": state.get("outstanding_amount"),
            "daysOverdue": state.get("days_overdue"),
            "status": state.get("invoice_status"),
        },
        "customer": {
            "name": state.get("customer_name"),
            "averagePaymentDelayDays": state.get("average_payment_delay_days"),
            "overdueInvoices": state.get("overdue_invoice_count"),
            "brokenPromises": state.get("broken_promise_count"),
        },
        "signals": state.get("signals", {}),
        "baseline": {
            "score": state.get("baseline_score"),
            "priority": state.get("baseline_priority"),
        },
    }

    # 1. Attempt Gemini API invocation
    llm_output: AgentStructuredOutput | None = call_gemini_api(context_payload)

    # 2. Use Deterministic Reasoning Fallback Engine if Gemini API key missing or request fails
    if not llm_output:
        llm_output = generate_deterministic_fallback(state)
        reasoning_mode = "DETERMINISTIC_FALLBACK"
    else:
        reasoning_mode = "GEMINI"

    return {
        "agent_priority": llm_output.priority,
        "priority_reason": llm_output.priorityReason,
        "evidence": llm_output.evidence,
        "recommended_action": llm_output.recommendedAction,
        "confidence": llm_output.confidence,
        "reasoning_mode": reasoning_mode,
    }

def generate_deterministic_fallback(state: ReceivablesState) -> AgentStructuredOutput:
    priority = state.get("baseline_priority", "LOW")
    amt = state.get("outstanding_amount", 0.0)
    days = state.get("days_overdue", 0)
    broken_promises = state.get("broken_promise_count", 0)
    cust_name = state.get("customer_name", "Customer")
    inv_num = state.get("invoice_number", "INV")

    evidence = []
    if days > 0:
        evidence.append(f"Invoice {inv_num} is {days} days overdue with balance of ₹{amt:,.0f}.")
    else:
        evidence.append(f"Invoice {inv_num} has balance of ₹{amt:,.0f} and is not yet overdue.")

    if broken_promises > 0:
        evidence.append(f"Customer {cust_name} has {broken_promises} historical broken payment promise(s).")

    if state.get("dispute_signal"):
        evidence.append("Recent communications indicate active customer inquiry or payment dispute.")

    if state.get("open_exception_count", 0) > 0:
        evidence.append("Open reconciliation exception (short pay / TDS discrepancy) requires account verification.")

    if state.get("has_partial_payment"):
        evidence.append(f"Partial payment of ₹{state.get('paid_amount', 0):,.0f} credited.")

    if priority == "CRITICAL":
        reason = f"High-exposure receivable (₹{amt:,.0f}) is {days} days past due with elevated account risk signals."
        action = "Escalate immediately to senior credit manager for formal outreach and payment commitment confirmation."
    elif priority == "HIGH":
        reason = f"Overdue balance of ₹{amt:,.0f} ({days} days past due) requires active collection follow-up."
        action = "Issue formal payment reminder and contact customer accounts payable team."
    elif priority == "MEDIUM":
        reason = f"Account carrying balance of ₹{amt:,.0f} requires standard collection monitoring."
        action = "Send standard automated payment reminder notice."
    else:
        reason = f"Current invoice carrying ₹{amt:,.0f} balance within normal terms."
        action = "Maintain regular ledger monitoring until due date."

    return AgentStructuredOutput(
        priority=priority,
        priorityReason=reason,
        evidence=evidence,
        recommendedAction=action,
        confidence=0.92,
    )
