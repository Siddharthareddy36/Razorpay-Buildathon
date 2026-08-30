from datetime import datetime, timezone
from app.services.supabase import get_supabase_client
from app.models.context import (
    NormalizedContext,
    InvoiceFact,
    CustomerFact,
    PaymentFact,
    PromiseFact,
    CommunicationFact,
    ExceptionFact,
)

def fetch_invoice_context_by_number(invoice_number: str) -> NormalizedContext | None:
    supabase = get_supabase_client()

    # 1. Fetch invoice row
    inv_res = supabase.from_("invoices").select("*").eq("invoice_number", invoice_number).execute()
    if not inv_res.data or len(inv_res.data) == 0:
        return None

    inv = inv_res.data[0]
    invoice_id = inv.get("id")
    customer_id = inv.get("customer_id")
    business_id = inv.get("business_id", "")

    # Calculate days overdue
    due_date_str = inv.get("due_date", "")
    days_overdue = 0
    if due_date_str:
        try:
            due_dt = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
            now_dt = datetime.now(timezone.utc)
            if due_dt.tzinfo is None:
                due_dt = due_dt.replace(tzinfo=timezone.utc)
            diff = (now_dt - due_dt).days
            days_overdue = max(0, diff)
        except Exception:
            days_overdue = 0

    amount = float(inv.get("amount", 0))
    paid_amount = float(inv.get("paid_amount", 0))
    outstanding = max(0.0, amount - paid_amount)

    invoice_fact = InvoiceFact(
        invoiceId=invoice_id,
        invoiceNumber=inv.get("invoice_number", invoice_number),
        businessId=business_id,
        customerId=customer_id or "",
        amount=amount,
        paidAmount=paid_amount,
        outstandingAmount=outstanding,
        dueDate=due_date_str,
        daysOverdue=days_overdue,
        status=inv.get("status", "UNPAID"),
    )

    # 2. Fetch Customer Profile
    customer_fact = CustomerFact(
        customerId=customer_id or "",
        name="Unknown Customer",
    )

    if customer_id:
        cust_res = supabase.from_("customers").select("*").eq("id", customer_id).execute()
        if cust_res.data and len(cust_res.data) > 0:
            c = cust_res.data[0]
            customer_fact = CustomerFact(
                customerId=c.get("id", customer_id),
                name=c.get("name", "Unknown Customer"),
                email=c.get("email"),
                phone=c.get("phone"),
                averagePaymentDelayDays=int(c.get("average_payment_delay_days", 0) or 0),
                totalInvoices=int(c.get("total_invoices", 0) or 0),
                overdueInvoices=int(c.get("total_overdue_invoices", 0) or 0),
                totalPromises=int(c.get("total_promises", 0) or 0),
                brokenPromises=int(c.get("total_broken_promises", 0) or 0),
            )

    # 3. Fetch Payments via payment_allocations
    payments = []
    alloc_res = supabase.from_("payment_allocations").select("*, payments(*)").eq("invoice_id", invoice_id).execute()
    if alloc_res.data and len(alloc_res.data) > 0:
        for a in alloc_res.data:
            pmt = a.get("payments") or {}
            payments.append(
                PaymentFact(
                    id=pmt.get("id") or a.get("id", ""),
                    amount=float(a.get("allocated_amount") or pmt.get("amount", 0)),
                    status=pmt.get("status") or "completed",
                    paymentMethod=pmt.get("payment_method") or "Bank Transfer",
                    reference=pmt.get("reference_number") or pmt.get("payment_reference") or "-",
                    createdAt=pmt.get("created_at") or a.get("allocated_at"),
                )
            )
    elif customer_id:
        pmt_res = supabase.from_("payments").select("*").eq("customer_id", customer_id).execute()
        if pmt_res.data:
            for p in pmt_res.data:
                payments.append(
                    PaymentFact(
                        id=p.get("id", ""),
                        amount=float(p.get("amount", 0)),
                        status=p.get("status", "completed"),
                        paymentMethod=p.get("payment_method") or "Bank Transfer",
                        reference=p.get("reference_number") or p.get("payment_reference") or "-",
                        createdAt=p.get("created_at"),
                    )
                )

    # 4. Fetch Promises
    promises = []
    prm_res = supabase.from_("promises").select("*").eq("invoice_id", invoice_id).execute()
    if prm_res.data:
        for pr in prm_res.data:
            promises.append(
                PromiseFact(
                    id=pr.get("id", ""),
                    promisedAmount=float(pr.get("promised_amount", 0)),
                    promisedDate=pr.get("promised_date", ""),
                    status=pr.get("status", "PENDING"),
                    originalMessage=pr.get("original_message"),
                )
            )

    # 5. Fetch Communications
    communications = []
    comm_res = supabase.from_("communications").select("*").eq("invoice_id", invoice_id).execute()
    if comm_res.data:
        for cm in comm_res.data:
            communications.append(
                CommunicationFact(
                    id=cm.get("id", ""),
                    channel=cm.get("channel", "email"),
                    direction=cm.get("direction", "outbound"),
                    message=cm.get("message") or cm.get("summary", ""),
                    createdAt=cm.get("created_at"),
                )
            )

    # 6. Fetch Reconciliation Exceptions
    exceptions = []
    exc_res = supabase.from_("reconciliation_exceptions").select("*").eq("invoice_id", invoice_id).execute()
    if exc_res.data:
        for ex in exc_res.data:
            disc = float(ex.get("difference") or ex.get("discrepancy_amount") or 0)
            exceptions.append(
                ExceptionFact(
                    id=ex.get("id", ""),
                    status=ex.get("status", "OPEN"),
                    discrepancyAmount=disc,
                    reason=ex.get("reason") or ex.get("exception_type"),
                )
            )

    return NormalizedContext(
        invoice=invoice_fact,
        customer=customer_fact,
        payments=payments,
        promises=promises,
        communications=communications,
        exceptions=exceptions,
    )
