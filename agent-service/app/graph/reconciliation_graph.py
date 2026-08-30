from langgraph.graph import StateGraph, START, END
from app.state.reconciliation_state import ReconciliationAgentState, create_initial_reconciliation_state
from app.nodes.reconciliation_nodes import (
    load_reconciliation_context_node,
    build_reconciliation_signals_node,
    compare_financial_values_node,
    build_hypotheses_node,
    reconciliation_agent_reasoning_node,
    validate_reconciliation_output_node,
    reconciliation_policy_check_node,
    reconciliation_human_review_node,
    reconciliation_persist_decision_node,
    reconciliation_audit_node,
)

def route_after_load_context(state: ReconciliationAgentState) -> str:
    """Conditional routing after LOAD_CONTEXT."""
    if state.get("workflow_status") == "FAILED":
        return END
    return "BUILD_SIGNALS"

def route_after_reconciliation_validation(state: ReconciliationAgentState) -> str:
    """Conditional routing after output validation."""
    if state.get("workflow_status") == "FAILED":
        return "HUMAN_REVIEW"
    if state.get("validation_status") == "INVALID":
        return "HUMAN_REVIEW"
    return "POLICY_CHECK"

def build_reconciliation_graph():
    builder = StateGraph(ReconciliationAgentState)

    # 1. Add Nodes
    builder.add_node("LOAD_CONTEXT", load_reconciliation_context_node)
    builder.add_node("BUILD_SIGNALS", build_reconciliation_signals_node)
    builder.add_node("COMPARE_FINANCIAL_VALUES", compare_financial_values_node)
    builder.add_node("BUILD_HYPOTHESES", build_hypotheses_node)
    builder.add_node("RECONCILIATION_AGENT", reconciliation_agent_reasoning_node)
    builder.add_node("VALIDATE_OUTPUT", validate_reconciliation_output_node)
    builder.add_node("POLICY_CHECK", reconciliation_policy_check_node)
    builder.add_node("HUMAN_REVIEW", reconciliation_human_review_node)
    builder.add_node("PERSIST_DECISION", reconciliation_persist_decision_node)
    builder.add_node("AUDIT", reconciliation_audit_node)

    # 2. Add Edges
    builder.add_edge(START, "LOAD_CONTEXT")
    builder.add_conditional_edges(
        "LOAD_CONTEXT",
        route_after_load_context,
        {
            "BUILD_SIGNALS": "BUILD_SIGNALS",
            END: END,
        },
    )
    builder.add_edge("BUILD_SIGNALS", "COMPARE_FINANCIAL_VALUES")
    builder.add_edge("COMPARE_FINANCIAL_VALUES", "BUILD_HYPOTHESES")
    builder.add_edge("BUILD_HYPOTHESES", "RECONCILIATION_AGENT")
    builder.add_edge("RECONCILIATION_AGENT", "VALIDATE_OUTPUT")

    # 3. Add Conditional Routing
    builder.add_conditional_edges(
        "VALIDATE_OUTPUT",
        route_after_reconciliation_validation,
        {
            "POLICY_CHECK": "POLICY_CHECK",
            "HUMAN_REVIEW": "HUMAN_REVIEW",
        },
    )

    # 4. Rejoin paths to Persistence & Audit
    builder.add_edge("POLICY_CHECK", "PERSIST_DECISION")
    builder.add_edge("HUMAN_REVIEW", "PERSIST_DECISION")
    builder.add_edge("PERSIST_DECISION", "AUDIT")
    builder.add_edge("AUDIT", END)

    return builder.compile()

# Singleton compiled graph instance
reconciliation_graph = build_reconciliation_graph()

def run_reconciliation_agent(exception_id_or_lookup: str) -> ReconciliationAgentState:
    initial_state = create_initial_reconciliation_state(exception_id_or_lookup)
    final_state = reconciliation_graph.invoke(initial_state)
    return final_state
