from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
import logging
from app.services.supabase import get_supabase_client, execute_supabase_with_retry, SupabaseTransientError

logger = logging.getLogger("p2p_context")

def fetch_p2p_context_by_promise_id(promise_id: str) -> Optional[Dict[str, Any]]:
    """Fetches full P2P context (Promise, Invoice, Customer, Payments, History, Comms, Exceptions) with retry resilience."""
    supabase = get_supabase_client()

    # 1. Fetch Target Promise
    prm_res = execute_supabase_with_retry(
        lambda: supabase.from_("promises").select("*").eq("id", promise_id).execute(),
        component_name="promise"
    )
    if not prm_res.data or len(prm_res.data) == 0:
        return None

    promise = prm_res.data[0]
    customer_id = promise.get("customer_id")
    invoice_id = promise.get("invoice_id")
    business_id = promise.get("business_id", "")

    # 2. Fetch Invoice
    invoice = {}
    if invoice_id:
        inv_res = execute_supabase_with_retry(
            lambda: supabase.from_("invoices").select("*").eq("id", invoice_id).execute(),
            component_name="invoice"
        )
        if inv_res.data and len(inv_res.data) > 0:
            invoice = inv_res.data[0]

    # Calculate invoice days overdue
    due_date_str = invoice.get("due_date", "")
    days_overdue = 0
    if due_date_str:
        try:
            due_dt = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
            now_dt = datetime.now(timezone.utc)
            if due_dt.tzinfo is None:
                due_dt = due_dt.replace(tzinfo=timezone.utc)
            days_overdue = max(0, (now_dt - due_dt).days)
        except Exception:
            days_overdue = 0

    # 3. Fetch Customer
    customer = {}
    if customer_id:
        cust_res = execute_supabase_with_retry(
            lambda: supabase.from_("customers").select("*").eq("id", customer_id).execute(),
            component_name="customer"
        )
        if cust_res.data and len(cust_res.data) > 0:
            customer = cust_res.data[0]

    # 4. Fetch Payments and Allocations for Invoice
    payments = []
    payment_allocations = []
    if invoice_id:
        alloc_res = execute_supabase_with_retry(
            lambda: supabase.from_("payment_allocations").select("*, payments(*)").eq("invoice_id", invoice_id).execute(),
            component_name="payment_allocations"
        )
        if alloc_res.data:
            payment_allocations = alloc_res.data
            for a in alloc_res.data:
                pmt = a.get("payments") or {}
                payments.append({
                    "id": pmt.get("id") or a.get("id"),
                    "amount": float(a.get("allocated_amount") or pmt.get("amount", 0)),
                    "allocated_amount": float(a.get("allocated_amount") or 0),
                    "status": pmt.get("status", "completed"),
                    "payment_method": pmt.get("payment_method", "Bank Transfer"),
                    "reference_number": pmt.get("reference_number", "-"),
                    "payment_date": pmt.get("payment_date") or pmt.get("created_at") or a.get("allocated_at"),
                    "allocated_at": a.get("allocated_at") or pmt.get("created_at"),
                })
        elif customer_id:
            # Fallback to customer payments
            pmt_res = execute_supabase_with_retry(
                lambda: supabase.from_("payments").select("*").eq("customer_id", customer_id).execute(),
                component_name="payments"
            )
            if pmt_res.data:
                for p in pmt_res.data:
                    payments.append({
                        "id": p.get("id"),
                        "amount": float(p.get("amount", 0)),
                        "allocated_amount": float(p.get("amount", 0)),
                        "status": p.get("status", "completed"),
                        "payment_method": p.get("payment_method", "Bank Transfer"),
                        "reference_number": p.get("reference_number", "-"),
                        "payment_date": p.get("payment_date") or p.get("created_at"),
                        "allocated_at": p.get("created_at"),
                    })

    # 5. Fetch Customer Promise History
    customer_promises = []
    if customer_id:
        p_hist_res = execute_supabase_with_retry(
            lambda: supabase.from_("promises").select("*, invoices(invoice_number)").eq("customer_id", customer_id).order("promised_date", desc=True).execute(),
            component_name="customer_promises"
        )
        if p_hist_res.data:
            customer_promises = p_hist_res.data

    # 6. Fetch Communications
    communications = []
    if customer_id:
        comm_res = execute_supabase_with_retry(
            lambda: supabase.from_("communications").select("*").eq("customer_id", customer_id).order("created_at", desc=True).limit(20).execute(),
            component_name="communications"
        )
        if comm_res.data:
            communications = comm_res.data

    # 7. Fetch Reconciliation Exceptions
    exceptions = []
    if invoice_id:
        exc_res = execute_supabase_with_retry(
            lambda: supabase.from_("reconciliation_exceptions").select("*").eq("invoice_id", invoice_id).execute(),
            component_name="exceptions"
        )
        if exc_res.data:
            exceptions = exc_res.data

    return {
        "promise": promise,
        "invoice": invoice,
        "customer": customer,
        "payments": payments,
        "payment_allocations": payment_allocations,
        "customer_promises": customer_promises,
        "communications": communications,
        "exceptions": exceptions,
        "days_overdue": days_overdue,
    }

def is_valid_uuid(val: str) -> bool:
    if not val or not isinstance(val, str):
        return False
    try:
        import uuid
        uuid.UUID(val)
        return True
    except Exception:
        return False

def fetch_promise_id_by_lookup(lookup_id: str) -> Optional[str]:
    """Resolves lookup string (promise_id or invoice_id or invoice_number) to target promise_id."""
    supabase = get_supabase_client()

    if is_valid_uuid(lookup_id):
        # Direct UUID check on promises table
        prm_res = execute_supabase_with_retry(
            lambda: supabase.from_("promises").select("id").eq("id", lookup_id).execute(),
            component_name="promise_lookup"
        )
        if prm_res.data and len(prm_res.data) > 0:
            return prm_res.data[0]["id"]

        # Lookup by invoice_id
        prm_inv = execute_supabase_with_retry(
            lambda: supabase.from_("promises").select("id").eq("invoice_id", lookup_id).order("created_at", desc=True).execute(),
            component_name="promise_invoice_lookup"
        )
        if prm_inv.data and len(prm_inv.data) > 0:
            return prm_inv.data[0]["id"]

    # Lookup by invoice_number
    inv_res = execute_supabase_with_retry(
        lambda: supabase.from_("invoices").select("id").eq("invoice_number", lookup_id.upper()).execute(),
        component_name="invoice_number_lookup"
    )
    if inv_res.data and len(inv_res.data) > 0:
        inv_id = inv_res.data[0]["id"]
        prm_by_num = execute_supabase_with_retry(
            lambda: supabase.from_("promises").select("id").eq("invoice_id", inv_id).order("created_at", desc=True).execute(),
            component_name="promise_inv_number_lookup"
        )
        if prm_by_num.data and len(prm_by_num.data) > 0:
            return prm_by_num.data[0]["id"]

    return None
