import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.graph.supervisor_graph import run_supervisor_agent

def run_supervisor_evaluation_suite():
    print("=" * 80)
    print("MULTI-AGENT SUPERVISOR — PHASE 6.1 HARDENED EVALUATION SUITE (25 SCENARIOS)")
    print("=" * 80)

    scenarios = [
        # Single Specialist Routing
        {"id": 1, "title": "Receivables-only question", "query": "Which invoices need immediate collection focus?", "expected_intent": "RECEIVABLES", "expected_agents": ["RECEIVABLES"]},
        {"id": 2, "title": "P2P-only question", "query": "What did customer BlueOrbit Commerce promise to pay?", "expected_intent": "PROMISE", "expected_agents": ["P2P"]},
        # Case 3: Reconciliation exception UUID + Form 16A
        {"id": 3, "title": "Reconciliation-only exception", "query": "Evaluate exception 68bcd063-6c6a-4cac-be55-8a12deac8b8c requiring Form 16A verification", "expected_intent": "RECONCILIATION", "expected_agents": ["RECONCILIATION"]},
        {"id": 4, "title": "Customer risk question", "query": "What is the customer credit risk profile for BlueOrbit Commerce?", "expected_intent": "CUSTOMER_ANALYSIS", "expected_agents": ["RECEIVABLES", "P2P"]},
        {"id": 5, "title": "Portfolio summary", "query": "Provide total overdue portfolio summary and overall exposure.", "expected_intent": "PORTFOLIO_SUMMARY", "expected_agents": ["RECEIVABLES"]},

        # Multi-Domain & Cross-Domain Investigations
        {"id": 6, "title": "Invoice cross-domain question", "query": "Why is INV-1002 still outstanding?", "expected_intent": "CROSS_DOMAIN_INVESTIGATION", "expected_agents": ["RECEIVABLES", "P2P", "RECONCILIATION"]},
        {"id": 7, "title": "Customer cross-domain question", "query": "Full status investigation for BlueOrbit Commerce account.", "expected_intent": "CROSS_DOMAIN_INVESTIGATION", "expected_agents": ["RECEIVABLES", "P2P"]},
        {"id": 8, "title": "Broken promise + overdue invoice", "query": "Customer has broken payment promise on overdue invoice INV-1002. What should we do?", "expected_intent": "CROSS_DOMAIN_INVESTIGATION", "expected_agents": ["RECEIVABLES", "P2P", "RECONCILIATION"]},
        {"id": 9, "title": "Overdue invoice + reconciliation exception", "query": "Why is INV-1039 overdue with open TDS exception?", "expected_intent": "CROSS_DOMAIN_INVESTIGATION", "expected_agents": ["RECEIVABLES", "P2P", "RECONCILIATION"]},
        {"id": 10, "title": "Payment mismatch + promise context", "query": "Why does payment differ from expected amount on INV-1002 promise date?", "expected_intent": "CROSS_DOMAIN_INVESTIGATION", "expected_agents": ["RECEIVABLES", "P2P", "RECONCILIATION"]},
        {"id": 11, "title": "All three specialists required", "query": "Full cross-domain status report for INV-1002 requiring Receivables, P2P and Reconciliation.", "expected_intent": "CROSS_DOMAIN_INVESTIGATION", "expected_agents": ["RECEIVABLES", "P2P", "RECONCILIATION"]},
        # Case 5: Receivables HIGH vs customer claims payment made
        {"id": 12, "title": "Conflicting outputs cross-domain", "query": "Receivables says HIGH but customer claims payment was made. Resolve the conflict.", "expected_intent": "CROSS_DOMAIN_INVESTIGATION", "expected_agents": ["RECEIVABLES", "P2P"]},

        # Case 1 & NOT_FOUND Safety Tests (Non-existent entities MUST return NOT_FOUND, success=False)
        {"id": 13, "title": "Missing invoice NOT_FOUND safety", "query": "Show status for invoice 999999", "expected_intent": "NOT_FOUND", "expected_agents": []},
        {"id": 14, "title": "Missing customer NOT_FOUND safety", "query": "Show status for customer CUST-999999", "expected_intent": "NOT_FOUND", "expected_agents": []},
        {"id": 15, "title": "Missing promise NOT_FOUND safety", "query": "Check promise PROMISE-999999 for INV-999999", "expected_intent": "NOT_FOUND", "expected_agents": []},
        {"id": 16, "title": "Missing payment NOT_FOUND safety", "query": "Check payment PMT-999999 for invoice 999999", "expected_intent": "NOT_FOUND", "expected_agents": []},
        {"id": 17, "title": "Missing exception NOT_FOUND safety", "query": "Evaluate exception 00000000-0000-0000-0000-000000000000", "expected_intent": "NOT_FOUND", "expected_agents": []},

        # Case 2 & Ambiguous Clarification Tests
        {"id": 18, "title": "Vague question clarification safety", "query": "What should I do today?", "expected_intent": "UNKNOWN", "expected_agents": []},
        {"id": 19, "title": "Ambiguous question clarification safety", "query": "Tell me what to do", "expected_intent": "UNKNOWN", "expected_agents": []},

        # Case 4: Multi-domain Risk Score + TDS Check
        {"id": 20, "title": "Multi-domain risk + TDS request", "query": "Calculate exact risk score and check TDS withholding for INV-1002", "expected_intent": "CROSS_DOMAIN_INVESTIGATION", "expected_agents": ["RECEIVABLES", "RECONCILIATION"]},

        # Context & Policy Guardrails
        {"id": 21, "title": "Explicit entity override context", "query": "Context is INV-1013, what about INV-1002?", "expected_intent": "CROSS_DOMAIN_INVESTIGATION", "expected_agents": ["RECEIVABLES", "P2P", "RECONCILIATION"]},
        {"id": 22, "title": "Unsafe write-off policy rejection", "query": "Can we write off remaining balance of 500000 on INV-1002?", "expected_intent": "CROSS_DOMAIN_INVESTIGATION", "expected_policy": "REJECTED"},
        {"id": 23, "title": "HUMAN_REVIEW policy preservation", "query": "Evaluate exception 68bcd063-6c6a-4cac-be55-8a12deac8b8c requiring Form 16A verification", "expected_policy": "HUMAN_REVIEW"},
        {"id": 24, "title": "Idempotent duplicate execution", "query": "Why is INV-1002 still outstanding?", "expected_intent": "CROSS_DOMAIN_INVESTIGATION"},
        {"id": 25, "title": "Deterministic fallback execution", "query": "Provide priority assessment for INV-1002", "expected_intent": "RECEIVABLES"},
    ]

    results = []

    for sc in scenarios:
        sc_id = sc["id"]
        title = sc["title"]
        query = sc["query"]

        try:
            state = run_supervisor_agent(query)
            actual_intent = state.get("detected_intent", "UNKNOWN")
            actual_agents = state.get("selected_agents") or []
            policy = state.get("policy_decision", "UNKNOWN")
            has_conflict = state.get("has_cross_agent_conflict", False)

            # Semantic business correctness validation:
            passed = True

            # 1. NOT_FOUND safety validation
            if sc.get("expected_intent") == "NOT_FOUND":
                if actual_intent != "NOT_FOUND" or len(actual_agents) != 0 or state.get("workflow_status") != "NOT_FOUND":
                    passed = False

            # 2. Vague query clarification safety validation
            elif sc.get("expected_intent") == "UNKNOWN":
                if actual_intent != "UNKNOWN" or len(actual_agents) != 0 or not state.get("clarification_prompt"):
                    passed = False

            # 3. Expected intent validation
            elif "expected_intent" in sc and actual_intent != sc["expected_intent"]:
                passed = False

            # 4. Expected agents validation
            if passed and "expected_agents" in sc:
                if set(actual_agents) != set(sc["expected_agents"]):
                    passed = False

            # 5. Expected policy validation
            if passed and "expected_policy" in sc:
                if policy != sc["expected_policy"]:
                    passed = False

            res_item = {
                "scenarioId": sc_id,
                "title": title,
                "query": query,
                "expectedIntent": sc.get("expected_intent"),
                "actualIntent": actual_intent,
                "selectedAgents": actual_agents,
                "hasConflict": has_conflict,
                "policyDecision": policy,
                "status": "PASS" if passed else "FAIL",
            }
            results.append(res_item)
            print(f"Scenario {sc_id:02d} [{title}]: {res_item['status']} | Intent: {actual_intent} | Agents: {actual_agents} | Conflict: {has_conflict} | Policy: {policy}")
        except Exception as e:
            res_item = {
                "scenarioId": sc_id,
                "title": title,
                "query": query,
                "status": "FAIL",
                "error": str(e),
            }
            results.append(res_item)
            print(f"Scenario {sc_id:02d} [{title}]: FAIL ({e})")

    pass_count = sum(1 for r in results if r["status"] == "PASS")
    total_count = len(results)

    print("\n" + "=" * 80)
    print(f"HARDENED SUPERVISOR EVALUATION COMPLETE: {pass_count} / {total_count} PASSED ({(pass_count/total_count)*100:.1f}%)")
    print("=" * 80)

    return results

if __name__ == "__main__":
    run_supervisor_evaluation_suite()
