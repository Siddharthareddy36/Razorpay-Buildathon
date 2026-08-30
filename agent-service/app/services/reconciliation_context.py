from typing import Dict, Any, List, Optional
from app.services.supabase import get_supabase_client

def fetch_reconciliation_context_by_exception_id(exception_id: str) -> Optional[Dict[str, Any]]:
    supabase = get_supabase_client()

    # 1. Fetch Target Reconciliation Exception
    exc_res = supabase.from_("reconciliation_exceptions").select("*").eq("id", exception_id).execute()
    if not exc_res.data or len(exc_res.data) == 0:
        return None

    exception = exc_res.data[0]
    invoice_id = exception.get("invoice_id")
    payment_id = exception.get("payment_id")
    business_id = exception.get("business_id", "")

    # 2. Fetch Invoice
    invoice = {}
    customer_id = ""
    if invoice_id:
        inv_res = supabase.from_("invoices").select("*").eq("id", invoice_id).execute()
        if inv_res.data and len(inv_res.data) > 0:
            invoice = inv_res.data[0]
            customer_id = invoice.get("customer_id", "")

    # 3. Fetch Payment
    payment = {}
    if payment_id:
        pmt_res = supabase.from_("payments").select("*").eq("id", payment_id).execute()
        if pmt_res.data and len(pmt_res.data) > 0:
            payment = pmt_res.data[0]
            if not customer_id:
                customer_id = payment.get("customer_id", "")

    # 4. Fetch Customer
    customer = {}
    if customer_id:
        cust_res = supabase.from_("customers").select("*").eq("id", customer_id).execute()
        if cust_res.data and len(cust_res.data) > 0:
            customer = cust_res.data[0]

    # 5. Fetch Payment Allocations
    payment_allocations = []
    if invoice_id:
        alloc_res = supabase.from_("payment_allocations").select("*").eq("invoice_id", invoice_id).execute()
        if alloc_res.data:
            payment_allocations = alloc_res.data
    elif payment_id:
        alloc_res = supabase.from_("payment_allocations").select("*").eq("payment_id", payment_id).execute()
        if alloc_res.data:
            payment_allocations = alloc_res.data

    # 6. Fetch Customer Communications
    communications = []
    if customer_id:
        comm_res = supabase.from_("communications").select("*").eq("customer_id", customer_id).order("created_at", desc=True).limit(20).execute()
        if comm_res.data:
            communications = comm_res.data

    # 7. Fetch Customer Payment History & Related Invoices
    customer_payments = []
    customer_invoices = []
    if customer_id:
        pmt_hist = supabase.from_("payments").select("*").eq("customer_id", customer_id).order("created_at", desc=True).limit(15).execute()
        if pmt_hist.data:
            customer_payments = pmt_hist.data

        inv_hist = supabase.from_("invoices").select("*").eq("customer_id", customer_id).order("created_at", desc=True).limit(15).execute()
        if inv_hist.data:
            customer_invoices = inv_hist.data

    return {
        "exception": exception,
        "invoice": invoice,
        "payment": payment,
        "customer": customer,
        "payment_allocations": payment_allocations,
        "communications": communications,
        "customer_payments": customer_payments,
        "customer_invoices": customer_invoices,
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

def fetch_exception_id_by_lookup(lookup_id: str) -> Optional[str]:
    """Resolves lookup string (exception_id or invoice_id or invoice_number) to target exception_id."""
    supabase = get_supabase_client()

    if is_valid_uuid(lookup_id):
        # Direct UUID check on reconciliation_exceptions table
        exc_res = supabase.from_("reconciliation_exceptions").select("id").eq("id", lookup_id).execute()
        if exc_res.data and len(exc_res.data) > 0:
            return exc_res.data[0]["id"]

        # Lookup by invoice_id
        exc_inv = supabase.from_("reconciliation_exceptions").select("id").eq("invoice_id", lookup_id).order("created_at", desc=True).execute()
        if exc_inv.data and len(exc_inv.data) > 0:
            return exc_inv.data[0]["id"]

    # Lookup by invoice_number
    inv_res = supabase.from_("invoices").select("id").eq("invoice_number", lookup_id.upper()).execute()
    if inv_res.data and len(inv_res.data) > 0:
        inv_id = inv_res.data[0]["id"]
        exc_by_num = supabase.from_("reconciliation_exceptions").select("id").eq("invoice_id", inv_id).order("created_at", desc=True).execute()
        if exc_by_num.data and len(exc_by_num.data) > 0:
            return exc_by_num.data[0]["id"]

    return None
