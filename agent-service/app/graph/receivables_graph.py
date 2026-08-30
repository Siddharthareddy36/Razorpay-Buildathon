from langgraph.graph import StateGraph, START, END
from app.state.receivables_state import ReceivablesState, create_initial_receivables_state
from app.nodes.load_context import load_context_node
from app.nodes.build_signals import build_signals_node
from app.nodes.baseline import baseline_node
from app.nodes.analyze import analyze_with_gemini_node
from app.nodes.validate import validate_output_node
from app.nodes.policy import policy_check_node
from app.nodes.human_review import human_review_node
from app.nodes.persist import persist_decision_node
from app.nodes.audit import audit_node

def route_after_validation(state: ReceivablesState) -> str:
    """Conditional Edge function routing between Policy Check and Human Review."""
    if state.get("workflow_status") == "FAILED":
        return "HUMAN_REVIEW"
    if state.get("validation_status") == "INVALID":
        return "HUMAN_REVIEW"
    return "POLICY_CHECK"

def build_receivables_graph():
    builder = StateGraph(ReceivablesState)

    # 1. Add Nodes
    builder.add_node("LOAD_CONTEXT", load_context_node)
    builder.add_node("BUILD_SIGNALS", build_signals_node)
    builder.add_node("BASELINE", baseline_node)
    builder.add_node("ANALYZE_WITH_GEMINI", analyze_with_gemini_node)
    builder.add_node("VALIDATE_OUTPUT", validate_output_node)
    builder.add_node("POLICY_CHECK", policy_check_node)
    builder.add_node("HUMAN_REVIEW", human_review_node)
    builder.add_node("PERSIST_DECISION", persist_decision_node)
    builder.add_node("AUDIT", audit_node)

    # 2. Add Linear Edges
    builder.add_edge(START, "LOAD_CONTEXT")
    builder.add_edge("LOAD_CONTEXT", "BUILD_SIGNALS")
    builder.add_edge("BUILD_SIGNALS", "BASELINE")
    builder.add_edge("BASELINE", "ANALYZE_WITH_GEMINI")
    builder.add_edge("ANALYZE_WITH_GEMINI", "VALIDATE_OUTPUT")

    # 3. Add Conditional Edge after validation
    builder.add_conditional_edges(
        "VALIDATE_OUTPUT",
        route_after_validation,
        {
            "POLICY_CHECK": "POLICY_CHECK",
            "HUMAN_REVIEW": "HUMAN_REVIEW",
        },
    )

    # 4. Rejoin to Persistence & Audit
    builder.add_edge("POLICY_CHECK", "PERSIST_DECISION")
    builder.add_edge("HUMAN_REVIEW", "PERSIST_DECISION")
    builder.add_edge("PERSIST_DECISION", "AUDIT")
    builder.add_edge("AUDIT", END)

    return builder.compile()

# Singleton compiled graph instance
receivables_graph = build_receivables_graph()

def run_receivables_agent(invoice_id_or_number: str) -> ReceivablesState:
    initial_state = create_initial_receivables_state(invoice_id_or_number)
    final_state = receivables_graph.invoke(initial_state)
    return final_state
