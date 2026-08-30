import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from app.state.receivables_state import ReceivablesState
from app.services.supabase import get_supabase_client

def audit_node(state: ReceivablesState) -> Dict[str, Any]:
    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()

    biz_id = state.get("business_id") or "10000000-0000-4000-8000-000000000003"
    inv_id = state.get("invoice_id") or ""
    inv_num = state.get("invoice_number") or "INV"
    priority = state.get("agent_priority") or "LOW"
    decision = state.get("policy_decision") or "HUMAN_REVIEW"

    audit_payload = {
        "id": str(uuid.uuid4()),
        "business_id": biz_id,
        "actor_type": "AGENT",
        "actor_id": "ReceivablesIntelligenceAgent",
        "event_type": "RECEIVABLES_AGENT_EVALUATION",
        "entity_type": "INVOICE",
        "entity_id": inv_id,
        "description": f"Evaluated invoice {inv_num} -> Priority: {priority}, Policy Decision: {decision}",
        "before_state": {"status": state.get("invoice_status")},
        "after_state": {
            "priority": priority,
            "policy_decision": decision,
            "safe_action": state.get("safe_action"),
        },
        "metadata": {
            "agent_run_id": state.get("agent_run_id"),
            "agent_decision_id": state.get("agent_decision_id"),
            "baseline_score": state.get("baseline_score"),
            "confidence": state.get("confidence"),
            "reasoning_mode": state.get("reasoning_mode"),
            "rules_triggered": state.get("rules_triggered"),
        },
        "created_at": now_iso,
    }

    try:
        supabase.from_("audit_logs").insert(audit_payload).execute()
    except Exception as e:
        print(f"Warning: Failed to insert audit_logs row: {e}")

    return {"workflow_status": "COMPLETED"}
