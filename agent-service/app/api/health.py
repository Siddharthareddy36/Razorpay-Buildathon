from fastapi import APIRouter, HTTPException
from app.services.supabase import get_supabase_client
from app.services.context import fetch_invoice_context_by_number
from app.services.signals import compute_baseline_priority

from app.models.policy import PolicyInput
from app.policies.receivables_policy import evaluate_receivables_policy

router = APIRouter()

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "receivables-agent-service"
    }

@router.get("/health/database")
def database_health_check():
    try:
        supabase = get_supabase_client()
        res = supabase.from_("invoices").select("id").limit(1).execute()
        if res.data is not None:
            return {"connected": True}
        return {"connected": False}
    except Exception:
        raise HTTPException(status_code=500, detail="Database connection test failed")

@router.get("/test/invoice/{invoice_number}")
def test_get_invoice_context(invoice_number: str):
    context = fetch_invoice_context_by_number(invoice_number)
    if not context:
        raise HTTPException(
            status_code=404,
            detail=f"Invoice '{invoice_number}' not found in Supabase database."
        )
    return context.model_dump()

@router.get("/test/baseline/{invoice_number}")
def test_get_baseline_analysis(invoice_number: str):
    context = fetch_invoice_context_by_number(invoice_number)
    if not context:
        raise HTTPException(
            status_code=404,
            detail=f"Invoice '{invoice_number}' not found in Supabase database."
        )
    analysis = compute_baseline_priority(context)
    return analysis.model_dump()

@router.post("/test/policy")
def test_evaluate_policy(policy_input: PolicyInput):
    decision = evaluate_receivables_policy(policy_input)
    return decision.model_dump()
