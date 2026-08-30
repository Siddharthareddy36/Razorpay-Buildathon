from typing import Dict, Any, List

def extract_p2p_communication_signals(communications: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Extracts qualitative intent signals from recent communication logs.
    Communicative context provides supporting markers but cannot override financial truth.
    """
    extension_requests = False
    delay_signals = False
    dispute_signal = False
    payment_initiated = False
    cash_flow_issue = False
    communication_signals = []

    for comm in communications:
        text = (comm.get("summary") or comm.get("message") or comm.get("body") or "").lower()
        if not text:
            continue

        if any(kw in text for kw in ["extension", "reschedule", "more time", "push date", "defer"]):
            extension_requests = True
            if "SIGNAL_EXTENSION_REQUESTED" not in communication_signals:
                communication_signals.append("SIGNAL_EXTENSION_REQUESTED")

        if any(kw in text for kw in ["delay", "waiting for funds", "approval pending", "bank delay", "processing"]):
            delay_signals = True
            if "SIGNAL_PAYMENT_DELAY_NOTIFIED" not in communication_signals:
                communication_signals.append("SIGNAL_PAYMENT_DELAY_NOTIFIED")

        if any(kw in text for kw in ["cash flow", "liquidity", "working capital", "fund crunch"]):
            cash_flow_issue = True
            if "SIGNAL_CASH_FLOW_ISSUE" not in communication_signals:
                communication_signals.append("SIGNAL_CASH_FLOW_ISSUE")

        if any(kw in text for kw in ["dispute", "wrong invoice", "billing issue", "mismatch", "short pay", "incorrect"]):
            dispute_signal = True
            if "SIGNAL_DISPUTE_RAISED" not in communication_signals:
                communication_signals.append("SIGNAL_DISPUTE_RAISED")

        if any(kw in text for kw in ["payment sent", "wire initiated", "neft done", "transferred", "remittance advice"]):
            payment_initiated = True
            if "SIGNAL_PAYMENT_INITIATED_CLAIM" not in communication_signals:
                communication_signals.append("SIGNAL_PAYMENT_INITIATED_CLAIM")

    return {
        "extension_requests": extension_requests,
        "delay_signals": delay_signals,
        "dispute_signal": dispute_signal,
        "payment_initiated": payment_initiated,
        "cash_flow_issue": cash_flow_issue,
        "communication_signals": communication_signals,
    }
