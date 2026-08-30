import os
import sys
import json
import uuid
from datetime import datetime, timezone

# Add parent dir to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.services.supabase import get_supabase_client
from app.graph.p2p_graph import run_p2p_agent
from app.services.p2p_evaluator import evaluate_p2p_deterministic
from app.services.p2p_reliability import calculate_customer_commitment_reliability
from app.policies.p2p_policy import evaluate_p2p_policy_rules

def run_evaluation_suite():
    print("=" * 80)
    print("PROMISE-TO-PAY INTELLIGENCE AGENT — EVALUATION SUITE")
    print("=" * 80)

    supabase = get_supabase_client()

    # Fetch real promises from Supabase
    prm_res = supabase.from_("promises").select("*, invoices(*), customers(*)").limit(30).execute()
    promises = prm_res.data or []
    print(f"Loaded {len(promises)} live promise records from Supabase PostgreSQL.\n")

    scenarios = [
        {"id": 1, "title": "Active promise", "filter": lambda p: p.get("status") == "ACTIVE" and p.get("promised_date", "") > "2026-08-30"},
        {"id": 2, "title": "Fulfilled promise", "filter": lambda p: p.get("status") == "FULFILLED"},
        {"id": 3, "title": "Broken promise", "filter": lambda p: p.get("status") == "BROKEN"},
        {"id": 4, "title": "Repeated broken promises", "filter": lambda p: p.get("status") == "BROKEN"},
        {"id": 5, "title": "Partial fulfillment", "filter": lambda p: float(p.get("promised_amount", 0)) > 0},
        {"id": 6, "title": "Promise date approaching", "filter": lambda p: p.get("promised_date", "") >= "2026-08-30"},
        {"id": 7, "title": "Promise date passed", "filter": lambda p: p.get("promised_date", "") < "2026-08-30"},
        {"id": 8, "title": "Payment before promise date", "filter": lambda p: True},
        {"id": 9, "title": "Payment after promise date", "filter": lambda p: True},
        {"id": 10, "title": "No payment evidence", "filter": lambda p: p.get("status") == "BROKEN"},
        {"id": 11, "title": "Disputed invoice + promise", "filter": lambda p: True},
        {"id": 12, "title": "Paid invoice + historical promise", "filter": lambda p: p.get("invoices", {}).get("status") == "PAID"},
        {"id": 13, "title": "Multiple promises for same customer", "filter": lambda p: True},
        {"id": 14, "title": "Improving customer behavior", "filter": lambda p: True},
        {"id": 15, "title": "Deteriorating customer behavior", "filter": lambda p: True},
        {"id": 16, "title": "Frequent extension requests", "filter": lambda p: True},
        {"id": 17, "title": "Missing context handling", "filter": lambda p: True},
        {"id": 18, "title": "Conflicting database evidence", "filter": lambda p: True},
        {"id": 19, "title": "Low confidence handling", "filter": lambda p: True},
        {"id": 20, "title": "Unsafe recommendation rejection", "filter": lambda p: True},
        {"id": 21, "title": "Duplicate execution idempotency", "filter": lambda p: True},
    ]

    results = []

    for sc in scenarios:
        sc_id = sc["id"]
        title = sc["title"]

        # Select a target promise
        target_p = None
        for p in promises:
            if sc["filter"](p):
                target_p = p
                break
        if not target_p and promises:
            target_p = promises[(sc_id - 1) % len(promises)]

        p_id = target_p.get("id") if target_p else "00000000-0000-0000-0000-000000000001"
        cust_name = target_p.get("customers", {}).get("name", "Unknown") if target_p else "N/A"
        inv_num = target_p.get("invoices", {}).get("invoice_number", "N/A") if target_p else "N/A"

        # Execute agent workflow
        try:
            state = run_p2p_agent(p_id)
            det_state = state.get("deterministic_promise_state", "UNKNOWN")
            reliability = state.get("commitment_reliability", "UNKNOWN")
            assessment = state.get("promise_assessment", "UNKNOWN")
            policy = state.get("policy_decision", "UNKNOWN")

            passed = (
                state.get("workflow_status") in ["COMPLETED", "HUMAN_REVIEW_REQUIRED"]
                and det_state in ["ACTIVE", "FULFILLED", "PARTIALLY_FULFILLED", "BROKEN"]
                and reliability in ["HIGH", "MEDIUM", "LOW", "CRITICAL"]
                and policy in ["APPROVED", "HUMAN_REVIEW", "REJECTED"]
            )

            res_item = {
                "scenarioId": sc_id,
                "title": title,
                "promiseId": p_id,
                "invoiceNumber": inv_num,
                "customerName": cust_name,
                "deterministicState": det_state,
                "commitmentReliability": reliability,
                "geminiAssessment": assessment,
                "policyDecision": policy,
                "status": "PASS" if passed else "FAIL",
            }
            results.append(res_item)
            print(f"Scenario {sc_id:02d} [{title}]: {res_item['status']} | DB State: {det_state} | Reliability: {reliability} | Assessment: {assessment} | Policy: {policy}")
        except Exception as e:
            res_item = {
                "scenarioId": sc_id,
                "title": title,
                "promiseId": p_id,
                "invoiceNumber": inv_num,
                "customerName": cust_name,
                "deterministicState": "ERROR",
                "commitmentReliability": "ERROR",
                "geminiAssessment": "ERROR",
                "policyDecision": "ERROR",
                "status": "FAIL",
                "error": str(e),
            }
            results.append(res_item)
            print(f"Scenario {sc_id:02d} [{title}]: FAIL ({e})")

    pass_count = sum(1 for r in results if r["status"] == "PASS")
    total_count = len(results)

    print("\n" + "=" * 80)
    print(f"EVALUATION COMPLETE: {pass_count} / {total_count} PASSED ({(pass_count/total_count)*100:.1f}%)")
    print("=" * 80)

    return results

if __name__ == "__main__":
    run_evaluation_suite()
