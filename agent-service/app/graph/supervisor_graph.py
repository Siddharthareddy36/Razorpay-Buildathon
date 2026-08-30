from langgraph.graph import StateGraph, START, END
from app.state.supervisor_state import SupervisorState, create_initial_supervisor_state
from app.nodes.supervisor_nodes import (
    understand_request_node,
    resolve_entities_node,
    create_execution_plan_node,
    run_specialists_node,
    collect_results_node,
    check_conflicts_node,
    synthesize_node,
    final_policy_gate_node,
    supervisor_audit_node,
)

def build_supervisor_graph():
    builder = StateGraph(SupervisorState)

    # 1. Add Nodes
    builder.add_node("UNDERSTAND_REQUEST", understand_request_node)
    builder.add_node("RESOLVE_ENTITIES", resolve_entities_node)
    builder.add_node("CREATE_EXECUTION_PLAN", create_execution_plan_node)
    builder.add_node("RUN_SPECIALISTS", run_specialists_node)
    builder.add_node("COLLECT_RESULTS", collect_results_node)
    builder.add_node("CHECK_CONFLICTS", check_conflicts_node)
    builder.add_node("SYNTHESIZE", synthesize_node)
    builder.add_node("FINAL_POLICY_GATE", final_policy_gate_node)
    builder.add_node("AUDIT", supervisor_audit_node)

    # 2. Add Edges
    builder.add_edge(START, "UNDERSTAND_REQUEST")
    builder.add_edge("UNDERSTAND_REQUEST", "RESOLVE_ENTITIES")
    builder.add_edge("RESOLVE_ENTITIES", "CREATE_EXECUTION_PLAN")
    builder.add_edge("CREATE_EXECUTION_PLAN", "RUN_SPECIALISTS")
    builder.add_edge("RUN_SPECIALISTS", "COLLECT_RESULTS")
    builder.add_edge("COLLECT_RESULTS", "CHECK_CONFLICTS")
    builder.add_edge("CHECK_CONFLICTS", "SYNTHESIZE")
    builder.add_edge("SYNTHESIZE", "FINAL_POLICY_GATE")
    builder.add_edge("FINAL_POLICY_GATE", "AUDIT")
    builder.add_edge("AUDIT", END)

    return builder.compile()

# Singleton compiled graph instance
supervisor_graph = build_supervisor_graph()

def run_supervisor_agent(user_query: str, request_id: str = None) -> SupervisorState:
    initial_state = create_initial_supervisor_state(user_query, request_id)
    final_state = supervisor_graph.invoke(initial_state)
    return final_state
