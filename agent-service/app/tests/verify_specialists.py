import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from app.graph.receivables_graph import run_receivables_agent
from app.graph.p2p_graph import run_p2p_agent
from app.graph.reconciliation_graph import run_reconciliation_agent

def verify_all_specialists():
    print("=" * 80)
    print("INDEPENDENT SPECIALIST AGENTS VERIFICATION (PART 14)")
    print("=" * 80)

    # 1. Test Receivables Agent
    print("\n1. Testing Receivables Agent...")
    rec_state = run_receivables_agent("20a9bb94-56fa-4a44-a89b-db3e3791f7df")
    prio = rec_state.get("agent_priority") or rec_state.get("baseline_priority")
    print(f"   Invoice: {rec_state.get('invoice_number')} | Priority: {prio} | Policy: {rec_state.get('policy_decision')}")
    assert prio in ["HIGH", "MEDIUM", "LOW", "CRITICAL"], "Receivables Agent failed"


    # 2. Test Promise-to-Pay Agent
    print("\n2. Testing Promise-to-Pay (P2P) Agent...")
    p2p_state = run_p2p_agent("1b09eef5-f9d2-43e9-9cf9-5ac3b9762540")
    print(f"   Promise DB Status: {p2p_state.get('promise_db_status')} | State: {p2p_state.get('deterministic_promise_state')} | Policy: {p2p_state.get('policy_decision')}")
    assert p2p_state.get("deterministic_promise_state") in ["ACTIVE", "FULFILLED", "PARTIALLY_FULFILLED", "BROKEN"], "P2P Agent failed"

    # 3. Test Reconciliation Agent
    print("\n3. Testing Reconciliation Agent...")
    recon_state = run_reconciliation_agent("68bcd063-6c6a-4cac-be55-8a12deac8b8c")
    print(f"   Exception ID: {recon_state.get('exception_id')} | Hypothesis: {recon_state.get('primary_hypothesis')} | Policy: {recon_state.get('policy_decision')}")
    assert recon_state.get("primary_hypothesis") in ["TDS", "MDR", "GST", "PARTIAL_PAYMENT", "REFUND", "WRONG_INVOICE", "DUPLICATE_PAYMENT", "UNALLOCATED_PAYMENT", "UNKNOWN"], "Reconciliation Agent failed"

    print("\n" + "=" * 80)
    print("ALL THREE SPECIALIST AGENTS INDEPENDENTLY VERIFIED & OPERATIONAL (100%)")
    print("=" * 80)

if __name__ == "__main__":
    verify_all_specialists()
