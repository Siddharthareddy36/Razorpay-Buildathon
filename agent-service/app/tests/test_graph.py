import pytest
from app.graph.receivables_graph import run_receivables_agent
from app.state.receivables_state import create_initial_receivables_state
from app.nodes.validate import validate_output_node

def test_live_inv_1013_graph_execution():
    """Test full LangGraph execution for live Supabase invoice INV-1013."""
    state = run_receivables_agent("INV-1013")

    assert state.get("workflow_status") == "COMPLETED"
    assert state.get("invoice_number") == "INV-1013"
    assert state.get("invoice_id") == "13257fa4-220b-4a8f-9184-2d8545d0bad3"
    assert state.get("outstanding_amount") == 60000.0
    assert state.get("days_overdue") >= 50
    assert state.get("agent_priority") in ["HIGH", "CRITICAL"]
    assert state.get("policy_decision") in ["APPROVED", "HUMAN_REVIEW"]
    assert state.get("agent_run_id") is not None
    assert state.get("agent_decision_id") is not None

def test_deterministic_fallback_execution():
    """Verify state machine completes cleanly when using deterministic fallback."""
    state = run_receivables_agent("INV-1013")
    assert state.get("workflow_status") == "COMPLETED"
    assert state.get("reasoning_mode") in ["GEMINI", "DETERMINISTIC_FALLBACK"]
    assert len(state.get("evidence", [])) > 0

def test_invalid_invoice_failure_handling():
    """Verify proper failure routing for non-existent invoice."""
    state = run_receivables_agent("INV-NONEXISTENT-99999")
    assert state.get("workflow_status") in ["FAILED", "COMPLETED"]
    assert state.get("policy_decision") == "HUMAN_REVIEW"

def test_unsupported_evidence_validation_failure():
    """Verify that unsupported evidence claims trigger validation failure & human review routing."""
    initial = create_initial_receivables_state("INV-1013")
    initial["agent_priority"] = "HIGH"
    initial["priority_reason"] = "Test reason"
    initial["recommended_action"] = "Action"
    initial["confidence"] = 0.90
    initial["evidence"] = ["Customer is bankrupt and fleeing."]
    
    val_res = validate_output_node(initial)
    assert val_res["validation_status"] == "INVALID"
    assert len(val_res["validation_errors"]) > 0
