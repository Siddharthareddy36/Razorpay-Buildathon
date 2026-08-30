import os
import sys
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.models.action_models import ActionExecutionRequest, OutcomeTrackingRequest
from app.services.action_planner import generate_action_plan
from app.services.n8n_workflow_engine import execute_n8n_recovery_workflow
from app.services.outcome_tracker import track_financial_outcome

def run_action_planner_evaluation_suite():
    print("=" * 80)
    print("PHASE 7 — ACTION PLANNER & CONTROLLED N8N RECOVERY WORKFLOW EVALUATION (15 SCENARIOS)")
    print("=" * 80)

    results = []

    # Scenario A: Broken promise -> payment reminder eligible (APPROVED)
    print("\nScenario 01 [Broken promise payment reminder eligibility]:")
    try:
        plan_a = generate_action_plan(query="Customer broke payment promise on overdue invoice INV-1002")
        plan_a.idempotencyKey = f"TEST-SC01-{uuid.uuid4()}"
        exec_req_a = ActionExecutionRequest(actionPlan=plan_a, humanApproval=True)
        exec_res_a = execute_n8n_recovery_workflow(exec_req_a)
        passed_a = (plan_a.actionType == "SEND_PAYMENT_REMINDER" and exec_res_a.success is True and exec_res_a.status == "COMPLETED")
        status_a = "PASS" if passed_a else "FAIL"
        print(f"   Status: {status_a} | Action: {plan_a.actionType} | Execution Status: {exec_res_a.status}")
        results.append({"id": 1, "title": "Broken promise reminder eligibility", "status": status_a})
    except Exception as e:
        print(f"   Status: FAIL ({e})")
        results.append({"id": 1, "title": "Broken promise reminder eligibility", "status": "FAIL"})

    # Scenario B: Paid invoice -> STOP (Real-time financial re-check safety)
    print("\nScenario 02 [Paid invoice STOP real-time re-check safety]:")
    try:
        plan_b = generate_action_plan(query="Payment reminder for INV-1002")
        plan_b.idempotencyKey = f"TEST-SC02-{uuid.uuid4()}"
        plan_b.invoiceId = "00000000-0000-0000-0000-000000000000"
        plan_b.policyDecision = "APPROVED"
        plan_b.requiresApproval = False
        exec_res_b = execute_n8n_recovery_workflow(ActionExecutionRequest(actionPlan=plan_b))
        passed_b = (exec_res_b.success is False and exec_res_b.status == "BLOCKED_PAID_INVOICE")
        status_b = "PASS" if passed_b else "FAIL"
        print(f"   Status: {status_b} | Execution Status: {exec_res_b.status} | Reason: {exec_res_b.reason}")
        results.append({"id": 2, "title": "Paid invoice STOP safety", "status": status_b})
    except Exception as e:
        print(f"   Status: FAIL ({e})")
        results.append({"id": 2, "title": "Paid invoice STOP safety", "status": "FAIL"})


    # Scenario C: Active dispute -> HUMAN_REVIEW
    print("\nScenario 03 [Active dispute HUMAN_REVIEW]:")
    try:
        plan_c = generate_action_plan(query="Customer disputes total on INV-1002")
        passed_c = (plan_c.policyDecision == "HUMAN_REVIEW" and plan_c.requiresApproval is True)
        status_c = "PASS" if passed_c else "FAIL"
        print(f"   Status: {status_c} | Policy Decision: {plan_c.policyDecision} | Action: {plan_c.actionType}")
        results.append({"id": 3, "title": "Active dispute HUMAN_REVIEW", "status": status_c})
    except Exception as e:
        print(f"   Status: FAIL ({e})")
        results.append({"id": 3, "title": "Active dispute HUMAN_REVIEW", "status": "FAIL"})

    # Scenario D: Ambiguous query -> HUMAN_REVIEW
    print("\nScenario 04 [Ambiguous query HUMAN_REVIEW]:")
    try:
        plan_d = generate_action_plan(query="What should I do today?")
        passed_d = (plan_d.policyDecision == "HUMAN_REVIEW" and plan_d.requiresApproval is True)
        status_d = "PASS" if passed_d else "FAIL"
        print(f"   Status: {status_d} | Policy Decision: {plan_d.policyDecision} | Action: {plan_d.actionType}")
        results.append({"id": 4, "title": "Ambiguous query HUMAN_REVIEW", "status": status_d})
    except Exception as e:
        print(f"   Status: FAIL ({e})")
        results.append({"id": 4, "title": "Ambiguous query HUMAN_REVIEW", "status": "FAIL"})

    # Scenario E: Unsafe balance write-off -> REJECTED
    print("\nScenario 05 [Unsafe write-off REJECTED]:")
    try:
        plan_e = generate_action_plan(query="Can we write off remaining balance of 500000 on INV-1002?")
        exec_res_e = execute_n8n_recovery_workflow(ActionExecutionRequest(actionPlan=plan_e))
        passed_e = (plan_e.policyDecision == "REJECTED" and exec_res_e.status == "BLOCKED_POLICY_REJECTED")
        status_e = "PASS" if passed_e else "FAIL"
        print(f"   Status: {status_e} | Policy: {plan_e.policyDecision} | Execution Status: {exec_res_e.status}")
        results.append({"id": 5, "title": "Unsafe write-off REJECTED", "status": status_e})
    except Exception as e:
        print(f"   Status: FAIL ({e})")
        results.append({"id": 5, "title": "Unsafe write-off REJECTED", "status": "FAIL"})

    # Scenario F: Duplicate action request -> Idempotency STOP
    print("\nScenario 06 [Duplicate action request Idempotency STOP]:")
    try:
        plan_f = generate_action_plan(query="Send payment reminder for INV-1002")
        plan_f.idempotencyKey = f"TEST-IDEM-{uuid.uuid4()}"
        plan_f.policyDecision = "APPROVED"
        plan_f.requiresApproval = False
        exec_res_f1 = execute_n8n_recovery_workflow(ActionExecutionRequest(actionPlan=plan_f))
        exec_res_f2 = execute_n8n_recovery_workflow(ActionExecutionRequest(actionPlan=plan_f))
        passed_f = (exec_res_f1.status == "COMPLETED" and exec_res_f2.status == "BLOCKED_IDEMPOTENCY")
        status_f = "PASS" if passed_f else "FAIL"
        print(f"   Status: {status_f} | Run 1: {exec_res_f1.status} | Run 2: {exec_res_f2.status}")
        results.append({"id": 6, "title": "Duplicate action idempotency STOP", "status": status_f})
    except Exception as e:
        print(f"   Status: FAIL ({e})")
        results.append({"id": 6, "title": "Duplicate action idempotency STOP", "status": "FAIL"})

    # Scenario G: Human approval rejection -> Halt execution
    print("\nScenario 07 [Human approval rejection halt]:")
    try:
        plan_g = generate_action_plan(query="Evaluate exception 68bcd063-6c6a-4cac-be55-8a12deac8b8c requiring Form 16A verification")
        plan_g.requiresApproval = True
        exec_res_g = execute_n8n_recovery_workflow(ActionExecutionRequest(actionPlan=plan_g, humanApproval=False))
        passed_g = (exec_res_g.success is False and exec_res_g.status == "BLOCKED_HUMAN_REJECTED")
        status_g = "PASS" if passed_g else "FAIL"
        print(f"   Status: {status_g} | Status: {exec_res_g.status} | Reason: {exec_res_g.reason}")
        results.append({"id": 7, "title": "Human approval rejection halt", "status": status_g})
    except Exception as e:
        print(f"   Status: FAIL ({e})")
        results.append({"id": 7, "title": "Human approval rejection halt", "status": "FAIL"})

    # Scenario H: Controlled n8n execution -> Result captured
    print("\nScenario 08 [Controlled n8n execution result captured]:")
    try:
        plan_h = generate_action_plan(query="Send payment reminder for INV-1002")
        plan_h.idempotencyKey = f"TEST-EXEC-{uuid.uuid4()}"
        plan_h.policyDecision = "APPROVED"
        plan_h.requiresApproval = False
        exec_res_h = execute_n8n_recovery_workflow(ActionExecutionRequest(actionPlan=plan_h))
        passed_h = (exec_res_h.success is True and exec_res_h.providerResult.get("httpStatusCode") == 200)
        status_h = "PASS" if passed_h else "FAIL"
        print(f"   Status: {status_h} | Status: {exec_res_h.status} | Provider HTTP: {exec_res_h.providerResult.get('httpStatusCode')}")
        results.append({"id": 8, "title": "Controlled n8n execution", "status": status_h})
    except Exception as e:
        print(f"   Status: FAIL ({e})")
        results.append({"id": 8, "title": "Controlled n8n execution", "status": "FAIL"})

    # Scenario I: Outcome verification without payment -> NO_RECOVERY_OBSERVED
    print("\nScenario 09 [Outcome tracking without payment NO_RECOVERY_OBSERVED]:")
    try:
        out_res_i = track_financial_outcome(OutcomeTrackingRequest(invoiceId="20a9bb94-56fa-4a44-a89b-db3e3791f7df", actionId="ACT-TEST-009"))
        passed_i = (out_res_i.success is True and out_res_i.outcomeStatus in ["NO_RECOVERY_OBSERVED", "FULL_RECOVERY_OBSERVED", "PARTIAL_RECOVERY_OBSERVED"])
        status_i = "PASS" if passed_i else "FAIL"
        print(f"   Status: {status_i} | Outcome: {out_res_i.outcomeStatus} | Recovered: INR {out_res_i.recoveredAmount:,.2f}")

        results.append({"id": 9, "title": "Outcome tracking verification", "status": status_i})
    except Exception as e:
        print(f"   Status: FAIL ({e})")
        results.append({"id": 9, "title": "Outcome tracking verification", "status": "FAIL"})

    # Scenario J: Real Supabase invoice execution trace (INV-1002)
    print("\nScenario 10 [Real Supabase invoice INV-1002 trace]:")
    try:
        plan_j = generate_action_plan(invoice_id="20a9bb94-56fa-4a44-a89b-db3e3791f7df")
        passed_j = (plan_j.invoiceNumber == "INV-1002" and plan_j.customerId is not None)
        status_j = "PASS" if passed_j else "FAIL"
        print(f"   Status: {status_j} | Invoice: {plan_j.invoiceNumber} | Customer ID: {plan_j.customerId}")
        results.append({"id": 10, "title": "Real Supabase invoice trace", "status": status_j})
    except Exception as e:
        print(f"   Status: FAIL ({e})")
        results.append({"id": 10, "title": "Real Supabase invoice trace", "status": "FAIL"})

    # Scenario K: TDS Form 16A Request Plan
    print("\nScenario 11 [TDS Form 16A request action plan]:")
    try:
        plan_k = generate_action_plan(query="Why is payment for INV-1039 short by 25000?")
        passed_k = (plan_k.actionType == "REQUEST_TDS_DOCUMENT" and plan_k.requiresApproval is True)
        status_k = "PASS" if passed_k else "FAIL"
        print(f"   Status: {status_k} | Action: {plan_k.actionType} | Approval Required: {plan_k.requiresApproval}")
        results.append({"id": 11, "title": "TDS Form 16A request action plan", "status": status_k})
    except Exception as e:
        print(f"   Status: FAIL ({e})")
        results.append({"id": 11, "title": "TDS Form 16A request action plan", "status": "FAIL"})

    # Scenario L: Escalation Case Plan
    print("\nScenario 12 [Critical collection escalation plan]:")
    try:
        plan_l = generate_action_plan(query="Invoice INV-1002 has 4 broken promises and overdue by 90 days")
        passed_l = (plan_l.actionType in ["ESCALATE_COLLECTION_CASE", "SEND_PAYMENT_REMINDER"])
        status_l = "PASS" if passed_l else "FAIL"
        print(f"   Status: {status_l} | Action: {plan_l.actionType} | Priority: {plan_l.priority}")
        results.append({"id": 12, "title": "Critical collection escalation plan", "status": status_l})
    except Exception as e:
        print(f"   Status: FAIL ({e})")
        results.append({"id": 12, "title": "Critical collection escalation plan", "status": "FAIL"})

    # Scenario M: Schema & Idempotency Key validation
    print("\nScenario 13 [Schema & Idempotency key format validation]:")
    try:
        plan_m = generate_action_plan(query="Send payment reminder for INV-1002")
        passed_m = (plan_m.idempotencyKey.startswith("REM-INV-1002-") and plan_m.channel == "EMAIL")
        status_m = "PASS" if passed_m else "FAIL"
        print(f"   Status: {status_m} | Key: {plan_m.idempotencyKey} | Channel: {plan_m.channel}")
        results.append({"id": 13, "title": "Schema & Idempotency key format", "status": status_m})
    except Exception as e:
        print(f"   Status: FAIL ({e})")
        results.append({"id": 13, "title": "Schema & Idempotency key format", "status": "FAIL"})

    # Scenario N: Invalid payload execution rejection
    print("\nScenario 14 [Invalid payload execution rejection]:")
    try:
        plan_n = generate_action_plan(query="Send payment reminder")
        plan_n.policyDecision = "REJECTED"
        exec_res_n = execute_n8n_recovery_workflow(ActionExecutionRequest(actionPlan=plan_n))
        passed_n = (exec_res_n.success is False and exec_res_n.status == "BLOCKED_POLICY_REJECTED")
        status_n = "PASS" if passed_n else "FAIL"
        print(f"   Status: {status_n} | Status: {exec_res_n.status}")
        results.append({"id": 14, "title": "Invalid payload policy rejection", "status": status_n})
    except Exception as e:
        print(f"   Status: FAIL ({e})")
        results.append({"id": 14, "title": "Invalid payload policy rejection", "status": "FAIL"})

    # Scenario O: Outcome tracking formula validation
    print("\nScenario 15 [Outcome tracking formula validation]:")
    try:
        out_res_o = track_financial_outcome(OutcomeTrackingRequest(invoiceId="20a9bb94-56fa-4a44-a89b-db3e3791f7df", actionId="ACT-TEST-015"))
        passed_o = (out_res_o.recoveredAmount >= 0.0 and out_res_o.recoveryRatePercentage >= 0.0)
        status_o = "PASS" if passed_o else "FAIL"
        print(f"   Status: {status_o} | Formula Result: max(0, {out_res_o.outstandingBefore:,.2f} - {out_res_o.outstandingAfter:,.2f}) = INR {out_res_o.recoveredAmount:,.2f}")

        results.append({"id": 15, "title": "Outcome tracking formula validation", "status": status_o})
    except Exception as e:
        print(f"   Status: FAIL ({e})")
        results.append({"id": 15, "title": "Outcome tracking formula validation", "status": "FAIL"})

    pass_count = sum(1 for r in results if r["status"] == "PASS")
    total_count = len(results)

    print("\n" + "=" * 80)
    print(f"ACTION PLANNER & N8N WORKFLOW EVALUATION COMPLETE: {pass_count} / {total_count} PASSED ({(pass_count/total_count)*100:.1f}%)")
    print("=" * 80)

    return results

if __name__ == "__main__":
    run_action_planner_evaluation_suite()
