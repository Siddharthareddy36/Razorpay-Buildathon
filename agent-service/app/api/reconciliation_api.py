from fastapi import APIRouter, HTTPException
from app.models.reconciliation_models import RunReconciliationAgentRequest, RunReconciliationAgentResponse
from app.graph.reconciliation_graph import run_reconciliation_agent

router = APIRouter(prefix="/agents/reconciliation", tags=["Reconciliation Agent"])

@router.post("/run", response_model=RunReconciliationAgentResponse)
def run_reconciliation_agent_endpoint(request: RunReconciliationAgentRequest):
    lookup_id = request.exceptionId or request.invoiceId or request.invoiceNumber
    if not lookup_id:
        raise HTTPException(status_code=400, detail="Must supply exceptionId, invoiceId, or invoiceNumber.")

    final_state = run_reconciliation_agent(lookup_id)

    if final_state.get("workflow_status") == "FAILED":
        err_msg = final_state.get("error") or f"Reconciliation exception lookup '{lookup_id}' not found or execution failed."
        raise HTTPException(
            status_code=404 if "not found" in str(err_msg).lower() else 500,
            detail=err_msg
        )

    return RunReconciliationAgentResponse(
        success=True,
        exceptionId=final_state.get("exception_id") or lookup_id,
        invoiceId=final_state.get("invoice_id") or "",
        paymentId=final_state.get("payment_id") or "",
        customerId=final_state.get("customer_id") or "",
        invoiceNumber=final_state.get("invoice_number") or "",
        customerName=final_state.get("customer_name") or "",
        expectedAmount=final_state.get("expected_amount", 0.0),
        receivedAmount=final_state.get("received_amount", 0.0),
        difference=final_state.get("difference", 0.0),
        allocatedAmount=final_state.get("allocated_amount", 0.0),
        unallocatedAmount=final_state.get("unallocated_amount", 0.0),
        primaryHypothesis=final_state.get("primary_hypothesis", "UNKNOWN"),
        reason=final_state.get("reason") or "Reconciliation evaluation completed.",
        evidence=final_state.get("evidence") or [],
        alternativeHypotheses=final_state.get("alternative_hypotheses") or [],
        recommendedAction=final_state.get("recommended_action") or "Review exception documentation.",
        confidence=final_state.get("confidence", 0.90),
        policyDecision=final_state.get("policy_decision", "HUMAN_REVIEW"),
        policyReason=final_state.get("policy_reason") or "Policy evaluation complete.",
        rulesTriggered=final_state.get("rules_triggered") or [],
        safeAction=final_state.get("safe_action") or final_state.get("recommended_action") or "No action",
        hasConflict=bool(final_state.get("has_conflict", False)),
        conflictReason=final_state.get("conflict_reason"),
        conflictDetails=final_state.get("conflict_details") or [],
        evidenceQualityScore=float(final_state.get("evidence_quality_score", 0.5)),
        level1Evidence=final_state.get("level_1_evidence") or [],
        level2Evidence=final_state.get("level_2_evidence") or [],
        level3Evidence=final_state.get("level_3_evidence") or [],
        level4Evidence=final_state.get("level_4_evidence") or [],
        humanReviewReason=final_state.get("human_review_reason"),
        humanReviewDetails=final_state.get("human_review_details"),
        agentRunId=final_state.get("agent_run_id"),
        agentDecisionId=final_state.get("agent_decision_id"),
    )

