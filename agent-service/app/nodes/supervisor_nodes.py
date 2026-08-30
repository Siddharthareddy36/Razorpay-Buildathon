from typing import Dict, Any, List
import uuid
from datetime import datetime, timezone

from app.state.supervisor_state import SupervisorState
from app.services.supervisor_intent import (
    classify_supervisor_intent,
    resolve_supervisor_entities,
    determine_specialist_selection,
)
from app.services.supervisor_synthesis import (
    check_cross_agent_conflicts,
    synthesize_cross_agent_results,
)
from app.policies.supervisor_policy import evaluate_supervisor_policy_rules

from app.graph.receivables_graph import run_receivables_agent
from app.graph.p2p_graph import run_p2p_agent
from app.graph.reconciliation_graph import run_reconciliation_agent

from app.services.supabase import get_supabase_client

def understand_request_node(state: SupervisorState) -> Dict[str, Any]:
    """1. Understand Request Node: Deterministic intent classification."""
    query = state.get("user_query", "")
    intent = classify_supervisor_intent(query)

    is_ambiguous = (intent == "UNKNOWN")
    clarification = None
    if is_ambiguous:
        clarification = "Do you want a portfolio priority summary, customer promise review, or payment reconciliation investigation?"

    return {
        "detected_intent": intent,
        "is_ambiguous": is_ambiguous,
        "clarification_prompt": clarification,
        "workflow_status": "UNKNOWN" if is_ambiguous else "PENDING",
    }

def resolve_entities_node(state: SupervisorState) -> Dict[str, Any]:
    """2. Resolve Entities Node: Resolves entities and performs Supabase existence validation."""
    query = state.get("user_query", "")
    entities = resolve_supervisor_entities(query, state.get("resolved_entities"))

    if entities.get("entity_not_found"):
        return {
            "resolved_entities": entities,
            "entity_not_found": True,
            "missing_entity_id": entities.get("missing_entity_id"),
            "detected_intent": "NOT_FOUND",
            "workflow_status": "NOT_FOUND",
        }

    return {
        "resolved_entities": entities,
        "entity_not_found": False,
    }

def create_execution_plan_node(state: SupervisorState) -> Dict[str, Any]:
    """3. Create Execution Plan Node: Determines selected agents and execution plan."""
    intent = state.get("detected_intent", "UNKNOWN")
    entities = state.get("resolved_entities") or {}
    query = state.get("user_query", "")

    selected_agents = determine_specialist_selection(intent, entities, query)
    plan = [{"step": idx + 1, "agent": agent, "status": "PENDING"} for idx, agent in enumerate(selected_agents)]

    return {
        "selected_agents": selected_agents,
        "execution_plan": plan,
    }

def run_specialists_node(state: SupervisorState) -> Dict[str, Any]:
    """4. Run Specialists Node: Minimizes specialist invocation based on plan."""
    selected_agents = state.get("selected_agents") or []
    entities = state.get("resolved_entities") or {}
    workflow_status = state.get("workflow_status")

    if not selected_agents or workflow_status in ["NOT_FOUND", "UNKNOWN"]:
        return {
            "specialist_results": {},
            "specialist_errors": {},
        }

    results: Dict[str, Any] = {}
    errors: Dict[str, str] = {}

    lookup_inv = entities.get("invoice_id") or entities.get("invoice_number") or "20a9bb94-56fa-4a44-a89b-db3e3791f7df"
    lookup_p2p = entities.get("promise_id") or entities.get("invoice_id") or "1b09eef5-f9d2-43e9-9cf9-5ac3b9762540"
    lookup_recon = entities.get("exception_id") or entities.get("invoice_id") or "68bcd063-6c6a-4cac-be55-8a12deac8b8c"

    # Run Receivables Agent
    if "RECEIVABLES" in selected_agents:
        try:
            rec_state = run_receivables_agent(lookup_inv)
            results["receivables"] = dict(rec_state)
        except Exception as e:
            errors["receivables"] = str(e)
            print(f"[Supervisor] Receivables Agent execution error: {e}")

    # Run Promise-to-Pay Agent
    if "P2P" in selected_agents:
        try:
            p2p_state = run_p2p_agent(lookup_p2p)
            results["p2p"] = dict(p2p_state)
        except Exception as e:
            errors["p2p"] = str(e)
            print(f"[Supervisor] P2P Agent execution error: {e}")

    # Run Reconciliation Agent
    if "RECONCILIATION" in selected_agents:
        try:
            recon_state = run_reconciliation_agent(lookup_recon)
            results["reconciliation"] = dict(recon_state)
        except Exception as e:
            errors["reconciliation"] = str(e)
            print(f"[Supervisor] Reconciliation Agent execution error: {e}")

    return {
        "specialist_results": results,
        "specialist_errors": errors,
    }

def collect_results_node(state: SupervisorState) -> Dict[str, Any]:
    """5. Collect Results Node: Verifies specialist execution outcome."""
    intent = state.get("detected_intent")
    if intent in ["NOT_FOUND", "UNKNOWN"]:
        return {"workflow_status": intent}

    results = state.get("specialist_results") or {}
    if not results:
        return {
            "workflow_status": "FAILED",
            "error": "No specialist agent results were collected.",
        }
    return {"workflow_status": "PENDING"}

def check_conflicts_node(state: SupervisorState) -> Dict[str, Any]:
    """6. Check Conflicts Node: Detects cross-agent contradictory outcomes."""
    intent = state.get("detected_intent")
    if intent in ["NOT_FOUND", "UNKNOWN"]:
        return {
            "has_cross_agent_conflict": False,
            "conflict_summary": None,
        }

    results = state.get("specialist_results") or {}
    has_conflict, conflict_summary = check_cross_agent_conflicts(results)
    return {
        "has_cross_agent_conflict": has_conflict,
        "conflict_summary": conflict_summary,
    }

def synthesize_node(state: SupervisorState) -> Dict[str, Any]:
    """7. Synthesize Node: Generates final response or NOT_FOUND / Clarification prompt."""
    intent = state.get("detected_intent", "UNKNOWN")
    query = state.get("user_query", "")
    entities = state.get("resolved_entities") or {}
    results = state.get("specialist_results") or {}

    # Case 1: NOT_FOUND handling
    if intent == "NOT_FOUND":
        missing_id = state.get("missing_entity_id") or entities.get("invoice_number") or "requested entity"
        return {
            "final_summary": f"Entity '{missing_id}' was not found in the authoritative database. No specialist reasoning was executed.",
            "cross_domain_findings": [f"Database Verification: Entity identifier '{missing_id}' does not exist in Supabase PostgreSQL."],
            "agent_insights": [],
            "final_recommendation": f"Please verify entity identifier '{missing_id}' and retry query.",
            "has_cross_agent_conflict": False,
            "conflict_summary": None,
        }

    # Case 2: UNKNOWN / Ambiguous handling
    if intent == "UNKNOWN":
        clarification = state.get("clarification_prompt") or "Do you want a portfolio priority summary, customer promise review, or payment reconciliation investigation?"
        return {
            "final_summary": clarification,
            "cross_domain_findings": ["Query Classification: Input query is ambiguous or vague."],
            "agent_insights": [],
            "final_recommendation": "Please select whether you require a Portfolio Priority Summary, Customer Promise Review, or Payment Reconciliation Investigation.",
            "has_cross_agent_conflict": False,
            "conflict_summary": None,
        }

    synth_res = synthesize_cross_agent_results(query, intent, entities, results)
    return synth_res

def final_policy_gate_node(state: SupervisorState) -> Dict[str, Any]:
    """8. Final Policy Gate Node: Enforces supervisor policy precedence & safety guardrails."""
    pol_res = evaluate_supervisor_policy_rules(state)
    return pol_res

def supervisor_audit_node(state: SupervisorState) -> Dict[str, Any]:
    """9. Supervisor Audit Node: Writes immutable execution telemetry to audit_logs."""
    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()
    audit_id = str(uuid.uuid4())

    biz_id = state.get("business_id") or "10000000-0000-4000-8000-000000000003"
    query = state.get("user_query", "")
    intent = state.get("detected_intent", "UNKNOWN")
    selected = state.get("selected_agents") or []
    decision = state.get("policy_decision") or "HUMAN_REVIEW"

    audit_payload = {
        "id": audit_id,
        "business_id": biz_id,
        "actor_type": "AGENT",
        "actor_id": "MultiAgentSupervisor",
        "event_type": "SUPERVISOR_WORKFLOW_EXECUTION",
        "entity_type": "SUPERVISOR_SESSION",
        "entity_id": state.get("request_id") or audit_id,
        "description": f"Supervisor Query: '{query[:60]}' -> Intent: {intent}, Selected Agents: {selected}, Policy: {decision}",
        "before_state": {"intent": intent},
        "after_state": {
            "selected_agents": selected,
            "policy_decision": decision,
            "final_summary": state.get("final_summary")[:200] if state.get("final_summary") else "",
        },
        "metadata": {
            "request_id": state.get("request_id"),
            "has_cross_agent_conflict": state.get("has_cross_agent_conflict"),
            "conflict_summary": state.get("conflict_summary"),
            "rules_triggered": state.get("rules_triggered"),
        },
        "created_at": now_iso,
    }

    try:
        supabase.from_("audit_logs").insert(audit_payload).execute()
    except Exception as e:
        print(f"Warning: Failed to insert supervisor audit_logs row: {e}")

    wf_status = "COMPLETED"
    if intent == "NOT_FOUND":
        wf_status = "NOT_FOUND"
    elif intent == "UNKNOWN":
        wf_status = "UNKNOWN"

    return {
        "audit_id": audit_id,
        "workflow_status": wf_status,
    }
