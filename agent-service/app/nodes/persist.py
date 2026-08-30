import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from app.state.receivables_state import ReceivablesState
from app.services.supabase import get_supabase_client

def persist_decision_node(state: ReceivablesState) -> Dict[str, Any]:
    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()

    agent_run_id = str(uuid.uuid4())
    agent_decision_id = str(uuid.uuid4())

    biz_id = state.get("business_id") or "10000000-0000-4000-8000-000000000003"
    inv_id = state.get("invoice_id") or ""

    # 1. Insert agent_runs row
    run_payload = {
        "id": agent_run_id,
        "business_id": biz_id,
        "agent_type": "RECEIVABLES_INTELLIGENCE",
        "trigger_type": "SCHEDULED",
        "entity_type": "INVOICE",
        "entity_id": inv_id,
        "status": "COMPLETED" if state.get("workflow_status") != "FAILED" else "FAILED",
        "input_context": {
            "invoice_number": state.get("invoice_number"),
            "outstanding_amount": state.get("outstanding_amount"),
            "days_overdue": state.get("days_overdue"),
            "customer_name": state.get("customer_name"),
            "baseline_score": state.get("baseline_score"),
            "baseline_priority": state.get("baseline_priority"),
        },
        "output": {
            "priority": state.get("agent_priority"),
            "policyDecision": state.get("policy_decision"),
            "safeAction": state.get("safe_action"),
            "reasoningMode": state.get("reasoning_mode"),
        },
        "reasoning_summary": state.get("priority_reason") or "Receivables evaluation complete.",
        "started_at": now_iso,
        "completed_at": now_iso,
        "error_message": state.get("error"),
    }

    try:
        supabase.from_("agent_runs").insert(run_payload).execute()
    except Exception as e:
        print(f"Warning: Failed to insert agent_runs row: {e}")

    # 2. Insert agent_decisions row
    decision_payload = {
        "id": agent_decision_id,
        "agent_run_id": agent_run_id,
        "business_id": biz_id,
        "agent_type": "RECEIVABLES_INTELLIGENCE",
        "entity_type": "INVOICE",
        "entity_id": inv_id,
        "decision_type": "PRIORITY_ASSESSMENT",
        "decision": state.get("agent_priority", "LOW"),
        "reason": state.get("priority_reason") or "Prioritization assessment complete.",
        "confidence": float(state.get("confidence", 0.92)),
        "evidence": state.get("evidence") or [],
        "created_at": now_iso,
    }

    try:
        supabase.from_("agent_decisions").insert(decision_payload).execute()
    except Exception as e:
        print(f"Warning: Failed to insert agent_decisions row: {e}")

    return {
        "agent_run_id": agent_run_id,
        "agent_decision_id": agent_decision_id,
        "workflow_status": "COMPLETED",
    }
