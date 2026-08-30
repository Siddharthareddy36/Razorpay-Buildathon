from langgraph.graph import StateGraph, START, END
from app.state.p2p_state import P2PAgentState, create_initial_p2p_state
from app.nodes.p2p_nodes import (
    load_p2p_context_node,
    build_p2p_signals_node,
    evaluate_promise_state_node,
    assess_commitment_reliability_node,
    p2p_agent_reasoning_node,
    validate_p2p_output_node,
    p2p_policy_check_node,
    p2p_human_review_node,
    p2p_persist_decision_node,
    p2p_audit_node,
)

def route_after_load_context(state: P2PAgentState) -> str:
    """Conditional routing after LOAD_CONTEXT."""
    if state.get("workflow_status") == "FAILED":
        return END
    return "BUILD_SIGNALS"

def route_after_p2p_validation(state: P2PAgentState) -> str:
    """Conditional routing after output validation."""
    if state.get("workflow_status") == "FAILED":
        return "HUMAN_REVIEW"
    if state.get("validation_status") == "INVALID":
        return "HUMAN_REVIEW"
    return "POLICY_CHECK"

def build_p2p_graph():
    builder = StateGraph(P2PAgentState)

    # 1. Add Nodes
    builder.add_node("LOAD_CONTEXT", load_p2p_context_node)
    builder.add_node("BUILD_SIGNALS", build_p2p_signals_node)
    builder.add_node("EVALUATE_PROMISE_STATE", evaluate_promise_state_node)
    builder.add_node("ASSESS_RELIABILITY", assess_commitment_reliability_node)
    builder.add_node("P2P_AGENT", p2p_agent_reasoning_node)
    builder.add_node("VALIDATE_OUTPUT", validate_p2p_output_node)
    builder.add_node("POLICY_CHECK", p2p_policy_check_node)
    builder.add_node("HUMAN_REVIEW", p2p_human_review_node)
    builder.add_node("PERSIST_DECISION", p2p_persist_decision_node)
    builder.add_node("AUDIT", p2p_audit_node)

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
    builder.add_edge("BUILD_SIGNALS", "EVALUATE_PROMISE_STATE")
    builder.add_edge("EVALUATE_PROMISE_STATE", "ASSESS_RELIABILITY")
    builder.add_edge("ASSESS_RELIABILITY", "P2P_AGENT")
    builder.add_edge("P2P_AGENT", "VALIDATE_OUTPUT")

    # 3. Add Conditional Routing
    builder.add_conditional_edges(
        "VALIDATE_OUTPUT",
        route_after_p2p_validation,
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
p2p_graph = build_p2p_graph()

def run_p2p_agent(promise_id_or_lookup: str) -> P2PAgentState:
    initial_state = create_initial_p2p_state(promise_id_or_lookup)
    final_state = p2p_graph.invoke(initial_state)
    return final_state
