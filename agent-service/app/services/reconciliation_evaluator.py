from typing import Dict, Any, List

def evaluate_reconciliation_financials(
    exception: Dict[str, Any],
    invoice: Dict[str, Any],
    payment: Dict[str, Any],
    payment_allocations: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Deterministically computes expected, received, allocated, unallocated, difference, and allocation ratios.
    """
    inv_amount = float(invoice.get("amount") or 0.0)
    inv_paid = float(invoice.get("paid_amount") or 0.0)
    pmt_amount = float(payment.get("amount") or 0.0)

    # Expected amount priority: exception.expected_amount -> invoice.amount -> 0.0
    expected_amount = float(exception.get("expected_amount") or inv_amount or 0.0)
    
    # Received amount priority: exception.received_amount -> payment.amount -> 0.0
    received_amount = float(exception.get("received_amount") or pmt_amount or 0.0)

    # Calculate allocated amount from payment allocations
    allocated_amount = 0.0
    if payment_allocations:
        for alloc in payment_allocations:
            allocated_amount += float(alloc.get("allocated_amount") or 0.0)
    elif inv_paid > 0:
        allocated_amount = min(received_amount, inv_paid)

    unallocated_amount = max(0.0, received_amount - allocated_amount)
    
    # Difference: positive = underpaid / short; negative = overpaid
    difference = float(exception.get("discrepancy_amount") or exception.get("difference") or (expected_amount - received_amount))

    allocation_coverage_ratio = 1.0 if received_amount == 0 else min(1.0, max(0.0, allocated_amount / received_amount))
    payment_to_invoice_ratio = 1.0 if expected_amount == 0 else max(0.0, received_amount / expected_amount)

    is_payment_successful = str(payment.get("status", "completed")).lower() in ["completed", "success", "paid"]
    is_partially_allocated = (allocated_amount > 0 and allocated_amount < received_amount)
    is_fully_allocated = (allocated_amount >= received_amount and received_amount > 0)
    is_invoice_fully_paid = (inv_paid >= inv_amount and inv_amount > 0)
    is_overpayment = (received_amount > expected_amount)
    is_missing_payment = (received_amount == 0 or not payment)
    is_unallocated = (received_amount > 0 and allocated_amount == 0)

    return {
        "expected_amount": expected_amount,
        "received_amount": received_amount,
        "allocated_amount": allocated_amount,
        "unallocated_amount": unallocated_amount,
        "difference": difference,
        "allocation_coverage_ratio": round(allocation_coverage_ratio, 4),
        "payment_to_invoice_ratio": round(payment_to_invoice_ratio, 4),
        "is_payment_successful": is_payment_successful,
        "is_partially_allocated": is_partially_allocated,
        "is_fully_allocated": is_fully_allocated,
        "is_invoice_fully_paid": is_invoice_fully_paid,
        "is_overpayment": is_overpayment,
        "is_missing_payment": is_missing_payment,
        "is_unallocated": is_unallocated,
    }
