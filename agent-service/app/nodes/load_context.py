import uuid
from typing import Dict, Any
from app.state.receivables_state import ReceivablesState
from app.services.supabase import get_supabase_client
from app.services.context import fetch_invoice_context_by_number

def is_valid_uuid(val: str) -> bool:
    try:
        uuid.UUID(val)
        return True
    except Exception:
        return False

def load_context_node(state: ReceivablesState) -> Dict[str, Any]:
    lookup_key = state.get("invoice_id") or state.get("invoice_number")
    if not lookup_key:
        return {"workflow_status": "FAILED", "error": "No invoice_id or invoice_number provided in state."}

    supabase = get_supabase_client()
    invoice_number = None

    if is_valid_uuid(lookup_key):
        inv_res = supabase.from_("invoices").select("invoice_number").eq("id", lookup_key).execute()
        if inv_res.data and len(inv_res.data) > 0:
            invoice_number = inv_res.data[0].get("invoice_number")
    else:
        invoice_number = lookup_key

    if not invoice_number:
        return {
            "workflow_status": "FAILED",
            "error": f"Invoice UUID '{lookup_key}' not found in Supabase database.",
        }

    context = fetch_invoice_context_by_number(invoice_number)
    if not context:
        return {
            "workflow_status": "FAILED",
            "error": f"Invoice '{invoice_number}' not found in Supabase database.",
        }

    inv = context.invoice
    cust = context.customer

    # Check active promise count
    active_promises = sum(
        1 for p in context.promises if p.status.upper() in ["PENDING", "ACTIVE"]
    )

    return {
        "business_id": inv.businessId,
        "invoice_id": inv.invoiceId,
        "customer_id": inv.customerId,
        "invoice_number": inv.invoiceNumber,

        "invoice_amount": inv.amount,
        "paid_amount": inv.paidAmount,
        "outstanding_amount": inv.outstandingAmount,
        "due_date": inv.dueDate,
        "days_overdue": inv.daysOverdue,
        "invoice_status": inv.status,

        "customer_name": cust.name,
        "average_payment_delay_days": cust.averagePaymentDelayDays,
        "total_invoices": cust.totalInvoices,
        "overdue_invoice_count": cust.overdueInvoices,
        "total_promises": cust.totalPromises,
        "broken_promise_count": cust.brokenPromises,

        "payment_count": len(context.payments),
        "recent_payment_behaviour": f"{len(context.payments)} receipt(s) recorded",
        "has_partial_payment": inv.paidAmount > 0 and inv.outstandingAmount > 0,
        "active_promise_count": active_promises,
        "recent_communication_count": len(context.communications),
        "recent_inbound_count": sum(1 for c in context.communications if c.direction.upper() == "INBOUND"),
        "recent_outbound_count": sum(1 for c in context.communications if c.direction.upper() == "OUTBOUND"),
        "dispute_signal": any(
            any(kw in (c.message or "").lower() for kw in ["dispute", "incorrect", "wrong invoice", "short pay"])
            for c in context.communications
        ),
        "open_exception_count": len(context.exceptions),
        "workflow_status": "PENDING",
    }
