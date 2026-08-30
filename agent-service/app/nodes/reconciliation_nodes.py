from typing import Dict, Any, List
import uuid
from datetime import datetime, timezone

from app.state.reconciliation_state import ReconciliationAgentState
from app.services.reconciliation_context import fetch_reconciliation_context_by_exception_id, fetch_exception_id_by_lookup
from app.services.reconciliation_evaluator import evaluate_reconciliation_financials
from app.services.reconciliation_signals import extract_reconciliation_signals
from app.services.reconciliation_hypothesis import build_reconciliation_hypotheses
from app.services.gemini import call_reconciliation_gemini_api
from app.policies.reconciliation_policy import evaluate_reconciliation_policy_rules
from app.services.supabase import get_supabase_client

def load_reconciliation_context_node(state: ReconciliationAgentState) -> Dict[str, Any]:
    """1. Load Context Node: Fetches Exception, Invoice, Payment, Allocations, Customer, Comms."""
    exception_id = state.get("exception_id", "")
    if not exception_id:
        return {
            "workflow_status": "FAILED",
            "error": "No exception_id supplied to load_reconciliation_context_node.",
        }

    resolved_id = fetch_exception_id_by_lookup(exception_id)
    if not resolved_id:
        return {
            "workflow_status": "FAILED",
            "error": f"Reconciliation exception lookup '{exception_id}' not found in Supabase database.",
        }

    ctx = fetch_reconciliation_context_by_exception_id(resolved_id)
    if not ctx or not ctx.get("exception"):
        return {
            "workflow_status": "FAILED",
            "error": f"Reconciliation exception record '{resolved_id}' could not be loaded.",
        }

    exception = ctx["exception"]
    invoice = ctx.get("invoice") or {}
    payment = ctx.get("payment") or {}
    customer = ctx.get("customer") or {}

    inv_amount = float(invoice.get("amount", 0.0))
    inv_paid = float(invoice.get("paid_amount", 0.0))
    inv_outstanding = max(0.0, inv_amount - inv_paid)

    return {
        "exception_id": exception.get("id"),
        "business_id": exception.get("business_id") or invoice.get("business_id", ""),
        "customer_id": invoice.get("customer_id") or payment.get("customer_id", ""),
        "invoice_id": exception.get("invoice_id", ""),
        "payment_id": exception.get("payment_id", ""),

        "invoice_number": invoice.get("invoice_number", "INV-UNKNOWN"),
        "invoice_amount": inv_amount,
        "invoice_paid_amount": inv_paid,
        "invoice_outstanding_amount": inv_outstanding,
        "invoice_status": invoice.get("status", "UNPAID"),

        "payment_amount": float(payment.get("amount", 0.0)),
        "payment_status": payment.get("status", "completed"),
        "payment_method": payment.get("payment_method", "Bank Transfer"),
        "payment_date": str(payment.get("payment_date") or payment.get("created_at") or ""),
        "payment_reference": payment.get("reference_number") or payment.get("payment_reference") or "-",

        "expected_amount": float(exception.get("expected_amount") or inv_amount or 0.0),
        "received_amount": float(exception.get("received_amount") or payment.get("amount") or 0.0),
        "difference": float(exception.get("discrepancy_amount") or exception.get("difference") or 0.0),
        "exception_type_db": str(exception.get("exception_type", "UNKNOWN")).upper(),
        "exception_status_db": str(exception.get("status", "OPEN")).upper(),
        "db_ai_hypothesis": exception.get("ai_hypothesis") or "",
        "db_resolution_notes": exception.get("resolution_notes") or "",

        "customer_name": customer.get("name", "Customer Account"),
        "customer_risk_score": int(customer.get("risk_score", 50) or 50),
        "recent_communications": ctx.get("communications") or [],
        "payment_allocations": ctx.get("payment_allocations") or [],
        "payment_history_context": ctx.get("customer_payments") or [],

        "workflow_status": "PENDING",
    }

def build_reconciliation_signals_node(state: ReconciliationAgentState) -> Dict[str, Any]:
    """2. Build Reconciliation Signals Node: Extracts qualitative and payment method signals."""
    exception_obj = {"exception_type": state.get("exception_type_db")}
    invoice_obj = {}
    payment_obj = {
        "payment_method": state.get("payment_method"),
        "reference_number": state.get("payment_reference"),
    }
    comms = state.get("recent_communications") or []

    signals_res = extract_reconciliation_signals(
        exception=exception_obj,
        invoice=invoice_obj,
        payment=payment_obj,
        communications=comms,
        expected_amount=state.get("expected_amount", 0.0),
        received_amount=state.get("received_amount", 0.0),
        difference=state.get("difference", 0.0),
        allocated_amount=state.get("allocated_amount", 0.0),
    )
    return signals_res

def compare_financial_values_node(state: ReconciliationAgentState) -> Dict[str, Any]:
    """3. Compare Financial Values Node: Computes deterministic financial allocations & ratios."""
    exception_obj = {
        "expected_amount": state.get("expected_amount"),
        "received_amount": state.get("received_amount"),
        "discrepancy_amount": state.get("difference"),
    }
    invoice_obj = {
        "amount": state.get("invoice_amount"),
        "paid_amount": state.get("invoice_paid_amount"),
    }
    payment_obj = {
        "amount": state.get("payment_amount"),
        "status": state.get("payment_status"),
    }
    allocations = state.get("payment_allocations") or []

    fin_res = evaluate_reconciliation_financials(exception_obj, invoice_obj, payment_obj, allocations)
    return fin_res

def build_hypotheses_node(state: ReconciliationAgentState) -> Dict[str, Any]:
    """4. Build Hypotheses Node: Generates and ranks candidate hypotheses."""
    exception_obj = {"exception_type": state.get("exception_type_db")}
    invoice_obj = {}
    payment_obj = {"payment_method": state.get("payment_method")}
    signals = {
        "tds_signal": state.get("tds_signal"),
        "mdr_signal": state.get("mdr_signal"),
        "gst_signal": state.get("gst_signal"),
        "partial_payment_signal": state.get("partial_payment_signal"),
        "refund_signal": state.get("refund_signal"),
        "wrong_invoice_signal": state.get("wrong_invoice_signal"),
        "duplicate_payment_signal": state.get("duplicate_payment_signal"),
        "communication_signals": state.get("communication_signals") or [],
        "has_conflict": state.get("has_conflict", False),
        "conflict_reason": state.get("conflict_reason"),
        "conflict_details": state.get("conflict_details") or [],
    }


    hyp_res = build_reconciliation_hypotheses(
        exception=exception_obj,
        invoice=invoice_obj,
        payment=payment_obj,
        signals=signals,
        expected_amount=state.get("expected_amount", 0.0),
        received_amount=state.get("received_amount", 0.0),
        difference=state.get("difference", 0.0),
        allocated_amount=state.get("allocated_amount", 0.0),
        unallocated_amount=state.get("unallocated_amount", 0.0),
    )
    return hyp_res

def reconciliation_agent_reasoning_node(state: ReconciliationAgentState) -> Dict[str, Any]:
    """5. Reconciliation Agent Reasoning Node: Gemini 3.6 Flash structured output reasoning."""
    context_payload = {
        "exception_id": state.get("exception_id"),
        "invoice_number": state.get("invoice_number"),
        "customer_name": state.get("customer_name"),
        "expected_amount": state.get("expected_amount"),
        "received_amount": state.get("received_amount"),
        "difference": state.get("difference"),
        "allocated_amount": state.get("allocated_amount"),
        "unallocated_amount": state.get("unallocated_amount"),
        "payment_method": state.get("payment_method"),
        "exception_type_db": state.get("exception_type_db"),
        "candidate_hypotheses": state.get("candidate_hypotheses"),
        "ranked_hypotheses": state.get("ranked_hypotheses"),
        "communication_signals": state.get("communication_signals"),
        "db_ai_hypothesis": state.get("db_ai_hypothesis"),
    }

    try:
        output = call_reconciliation_gemini_api(context_payload)
        if output:
            return {
                "primary_hypothesis": output.primaryHypothesis,
                "reason": output.reason,
                "evidence": output.evidence,
                "alternative_hypotheses": output.alternativeHypotheses,
                "recommended_action": output.recommendedAction,
                "confidence": output.confidence,
                "reasoning_mode": "GEMINI",
            }
    except Exception as e:
        print(f"[Reconciliation Agent] Gemini reasoning exception: {e}")

    # Fallback Deterministic Reasoning
    top_hyp = state.get("top_hypothesis") or state.get("exception_type_db") or "UNKNOWN"
    exp = state.get("expected_amount", 0.0)
    rec = state.get("received_amount", 0.0)
    diff = state.get("difference", 0.0)

    fallback_reason = f"Deterministic hypothesis engine classified discrepancy of ₹{abs(diff):,.2f} as {top_hyp} based on evidence weighting."
    fallback_evidence = [
        f"Expected amount ₹{exp:,.2f} vs Received amount ₹{rec:,.2f} (Difference: ₹{diff:,.2f}).",
        f"Database exception type: {state.get('exception_type_db')}.",
        f"Top deterministic hypothesis: {top_hyp}.",
    ]
    fallback_action = "Review discrepancy documentation and request supporting tax/fee certificate from customer."

    return {
        "primary_hypothesis": top_hyp,
        "reason": fallback_reason,
        "evidence": fallback_evidence,
        "alternative_hypotheses": state.get("ranked_hypotheses")[1:] if state.get("ranked_hypotheses") else [],
        "recommended_action": fallback_action,
        "confidence": float(state.get("evidence_quality_score") or 0.85),
        "reasoning_mode": "DETERMINISTIC_FALLBACK",
    }

def validate_reconciliation_output_node(state: ReconciliationAgentState) -> Dict[str, Any]:
    """6. Validate Output Node: Validates Gemini schema & hypothesis values."""
    errors = []
    primary_hyp = state.get("primary_hypothesis")
    valid_hypotheses = ["TDS", "MDR", "GST", "PARTIAL_PAYMENT", "REFUND", "WRONG_INVOICE", "DUPLICATE_PAYMENT", "UNALLOCATED_PAYMENT", "UNKNOWN"]
    
    if not primary_hyp or primary_hyp not in valid_hypotheses:
        errors.append(f"Invalid primaryHypothesis '{primary_hyp}'. Must be one of {valid_hypotheses}")

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

def reconciliation_policy_check_node(state: ReconciliationAgentState) -> Dict[str, Any]:
    """7. Policy Check Node: Enforces deterministic reconciliation safety rules."""
    res = evaluate_reconciliation_policy_rules(state)
    return res

def reconciliation_human_review_node(state: ReconciliationAgentState) -> Dict[str, Any]:
    """8. Human Review Node: Fallback node for validation failures or policy flags."""
    return {
        "policy_decision": "HUMAN_REVIEW",
        "policy_reason": state.get("policy_reason") or "Exception flagged for human operator review.",
        "workflow_status": "HUMAN_REVIEW_REQUIRED",
    }

def reconciliation_persist_decision_node(state: ReconciliationAgentState) -> Dict[str, Any]:
    """9. Persist Decision Node: Records agent_runs and agent_decisions in Supabase."""
    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()

    agent_run_id = str(uuid.uuid4())
    agent_decision_id = str(uuid.uuid4())
    biz_id = state.get("business_id") or "10000000-0000-4000-8000-000000000003"
    exc_id = state.get("exception_id") or ""

    run_payload = {
        "id": agent_run_id,
        "business_id": biz_id,
        "agent_type": "RECEIVABLES_INTELLIGENCE",
        "trigger_type": "SCHEDULED",
        "entity_type": "RECONCILIATION_EXCEPTION",
        "entity_id": exc_id,
        "status": "COMPLETED" if state.get("workflow_status") != "FAILED" else "FAILED",
        "input_context": {
            "exception_id": exc_id,
            "invoice_number": state.get("invoice_number"),
            "expected_amount": state.get("expected_amount"),
            "received_amount": state.get("received_amount"),
            "difference": state.get("difference"),
            "customer_name": state.get("customer_name"),
        },
        "output": {
            "primaryHypothesis": state.get("primary_hypothesis"),
            "policyDecision": state.get("policy_decision"),
            "safeAction": state.get("safe_action"),
            "reasoningMode": state.get("reasoning_mode"),
        },
        "reasoning_summary": state.get("reason") or "Reconciliation evaluation complete.",
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
        "entity_type": "RECONCILIATION_EXCEPTION",
        "entity_id": exc_id,
        "decision_type": "RECONCILIATION_HYPOTHESIS_ASSESSMENT",
        "decision": state.get("primary_hypothesis", "UNKNOWN"),
        "reason": state.get("reason") or "Reconciliation hypothesis assessment complete.",
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

def reconciliation_audit_node(state: ReconciliationAgentState) -> Dict[str, Any]:
    """10. Audit Node: Writes immutable execution record to audit_logs."""
    supabase = get_supabase_client()
    now_iso = datetime.now(timezone.utc).isoformat()

    biz_id = state.get("business_id") or "10000000-0000-4000-8000-000000000003"
    exc_id = state.get("exception_id") or ""
    primary_hyp = state.get("primary_hypothesis") or "UNKNOWN"
    decision = state.get("policy_decision") or "HUMAN_REVIEW"

    audit_payload = {
        "id": str(uuid.uuid4()),
        "business_id": biz_id,
        "actor_type": "AGENT",
        "actor_id": "ReconciliationIntelligenceAgent",
        "event_type": "RECONCILIATION_AGENT_EVALUATION",
        "entity_type": "RECONCILIATION_EXCEPTION",
        "entity_id": exc_id,
        "description": f"Evaluated exception {exc_id} -> Primary Hypothesis: {primary_hyp}, Policy: {decision}",
        "before_state": {"exception_type": state.get("exception_type_db")},
        "after_state": {
            "primary_hypothesis": primary_hyp,
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
