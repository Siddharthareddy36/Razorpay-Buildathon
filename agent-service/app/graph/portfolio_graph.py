import uuid
from datetime import datetime, timezone
from typing import TypedDict, List, Dict, Any, Optional
from concurrent.futures import ThreadPoolExecutor
from langgraph.graph import StateGraph, START, END
from app.services.portfolio import screen_and_rank_portfolio
from app.graph.receivables_graph import run_receivables_agent
from app.models.portfolio import RankedInvoiceItem, PortfolioRankResponse
from app.services.supabase import get_supabase_client

class PortfolioState(TypedDict, total=False):
    top_k: int
    candidate_k: int
    portfolio_size: int
    candidate_count: int
    candidates: List[Dict[str, Any]]
    analyzed_candidates: List[RankedInvoiceItem]
    final_ranked_count: int
    agent_run_id: Optional[str]
    error: Optional[str]

def load_and_screen_node(state: PortfolioState) -> Dict[str, Any]:
    cand_k = state.get("candidate_k", 20)
    screened, candidates = screen_and_rank_portfolio(candidate_k=cand_k)
    return {
        "portfolio_size": len(screened),
        "candidate_count": len(candidates),
        "candidates": candidates,
    }

def _analyze_single_candidate(item_with_idx: tuple) -> RankedInvoiceItem:
    idx, item = item_with_idx
    inv_num = item["invoice_number"]
    
    # Execute single-invoice agent state machine
    single_state = run_receivables_agent(inv_num)

    return RankedInvoiceItem(
        rank=idx + 1,
        invoiceId=single_state.get("invoice_id") or item["invoice_id"],
        invoiceNumber=inv_num,
        businessId=single_state.get("business_id") or item["business_id"],
        customerId=single_state.get("customer_id") or item["customer_id"],
        customerName=single_state.get("customer_name") or item["customer_name"],
        amount=single_state.get("invoice_amount", item["amount"]),
        paidAmount=single_state.get("paid_amount", item["paid_amount"]),
        outstandingAmount=single_state.get("outstanding_amount", item["outstanding_amount"]),
        dueDate=single_state.get("due_date", item["due_date"]),
        daysOverdue=single_state.get("days_overdue", item["days_overdue"]),
        baselineScore=single_state.get("baseline_score", item["baseline_score"]),
        baselinePriority=single_state.get("baseline_priority", item["baseline_priority"]),
        agentPriority=single_state.get("agent_priority", "LOW"),
        priorityReason=single_state.get("priority_reason") or "Evaluation complete.",
        evidence=single_state.get("evidence") or [],
        recommendedAction=single_state.get("recommended_action") or "No action",
        confidence=single_state.get("confidence", 0.92),
        reasoningMode=single_state.get("reasoning_mode", "DETERMINISTIC_FALLBACK"),
        policyDecision=single_state.get("policy_decision", "HUMAN_REVIEW"),
        policyReason=single_state.get("policy_reason") or "Policy check complete.",
        rulesTriggered=single_state.get("rules_triggered") or [],
        safeAction=single_state.get("safe_action") or single_state.get("recommended_action") or "No action",
    )

def analyze_candidates_node(state: PortfolioState) -> Dict[str, Any]:
    candidates = state.get("candidates", [])
    top_k = state.get("top_k", 10)

    # Parallelize candidate analysis using ThreadPoolExecutor for sub-2s latency
    items_with_indices = list(enumerate(candidates))
    max_workers = min(10, max(1, len(candidates)))

    with ThreadPoolExecutor(max_workers=max_workers) as executor:
        analyzed = list(executor.map(_analyze_single_candidate, items_with_indices))

    # Sort final items primarily by agent priority & baseline score
    priority_weights = {"CRITICAL": 4, "HIGH": 3, "MEDIUM": 2, "LOW": 1}
    analyzed.sort(
        key=lambda x: (priority_weights.get(x.agentPriority, 1), x.baselineScore, x.daysOverdue),
        reverse=True,
    )

    # Re-assign 1-based ranks
    final_list = analyzed[:top_k]
    for r_idx, item in enumerate(final_list):
        item.rank = r_idx + 1

    return {
        "analyzed_candidates": final_list,
        "final_ranked_count": len(final_list),
    }

def persist_portfolio_node(state: PortfolioState) -> Dict[str, Any]:
    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    run_id = str(uuid.uuid4())

    run_payload = {
        "id": run_id,
        "agent_name": "PORTFOLIO_RECEIVABLES_INTELLIGENCE",
        "triggered_by": "SYSTEM_ROUTER",
        "status": "completed",
        "started_at": now_iso,
        "completed_at": now_iso,
    }

    try:
        supabase.from_("agent_runs").insert(run_payload).execute()
    except Exception as e:
        print(f"Warning: Failed to persist portfolio agent_run: {e}")

    return {"agent_run_id": run_id}

def build_portfolio_graph():
    builder = StateGraph(PortfolioState)

    builder.add_node("LOAD_AND_SCREEN", load_and_screen_node)
    builder.add_node("ANALYZE_CANDIDATES", analyze_candidates_node)
    builder.add_node("PERSIST_PORTFOLIO", persist_portfolio_node)

    builder.add_edge(START, "LOAD_AND_SCREEN")
    builder.add_edge("LOAD_AND_SCREEN", "ANALYZE_CANDIDATES")
    builder.add_edge("ANALYZE_CANDIDATES", "PERSIST_PORTFOLIO")
    builder.add_edge("PERSIST_PORTFOLIO", END)

    return builder.compile()

portfolio_graph = build_portfolio_graph()

def run_portfolio_receivables_agent(top_k: int = 10, candidate_k: int = 20) -> PortfolioRankResponse:
    initial_state = PortfolioState(
        top_k=top_k,
        candidate_k=candidate_k,
        portfolio_size=0,
        candidate_count=0,
        candidates=[],
        analyzed_candidates=[],
        final_ranked_count=0,
        agent_run_id=None,
        error=None,
    )
    final_state = portfolio_graph.invoke(initial_state)

    return PortfolioRankResponse(
        success=True,
        portfolioSize=final_state.get("portfolio_size", 0),
        candidateCount=final_state.get("candidate_count", 0),
        finalRankedCount=final_state.get("final_ranked_count", 0),
        rankedInvoices=final_state.get("analyzed_candidates", []),
        agentRunId=final_state.get("agent_run_id"),
    )
