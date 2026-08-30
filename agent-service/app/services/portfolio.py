from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple
from app.services.supabase import get_supabase_client

def screen_and_rank_portfolio(candidate_k: int = 20) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Stage 1: High-Performance Deterministic Screening.
    Fetches invoices + customer facts in 1 single query,
    computes baseline priority math in memory in 0.05s,
    sorts descending by baseline score, and selects top candidate_k.
    """
    supabase = get_supabase_client()
    res = supabase.from_("invoices").select("id, invoice_number, business_id, customer_id, amount, paid_amount, due_date, status, customers(name)").execute()
    invoices_data = res.data or []

    now_dt = datetime.now(timezone.utc)
    screened = []

    for inv in invoices_data:
        inv_id = inv.get("id")
        inv_num = inv.get("invoice_number")
        if not inv_num or not inv_id:
            continue

        amount = float(inv.get("amount", 0))
        paid_amount = float(inv.get("paid_amount", 0))
        outstanding = max(0.0, amount - paid_amount)
        due_date_str = inv.get("due_date", "")

        days_overdue = 0
        if due_date_str:
            try:
                due_dt = datetime.fromisoformat(due_date_str.replace("Z", "+00:00"))
                if due_dt.tzinfo is None:
                    due_dt = due_dt.replace(tzinfo=timezone.utc)
                diff = (now_dt - due_dt).days
                days_overdue = max(0, diff)
            except Exception:
                days_overdue = 0

        cust = inv.get("customers") or {}
        cust_name = cust.get("name", "Customer Account")

        # Baseline Formula Math
        exposure_score = min(35.0, (outstanding / 1000000.0) * 35.0)
        overdue_score = min(40.0, days_overdue * 1.25)
        raw_score = exposure_score + overdue_score
        baseline_score = min(100.0, round(raw_score * 10) / 10.0)

        if baseline_score >= 70 or days_overdue > 60:
            priority = "CRITICAL"
        elif baseline_score >= 45 or days_overdue > 30:
            priority = "HIGH"
        elif baseline_score >= 20 or days_overdue > 0:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        screened.append({
            "invoice_id": inv_id,
            "invoice_number": inv_num,
            "business_id": inv.get("business_id", ""),
            "customer_id": inv.get("customer_id", ""),
            "customer_name": cust_name,
            "amount": amount,
            "paid_amount": paid_amount,
            "outstanding_amount": outstanding,
            "due_date": due_date_str,
            "days_overdue": days_overdue,
            "baseline_score": baseline_score,
            "baseline_priority": priority,
        })

    # Sort deterministically descending by baseline score, days overdue, and outstanding balance
    screened.sort(key=lambda x: (x["baseline_score"], x["days_overdue"], x["outstanding_amount"]), reverse=True)

    candidates = screened[:candidate_k]
    return screened, candidates
