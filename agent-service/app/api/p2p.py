from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.models.p2p import RunP2PAgentRequest, RunP2PAgentResponse
from app.graph.p2p_graph import run_p2p_agent

router = APIRouter(prefix="/agents/promises", tags=["Promise-to-Pay Agent"])

@router.post("/run")
def run_p2p_agent_endpoint(request: RunP2PAgentRequest):
    lookup_id = request.promiseId or request.invoiceId or request.invoiceNumber
    if not lookup_id:
        raise HTTPException(status_code=400, detail="Must supply promiseId, invoiceId, or invoiceNumber.")

    final_state = run_p2p_agent(lookup_id)

    if final_state.get("workflow_status") == "FAILED":
        err_msg = final_state.get("error") or "P2P_CONTEXT_UNAVAILABLE"
        if err_msg == "P2P_CONTEXT_UNAVAILABLE":
            return JSONResponse(
                status_code=503,
                content={
                    "success": False,
                    "error": "P2P_CONTEXT_UNAVAILABLE",
                    "stage": "LOAD_CONTEXT",
                    "component": final_state.get("failed_component") or "payments",
                    "retryable": True,
                    "message": "Payment context could not be loaded. Please retry.",
                }
            )
        
        raise HTTPException(
            status_code=404 if "not found" in str(err_msg).lower() else 400,
            detail=err_msg
        )

    return RunP2PAgentResponse(
        success=True,
        promiseId=final_state.get("promise_id") or lookup_id,
        invoiceId=final_state.get("invoice_id") or "",
        customerId=final_state.get("customer_id") or "",
        invoiceNumber=final_state.get("invoice_number") or "",
        customerName=final_state.get("customer_name") or "",
        promisedAmount=final_state.get("promised_amount", 0.0),
        promisedDate=final_state.get("promised_date") or "",
        fulfilledAmount=final_state.get("fulfilled_amount", 0.0),
        fulfillmentRatio=final_state.get("fulfillment_ratio", 0.0),
        daysUntilPromise=final_state.get("days_until_promise", 0),
        daysPastPromise=final_state.get("days_past_promise", 0),
        deterministicPromiseState=final_state.get("deterministic_promise_state", "ACTIVE"),
        commitmentReliability=final_state.get("commitment_reliability", "MEDIUM"),
        promiseAssessment=final_state.get("promise_assessment", "AT_RISK"),
        reason=final_state.get("reason") or "Promise analysis completed.",
        evidence=final_state.get("evidence") or [],
        recommendedAction=final_state.get("recommended_action") or "Monitor payment clearance.",
        confidence=final_state.get("confidence", 0.90),
        policyDecision=final_state.get("policy_decision", "HUMAN_REVIEW"),
        policyReason=final_state.get("policy_reason") or "Policy evaluation complete.",
        rulesTriggered=final_state.get("rules_triggered") or [],
        safeAction=final_state.get("safe_action") or final_state.get("recommended_action") or "No action",
        agentRunId=final_state.get("agent_run_id"),
        agentDecisionId=final_state.get("agent_decision_id"),
    )
