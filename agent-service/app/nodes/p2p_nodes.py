from typing import Dict, Any, List
import uuid
from datetime import datetime, timezone

from app.state.p2p_state import P2PAgentState
from app.services.p2p_context import fetch_p2p_context_by_promise_id, fetch_promise_id_by_lookup
from app.services.p2p_evaluator import evaluate_p2p_deterministic
from app.services.p2p_reliability import calculate_customer_commitment_reliability
from app.services.p2p_signals import extract_p2p_communication_signals
from app.services.gemini import call_p2p_gemini_api
from app.policies.p2p_policy import evaluate_p2p_policy_rules
from app.services.supabase import get_supabase_client, SupabaseTransientError, is_retryable_exception

def load_p2p_context_node(state: P2PAgentState) -> Dict[str, Any]:
    """1. Load Context Node: Fetches Promise, Invoice, Customer, Payments, History, Comms, Exceptions."""
    promise_id = state.get("promise_id", "")
    if not promise_id:
        return {
            "workflow_status": "FAILED",
            "error": "No promise_id supplied to load_p2p_context_node.",
            "failed_component": "input",
            "retryable": False,
        }

    try:
        # Resolve lookup if lookup string is passed (e.g. invoice_id or invoice_number)
        resolved_id = fetch_promise_id_by_lookup(promise_id)
        if not resolved_id:
            return {
                "workflow_status": "FAILED",
                "error": f"Promise or invoice lookup '{promise_id}' not found in Supabase database.",
                "failed_component": "promise_lookup",
                "retryable": False,
            }

        ctx = fetch_p2p_context_by_promise_id(resolved_id)
        if not ctx or not ctx.get("promise"):
            return {
                "workflow_status": "FAILED",
                "error": f"Promise record '{resolved_id}' could not be loaded.",
                "failed_component": "promise",
                "retryable": False,
            }
    except SupabaseTransientError as e:
        print(f"[LOAD_CONTEXT] SupabaseTransientError in {e.component}: {e}")
        return {
            "workflow_status": "FAILED",
            "error": "P2P_CONTEXT_UNAVAILABLE",
            "failed_component": e.component,
            "retryable": True,
        }
    except Exception as e:
        print(f"[LOAD_CONTEXT] Database Exception: {e}")
        retryable = is_retryable_exception(e)
        return {
            "workflow_status": "FAILED",
            "error": "P2P_CONTEXT_UNAVAILABLE" if retryable else f"Database read failure: {e}",
            "failed_component": getattr(e, "component", "database"),
            "retryable": retryable,
        }

    promise = ctx["promise"]
    invoice = ctx.get("invoice") or {}
    customer = ctx.get("customer") or {}

    inv_amount = float(invoice.get("amount", 0.0))
    inv_paid = float(invoice.get("paid_amount", 0.0))
    inv_outstanding = max(0.0, inv_amount - inv_paid)

    return {
        "promise_id": promise.get("id"),
        "business_id": promise.get("business_id") or invoice.get("business_id", ""),
        "customer_id": promise.get("customer_id", ""),
        "invoice_id": promise.get("invoice_id", ""),
        "invoice_number": invoice.get("invoice_number", "INV-UNKNOWN"),
        "invoice_amount": inv_amount,
        "invoice_paid_amount": inv_paid,
        "invoice_outstanding_amount": inv_outstanding,
        "invoice_status": invoice.get("status", "UNPAID"),
        "invoice_due_date": invoice.get("due_date", ""),
        "days_overdue": ctx.get("days_overdue", 0),

        "promised_amount": float(promise.get("promised_amount", 0.0)),
        "promised_date": str(promise.get("promised_date", "")),
        "promise_db_status": str(promise.get("status", "ACTIVE")).upper(),

        "customer_name": customer.get("name", "Customer Account"),
        "customer_risk_score": int(customer.get("risk_score", 50) or 50),
        "customer_average_payment_delay": float(customer.get("average_payment_delay_days", 0) or 0),
        "customer_overdue_invoice_count": int(customer.get("total_overdue_invoices", 0) or 0),

        "payment_evidence": ctx.get("payments") or [],
        "recent_communications": ctx.get("communications") or [],
        "exception_context": ctx.get("exceptions") or [],
        "customer_promises_context": ctx.get("customer_promises") or [],

        "workflow_status": "PENDING",
    }

def build_p2p_signals_node(state: P2PAgentState) -> Dict[str, Any]:
    """2. Build Signals Node: Extracts qualitative communication markers."""
    comms = state.get("recent_communications") or []
    signals_res = extract_p2p_communication_signals(comms)
    return signals_res

def evaluate_promise_state_node(state: P2PAgentState) -> Dict[str, Any]:
    """3. Evaluate Promise State Node: Deterministically calculates fulfillment ratio & promise state."""
    promise_obj = {
        "promised_amount": state.get("promised_amount", 0.0),
        "promised_date": state.get("promised_date", ""),
        "status": state.get("promise_db_status", "ACTIVE"),
    }
    invoice_obj = {
        "amount": state.get("invoice_amount", 0.0),
        "paid_amount": state.get("invoice_paid_amount", 0.0),
    }
    payments = state.get("payment_evidence") or []

    eval_res = evaluate_p2p_deterministic(promise_obj, invoice_obj, payments, [])
    return eval_res

def assess_commitment_reliability_node(state: P2PAgentState) -> Dict[str, Any]:
    """4. Assess Commitment Reliability Node: Evaluates customer history & commitment reliability score."""
    customer_promises = state.get("customer_promises_context") or []
    current_promise_id = state.get("promise_id", "")
    det_state = state.get("deterministic_promise_state", "ACTIVE")
    fulfillment_ratio = state.get("fulfillment_ratio", 0.0)
    days_past = state.get("days_past_promise", 0)
    risk_score = state.get("customer_risk_score", 50)

    rel_res = calculate_customer_commitment_reliability(
        customer_promises=customer_promises,
        current_promise_id=current_promise_id,
        deterministic_promise_state=det_state,
        fulfillment_ratio=fulfillment_ratio,
        days_past_promise=days_past,
        customer_risk_score=risk_score,
    )
    return rel_res

def p2p_agent_reasoning_node(state: P2PAgentState) -> Dict[str, Any]:
    """5. P2P Agent Reasoning Node: Gemini 3.6 Flash structured output reasoning."""
    context_payload = {
        "promise_id": state.get("promise_id"),
        "invoice_number": state.get("invoice_number"),
        "customer_name": state.get("customer_name"),
        "promised_amount": state.get("promised_amount"),
        "promised_date": state.get("promised_date"),
        "fulfilled_amount": state.get("fulfilled_amount"),
        "remaining_promised_amount": state.get("remaining_promised_amount"),
        "fulfillment_ratio": state.get("fulfillment_ratio"),
        "days_until_promise": state.get("days_until_promise"),
        "days_past_promise": state.get("days_past_promise"),
        "deterministic_promise_state": state.get("deterministic_promise_state"),
        "promise_db_status": state.get("promise_db_status"),
        "data_consistency_warning": state.get("data_consistency_warning"),
        "commitment_reliability": state.get("commitment_reliability"),
        "recent_broken_trend": state.get("recent_broken_trend"),
        "historical_broken_count": state.get("historical_broken_count"),
        "historical_promise_count": state.get("historical_promise_count"),
        "historical_broken_ratio": state.get("historical_broken_ratio"),
        "communication_signals": state.get("communication_signals"),
        "dispute_signal": state.get("dispute_signal"),
        "exception_count": len(state.get("exception_context") or []),
    }

    try:
        output = call_p2p_gemini_api(context_payload)
        if output:
            return {
                "promise_assessment": output.promiseAssessment,
                "reason": output.reason,
                "evidence": output.evidence,
                "recommended_action": output.recommendedAction,
                "confidence": output.confidence,
                "reasoning_mode": "GEMINI",
            }
    except Exception as e:
        print(f"[P2P Agent] Gemini reasoning exception: {e}")

    # Fallback Deterministic Reasoning
    det_state = state.get("deterministic_promise_state", "ACTIVE")
    reliability = state.get("commitment_reliability", "MEDIUM")
    promised_amt = state.get("promised_amount", 0.0)
    promised_date = state.get("promised_date", "")

    assessment_map = {
        "FULFILLED": "FULFILLED",
        "PARTIALLY_FULFILLED": "PARTIALLY_FULFILLED",
        "BROKEN": "BROKEN",
        "ACTIVE": "AT_RISK" if reliability in ["LOW", "CRITICAL"] else "RELIABLE",
    }
    fallback_assessment = assessment_map.get(det_state, "AT_RISK")
    fallback_reason = f"Deterministic evaluation classified promise as {det_state} with {reliability} commitment reliability."
    fallback_evidence = [
        f"Promised amount ₹{promised_amt:,.2f} on {promised_date}.",
        f"Deterministic promise state: {det_state}.",
        f"Customer commitment reliability: {reliability}.",
    ]
    fallback_action = (
        "Initiate outbound telephone collections follow-up."
        if det_state in ["BROKEN", "PARTIALLY_FULFILLED"] or reliability in ["LOW", "CRITICAL"]
        else "Monitor payment receipt until promised date."
    )

    return {
        "promise_assessment": fallback_assessment,
        "reason": fallback_reason,
        "evidence": fallback_evidence,
        "recommended_action": fallback_action,
        "confidence": 0.85,
        "reasoning_mode": "DETERMINISTIC_FALLBACK",
    }

def validate_p2p_output_node(state: P2PAgentState) -> Dict[str, Any]:
    """6. Validate Output Node: Validates Gemini response schema & range rules."""
    errors = []
    assessment = state.get("promise_assessment")
    valid_assessments = ["RELIABLE", "AT_RISK", "BROKEN", "PARTIALLY_FULFILLED", "FULFILLED"]
    
    if not assessment or assessment not in valid_assessments:
        errors.append(f"Invalid promiseAssessment '{assessment}'. Must be one of {valid_assessments}")

    reason = state.get("reason", "")
    if not reason or len(reason.strip()) < 5:
        errors.append("Reason text is missing or too short.")

    confidence = state.get("confidence", 0.0)
    if confidence < 0.0 or confidence > 1.0:
        errors.append(f"Confidence score {confidence} is out of range [0.0, 1.0]")

    if errors:
        return {
            "validation_status": "INVALID",
            "validation_errors": errors,
        }

    return {
        "validation_status": "VALID",
        "validation_errors": [],
    }

def p2p_policy_check_node(state: P2PAgentState) -> Dict[str, Any]:
    """7. Policy Check Node: Enforces deterministic safety rules."""
    res = evaluate_p2p_policy_rules(state)
    return res

def p2p_human_review_node(state: P2PAgentState) -> Dict[str, Any]:
    """8. Human Review Node: Fallback node for validation failures or policy flags."""
    return {
        "policy_decision": "HUMAN_REVIEW",
        "policy_reason": state.get("policy_reason") or "Case flagged for human operational review.",
        "workflow_status": "HUMAN_REVIEW_REQUIRED",
    }

def p2p_persist_decision_node(state: P2PAgentState) -> Dict[str, Any]:
    """9. Persist Decision Node: Records agent_runs and agent_decisions in Supabase."""
    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()

    agent_run_id = str(uuid.uuid4())
    agent_decision_id = str(uuid.uuid4())
    biz_id = state.get("business_id") or "10000000-0000-4000-8000-000000000003"
    promise_id = state.get("promise_id") or ""

    run_payload = {
        "id": agent_run_id,
        "business_id": biz_id,
        "agent_type": "RECEIVABLES_INTELLIGENCE",
        "trigger_type": "SCHEDULED",
        "entity_type": "PROMISE",
        "entity_id": promise_id,
        "status": "COMPLETED" if state.get("workflow_status") != "FAILED" else "FAILED",
        "input_context": {
            "promise_id": promise_id,
            "invoice_number": state.get("invoice_number"),
            "promised_amount": state.get("promised_amount"),
            "promised_date": state.get("promised_date"),
            "fulfilled_amount": state.get("fulfilled_amount"),
            "customer_name": state.get("customer_name"),
        },
        "output": {
            "promiseAssessment": state.get("promise_assessment"),
            "commitmentReliability": state.get("commitment_reliability"),
            "policyDecision": state.get("policy_decision"),
            "safeAction": state.get("safe_action"),
            "reasoningMode": state.get("reasoning_mode"),
        },
        "reasoning_summary": state.get("reason") or "P2P evaluation complete.",
        "started_at": now_iso,
        "completed_at": now_iso,
        "error_message": state.get("error"),
    }

    try:
        supabase.from_("agent_runs").insert(run_payload).execute()
    except Exception as e:
        print(f"Warning: Failed to insert agent_runs row: {e}")

    decision_payload = {
        "id": agent_decision_id,
        "agent_run_id": agent_run_id,
        "business_id": biz_id,
        "agent_type": "RECEIVABLES_INTELLIGENCE",
        "entity_type": "PROMISE",
        "entity_id": promise_id,
        "decision_type": "PROMISE_RELIABILITY_ASSESSMENT",
        "decision": state.get("promise_assessment", "AT_RISK"),
        "reason": state.get("reason") or "Promise assessment complete.",
        "confidence": float(state.get("confidence", 0.90)),
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

def p2p_audit_node(state: P2PAgentState) -> Dict[str, Any]:
    """10. Audit Node: Writes immutable execution record to audit_logs."""
    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()

    biz_id = state.get("business_id") or "10000000-0000-4000-8000-000000000003"
    promise_id = state.get("promise_id") or ""
    assessment = state.get("promise_assessment") or "AT_RISK"
    decision = state.get("policy_decision") or "HUMAN_REVIEW"

    audit_payload = {
        "id": str(uuid.uuid4()),
        "business_id": biz_id,
        "actor_type": "AGENT",
        "actor_id": "P2PIntelligenceAgent",
        "event_type": "P2P_AGENT_EVALUATION",
        "entity_type": "PROMISE",
        "entity_id": promise_id,
        "description": f"Evaluated promise {promise_id} -> Assessment: {assessment}, Policy: {decision}",
        "before_state": {"db_status": state.get("promise_db_status")},
        "after_state": {
            "promise_assessment": assessment,
            "deterministic_state": state.get("deterministic_promise_state"),
            "commitment_reliability": state.get("commitment_reliability"),
            "policy_decision": decision,
            "safe_action": state.get("safe_action"),
        },
        "metadata": {
            "agent_run_id": state.get("agent_run_id"),
            "agent_decision_id": state.get("agent_decision_id"),
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

