from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from app.models.supervisor_models import RunSupervisorRequest, RunSupervisorResponse, SpecialistInsight
from app.graph.supervisor_graph import run_supervisor_agent

router = APIRouter(prefix="/agents/supervisor", tags=["Multi-Agent Supervisor"])

@router.post("/run")
def run_supervisor_agent_endpoint(request: RunSupervisorRequest):
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Field 'query' is required.")

    try:
        final_state = run_supervisor_agent(request.query)
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "SUPERVISOR_EXECUTION_FAILED",
                "stage": "RUN_SPECIALISTS",
                "message": f"Supervisor execution failed: {e}"
            }
        )

    intent = final_state.get("detected_intent", "UNKNOWN")
    is_not_found = (intent == "NOT_FOUND")

    if final_state.get("workflow_status") == "FAILED":
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "error": "SUPERVISOR_EXECUTION_FAILED",
                "stage": "RUN_SPECIALISTS",
                "message": final_state.get("error") or "Supervisor execution could not be completed."
            }
        )

    # Build insights list
    raw_insights = final_state.get("agent_insights") or []
    insights = [
        SpecialistInsight(
            agent=ins["agent"],
            status=ins["status"],
            headline=ins["headline"],
            details=ins.get("details", {})
        )
        for ins in raw_insights
    ]

    entities = final_state.get("resolved_entities") or {}
    spec_results = final_state.get("specialist_results") or {}
    rec_res = spec_results.get("receivables") or {}

    financial_facts = {}
    if not is_not_found and entities.get("invoice_number"):
        financial_facts = {
            "invoiceNumber": entities.get("invoice_number") or rec_res.get("invoice_number") or "-",
            "customerName": entities.get("customer_name") or rec_res.get("customer_name") or "Customer",
            "invoiceAmount": rec_res.get("invoice_amount", 0.0),
            "outstandingAmount": rec_res.get("outstanding_amount", 0.0),
            "daysOverdue": rec_res.get("days_overdue", 0),
        }

    return RunSupervisorResponse(
        success=not is_not_found,
        query=final_state.get("user_query", request.query),
        intent=intent,
        selectedAgents=final_state.get("selected_agents") or [],
        executiveSummary=final_state.get("final_summary") or "Supervisor evaluation completed.",
        financialFacts=financial_facts,
        agentInsights=insights,
        crossAgentFindings=final_state.get("cross_domain_findings") or [],
        hasConflict=bool(final_state.get("has_cross_agent_conflict", False)),
        conflictSummary=final_state.get("conflict_summary"),
        recommendedAction=final_state.get("final_recommendation") or "Review case with financial operator.",
        confidence=float(final_state.get("confidence", 0.95)),
        policyDecision=final_state.get("policy_decision", "HUMAN_REVIEW"),
        policyReason=final_state.get("policy_reason") or "Policy evaluation complete.",
        rulesTriggered=final_state.get("rules_triggered") or [],
        agentRunId=final_state.get("request_id"),
        auditId=final_state.get("audit_id"),
    )
