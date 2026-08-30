from fastapi import APIRouter, HTTPException
from app.models.action_models import (
    ActionPlanRequest, ActionPlan,
    ActionExecutionRequest, ActionExecutionResponse,
    OutcomeTrackingRequest, OutcomeTrackingResponse
)
from app.services.action_planner import generate_action_plan
from app.services.n8n_workflow_engine import execute_n8n_recovery_workflow
from app.services.outcome_tracker import track_financial_outcome

router = APIRouter(prefix="/actions", tags=["Action Planner & Operational Recovery Workflows"])

@router.post("/plan", response_model=ActionPlan)
def plan_action_endpoint(request: ActionPlanRequest):
    """
    Generates a structured ActionPlan based on query/invoice analysis.
    """
    try:
        plan = generate_action_plan(
            query=request.query,
            invoice_id=request.invoiceId,
            customer_id=request.customerId
        )
        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate ActionPlan: {str(e)}")

@router.post("/execute", response_model=ActionExecutionResponse)
def execute_action_endpoint(request: ActionExecutionRequest):
    """
    Executes controlled operational recovery workflow via n8n integration runner.
    """
    try:
        res = execute_n8n_recovery_workflow(request)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to execute recovery workflow: {str(e)}")

@router.post("/outcome", response_model=OutcomeTrackingResponse)
def track_outcome_endpoint(request: OutcomeTrackingRequest):
    """
    Measures financial recovery outcome independently from Supabase PostgreSQL ledger.
    """
    try:
        res = track_financial_outcome(request)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to track financial outcome: {str(e)}")
