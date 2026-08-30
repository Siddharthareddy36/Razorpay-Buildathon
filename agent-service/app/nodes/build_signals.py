from typing import Dict, Any
from app.state.receivables_state import ReceivablesState

def build_signals_node(state: ReceivablesState) -> Dict[str, Any]:
    has_broken_promise = state.get("broken_promise_count", 0) > 0
    has_open_exception = state.get("open_exception_count", 0) > 0
    has_dispute = state.get("dispute_signal", False)
    has_partial = state.get("has_partial_payment", False)

    signals_dict = {
        "outstandingAmount": state.get("outstanding_amount", 0.0),
        "daysOverdue": state.get("days_overdue", 0),
        "averagePaymentDelayDays": state.get("average_payment_delay_days", 0),
        "overdueInvoiceCount": state.get("overdue_invoice_count", 0),
        "totalPromises": state.get("total_promises", 0),
        "brokenPromiseCount": state.get("broken_promise_count", 0),
        "hasActivePromise": state.get("active_promise_count", 0) > 0,
        "hasBrokenPromise": has_broken_promise,
        "hasOpenException": has_open_exception,
        "hasDispute": has_dispute,
        "hasPartialPayment": has_partial,
        "recentCommunicationCount": state.get("recent_communication_count", 0),
        "recentInboundCount": state.get("recent_inbound_count", 0),
        "recentOutboundCount": state.get("recent_outbound_count", 0),
        "paymentCount": state.get("payment_count", 0),
    }

    return {"signals": signals_dict}
