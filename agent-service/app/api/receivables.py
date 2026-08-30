from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
from app.graph.receivables_graph import run_receivables_agent
from app.graph.portfolio_graph import run_portfolio_receivables_agent
from app.models.portfolio import PortfolioRankRequest, PortfolioRankResponse

router = APIRouter(prefix="/agents/receivables", tags=["Receivables Agent"])

class RunAgentRequest(BaseModel):
    invoiceId: Optional[str] = Field(None, description="UUID of invoice in Supabase")
    invoiceNumber: Optional[str] = Field(None, description="Invoice number (e.g. INV-1013)")

class RunAgentResponse(BaseModel):
    success: bool
    invoiceId: str
    invoiceNumber: str
    priority: str
    priorityReason: str
    evidence: List[str]
    recommendedAction: str
    confidence: float
    reasoningMode: str
    policyDecision: str
    policyReason: str
    rulesTriggered: List[str]
    safeAction: str
    agentRunId: Optional[str] = None
    agentDecisionId: Optional[str] = None

@router.post("/run", response_model=RunAgentResponse)
def run_agent_endpoint(request: RunAgentRequest):
    lookup_id = request.invoiceId or request.invoiceNumber
    if not lookup_id:
        raise HTTPException(status_code=400, detail="Must supply invoiceId or invoiceNumber.")

    final_state = run_receivables_agent(lookup_id)

    if final_state.get("workflow_status") == "FAILED" and not final_state.get("invoice_number"):
        raise HTTPException(
            status_code=404,
            detail=final_state.get("error") or f"Invoice '{lookup_id}' not found or execution failed."
        )

    return RunAgentResponse(
        success=True,
        invoiceId=final_state.get("invoice_id") or lookup_id,
        invoiceNumber=final_state.get("invoice_number") or lookup_id,
        priority=final_state.get("agent_priority", "LOW"),
        priorityReason=final_state.get("priority_reason") or "Prioritization complete.",
        evidence=final_state.get("evidence") or [],
        recommendedAction=final_state.get("recommended_action") or "No action",
        confidence=final_state.get("confidence", 0.92),
        reasoningMode=final_state.get("reasoning_mode", "DETERMINISTIC_FALLBACK"),
        policyDecision=final_state.get("policy_decision", "HUMAN_REVIEW"),
        policyReason=final_state.get("policy_reason") or "Policy decision complete.",
        rulesTriggered=final_state.get("rules_triggered") or [],
        safeAction=final_state.get("safe_action") or final_state.get("recommended_action") or "No action",
        agentRunId=final_state.get("agent_run_id"),
        agentDecisionId=final_state.get("agent_decision_id"),
    )

@router.post("/rank", response_model=PortfolioRankResponse)
def rank_portfolio_endpoint(request: PortfolioRankRequest):
    try:
        res = run_portfolio_receivables_agent(top_k=request.topK, candidate_k=request.candidateK)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Portfolio ranking workflow error: {str(e)}")
