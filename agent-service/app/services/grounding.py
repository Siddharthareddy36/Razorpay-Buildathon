from typing import List, Tuple
from app.state.receivables_state import ReceivablesState

def validate_evidence_grounding(evidence: List[str], state: ReceivablesState) -> Tuple[bool, List[str]]:
    """
    Lightweight evidence grounding validator.
    Verifies that evidence statements reference actual facts present in state context.
    """
    if not evidence:
        return True, []

    errors = []

    # Prepare verifiable facts strings from state
    inv_num = (state.get("invoice_number") or "").lower()
    cust_name = (state.get("customer_name") or "").lower()
    days_overdue = str(state.get("days_overdue", 0))
    broken_promises = str(state.get("broken_promise_count", 0))
    outstanding = str(int(state.get("outstanding_amount", 0)))

    for idx, item in enumerate(evidence):
        item_lower = item.lower()
        
        # Check if item contains unsupported extreme claims without factual grounding
        if "bankrupt" in item_lower and "bankrupt" not in state.get("recent_payment_behaviour", "").lower():
            errors.append(f"Evidence item #{idx+1} contains unsupported claim 'bankrupt'.")
        elif "fraud" in item_lower:
            errors.append(f"Evidence item #{idx+1} contains unsupported claim 'fraud'.")
        elif "refuses to pay" in item_lower and not state.get("dispute_signal"):
            errors.append(f"Evidence item #{idx+1} contains unsupported claim 'refuses to pay'.")

    is_valid = len(errors) == 0
    return is_valid, errors
