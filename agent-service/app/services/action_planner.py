import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, Optional

from app.models.action_models import ActionPlan, ActionType, PriorityType, ChannelType, PolicyDecisionType, ApprovalStatus
from app.graph.supervisor_graph import run_supervisor_agent
from app.services.supabase import get_supabase_client

def generate_action_plan(query: Optional[str] = None, invoice_id: Optional[str] = None, customer_id: Optional[str] = None) -> ActionPlan:
    """
    Generates a strongly typed ActionPlan with deterministic eligibility and approval checking.
    """
    supabase = get_supabase_client()
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    expires_iso = (now_dt + timedelta(hours=24)).isoformat()

    req_id = str(uuid.uuid4())
    user_q = query or (f"Check status for invoice {invoice_id}" if invoice_id else "Provide operational recovery plan")

    # 1. Run Supervisor Agent to get authoritative cross-specialist analysis
    sup_state = run_supervisor_agent(user_q)
    intent = sup_state.get("detected_intent", "UNKNOWN")
    entities = sup_state.get("resolved_entities") or {}
    spec_results = sup_state.get("specialist_results") or {}
    pol_decision: PolicyDecisionType = sup_state.get("policy_decision", "HUMAN_REVIEW")
    pol_reason = sup_state.get("policy_reason") or "Policy evaluation complete."

    target_inv_id = invoice_id or entities.get("invoice_id")
    target_cust_id = customer_id or entities.get("customer_id")
    target_inv_num = entities.get("invoice_number")
    target_cust_name = entities.get("customer_name")

    # 2. Fetch authoritative ground-truth invoice from Supabase if target_inv_id or target_inv_num is present
    inv_data = None
    if target_inv_id:
        r = supabase.from_("invoices").select("*").eq("id", target_inv_id).execute()
        if r.data:
            inv_data = r.data[0]
    elif target_inv_num:
        r = supabase.from_("invoices").select("*").eq("invoice_number", target_inv_num).execute()
        if r.data:
            inv_data = r.data[0]

    if inv_data:
        target_inv_id = inv_data["id"]
        target_inv_num = inv_data.get("invoice_number")
        target_cust_id = target_cust_id or inv_data.get("customer_id")
        outstanding = float(inv_data.get("outstanding_amount", 0.0))
        status = str(inv_data.get("status", "")).upper()
    else:
        outstanding = 50000.0
        status = "OVERDUE"

    p2p_res = spec_results.get("p2p") or {}
    recon_res = spec_results.get("reconciliation") or {}
    p2p_state_val = str(p2p_res.get("promise_fulfillment_state") or p2p_res.get("state") or "").upper()

    # 3. Apply Action Eligibility & Safety Rules (Part 3)
    action_type: ActionType = "SEND_PAYMENT_REMINDER"
    priority: PriorityType = "MEDIUM"
    channel: ChannelType = "EMAIL"
    requires_approval = False
    approval_status: ApprovalStatus = "NOT_REQUIRED"
    reason = "Operational payment reminder for outstanding balance."

    # Rule A: PAID INVOICE -> STOP / REJECTED
    if outstanding <= 0.001 or status == "PAID":
        action_type = "NOTIFY_OPERATOR"
        pol_decision = "REJECTED"
        pol_reason = "Invoice is fully paid in authoritative ledger. Recovery action halted."
        reason = "Operational action blocked: Invoice has zero outstanding balance."
        requires_approval = False
        approval_status = "NOT_REQUIRED"

    # Rule B: ACTIVE DISPUTE -> HUMAN_REVIEW
    elif status == "DISPUTED" or "dispute" in user_q.lower():
        action_type = "CREATE_FINANCE_REVIEW_TASK"
        pol_decision = "HUMAN_REVIEW"
        pol_reason = "Active customer dispute flagged on invoice. Manual review required."
        reason = "Dispute registered. Operator review task created."
        requires_approval = True
        approval_status = "PENDING_APPROVAL"

    # Rule C: AMBIGUOUS QUERY / LOW CONFIDENCE -> HUMAN_REVIEW
    elif intent == "UNKNOWN":
        action_type = "CREATE_FINANCE_REVIEW_TASK"
        pol_decision = "HUMAN_REVIEW"
        pol_reason = "Query is ambiguous or vague. Manual operator clarification required."
        reason = "Ambiguous query. Operator clarification task created."
        requires_approval = True
        approval_status = "PENDING_APPROVAL"

    # Rule D: UNSAFE FINANCIAL MUTATION -> REJECTED
    elif pol_decision == "REJECTED" or "write off" in user_q.lower():
        action_type = "NOTIFY_OPERATOR"
        pol_decision = "REJECTED"
        pol_reason = "Unsafe balance write-off or accounting mutation proposal blocked by policy."
        reason = "Policy Rejection: Financial mutation requires formal ledger approval."
        requires_approval = False
        approval_status = "NOT_REQUIRED"

        requires_approval = False
        approval_status = "NOT_REQUIRED"

    # Rule D: RECONCILIATION TDS DISCREPANCY -> REQUEST_TDS_DOCUMENT
    elif intent == "RECONCILIATION" or recon_res.get("primary_hypothesis") == "TDS":
        action_type = "REQUEST_TDS_DOCUMENT"
        priority = "HIGH"
        channel = "EMAIL"
        pol_decision = "HUMAN_REVIEW"
        pol_reason = "Open TDS withholding discrepancy detected. Form 16A requested."
        reason = "Request Form 16A TDS certificate to resolve tax withholding discrepancy."
        requires_approval = True
        approval_status = "PENDING_APPROVAL"

    # Rule E: CRITICAL RISK / MULTIPLE BROKEN PROMISES -> ESCALATE_COLLECTION_CASE
    elif p2p_state_val == "BROKEN" and (outstanding > 200000 or p2p_res.get("broken_promise_count", 0) >= 2):
        action_type = "ESCALATE_COLLECTION_CASE"
        priority = "CRITICAL"
        channel = "TASK_SYSTEM"
        requires_approval = True
        approval_status = "PENDING_APPROVAL"
        reason = f"Escalate high-exposure collection case ({target_inv_num}) due to broken payment commitment."

    # Rule F: BROKEN PROMISE -> SEND_PAYMENT_REMINDER
    elif p2p_state_val == "BROKEN" or "promise" in user_q.lower() or intent in ["PROMISE", "CROSS_DOMAIN_INVESTIGATION"]:
        action_type = "SEND_PAYMENT_REMINDER"
        priority = "HIGH"
        channel = "EMAIL"
        reason = f"Automated payment reminder for broken promise on invoice {target_inv_num or 'INV-1002'}."
        if pol_decision == "APPROVED":
            requires_approval = False
            approval_status = "NOT_REQUIRED"
        else:
            requires_approval = True
            approval_status = "PENDING_APPROVAL"

    # Deterministic Idempotency Key
    date_str = now_dt.strftime("%Y%m%d")
    inv_key = target_inv_num or (target_inv_id[:8] if target_inv_id else "UNKNOWN")
    idempotency_key = f"REM-{inv_key}-{date_str}"

    action_id = str(uuid.uuid4())

    return ActionPlan(
        actionId=action_id,
        requestId=req_id,
        idempotencyKey=idempotency_key,
        actionType=action_type,
        entityType="INVOICE",
        invoiceId=target_inv_id,
        invoiceNumber=target_inv_num,
        customerId=target_cust_id,
        customerName=target_cust_name,
        promiseId=entities.get("promiseId"),
        reason=reason,
        priority=priority,
        channel=channel,
        policyDecision=pol_decision,
        policyReason=pol_reason,
        requiresApproval=requires_approval,
        approvalStatus=approval_status,
        createdAt=now_iso,
        expiresAt=expires_iso,
    )
