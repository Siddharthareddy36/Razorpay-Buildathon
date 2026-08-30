from typing import Dict, Any, List, Tuple, Optional


def check_cross_agent_conflicts(specialist_results: Dict[str, Any]) -> Tuple[bool, Optional[str]]:
    """
    Detects contradictory outcomes between specialist agents (Part 9).
    """
    rec = specialist_results.get("receivables") or {}
    p2p = specialist_results.get("p2p") or {}
    recon = specialist_results.get("reconciliation") or {}

    rec_priority = str(rec.get("agent_priority") or rec.get("baseline_priority") or "").upper()
    p2p_state = str(p2p.get("deterministic_promise_state") or p2p.get("promise_assessment") or "").upper()
    recon_hyp = str(recon.get("primary_hypothesis") or "").upper()
    recon_policy = str(recon.get("policy_decision") or "").upper()

    conflicts: List[str] = []

    # Conflict 1: High collection urgency vs verified payment/fulfilled promise
    if rec_priority == "HIGH" and p2p_state in ["FULFILLED", "ACTIVE_VERIFIED"]:
        conflicts.append("Receivables Agent flags HIGH collection priority, but P2P Agent confirms an ACTIVE or FULFILLED payment promise.")

    # Conflict 2: Outbound telephone escalation vs active dispute in reconciliation
    if rec_priority == "HIGH" and recon_hyp == "UNKNOWN" and recon_policy == "HUMAN_REVIEW":
        conflicts.append("Receivables Agent recommends collections escalation, but Reconciliation Agent identified an unresolved financial discrepancy requiring human review.")

    # Conflict 3: P2P states broken promise, but payment allocation settled invoice
    if p2p_state == "BROKEN" and rec.get("invoice_status") == "PAID":
        conflicts.append("P2P Agent reports BROKEN promise status, but Receivables database shows invoice is fully PAID.")

    if conflicts:
        return True, conflicts[0]

    return False, None


def synthesize_cross_agent_results(
    query: str,
    intent: str,
    entities: Dict[str, Any],
    specialist_results: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Synthesizes findings across invoked specialist agents (Part 8).
    """
    rec = specialist_results.get("receivables") or {}
    p2p = specialist_results.get("p2p") or {}
    recon = specialist_results.get("reconciliation") or {}

    cross_domain_findings: List[str] = []
    insights: List[Dict[str, Any]] = []

    # Extract Receivables Insight
    if rec:
        prio = rec.get("agent_priority") or rec.get("baseline_priority") or "MEDIUM"
        inv_num = rec.get("invoice_number") or entities.get("invoice_number") or "Invoice"
        rec_headline = f"Receivables Agent assessed {inv_num} as {prio} priority."
        insights.append({
            "agent": "RECEIVABLES",
            "status": prio,
            "headline": rec_headline,
            "details": {
                "outstandingAmount": rec.get("outstanding_amount", 0.0),
                "daysOverdue": rec.get("days_overdue", 0),
                "recommendedAction": rec.get("recommended_action") or rec.get("safe_action"),
            }
        })
        cross_domain_findings.append(f"Receivables Agent: Assigned {prio} collection priority based on outstanding exposure and payment history.")

    # Extract P2P Insight
    if p2p:
        p2p_st = p2p.get("deterministic_promise_state") or p2p.get("promise_assessment") or "ACTIVE"
        rel = p2p.get("commitment_reliability") or "MEDIUM"
        p2p_headline = f"P2P Agent assessed promise status as {p2p_st} with {rel} commitment reliability."
        insights.append({
            "agent": "P2P",
            "status": p2p_st,
            "headline": p2p_headline,
            "details": {
                "promisedAmount": p2p.get("promised_amount", 0.0),
                "promisedDate": p2p.get("promised_date", "-"),
                "commitmentReliability": rel,
                "recommendedAction": p2p.get("recommended_action") or p2p.get("safe_action"),
            }
        })
        cross_domain_findings.append(f"Promise-to-Pay Agent: Promise is {p2p_st} with {rel} historical commitment reliability.")

    # Extract Reconciliation Insight
    if recon:
        hyp = recon.get("primary_hypothesis") or "UNKNOWN"
        diff = recon.get("difference", 0.0)
        recon_headline = f"Reconciliation Agent identified primary discrepancy hypothesis as {hyp} (Discrepancy: INR {abs(diff):,.2f})."
        insights.append({
            "agent": "RECONCILIATION",
            "status": hyp,
            "headline": recon_headline,
            "details": {
                "expectedAmount": recon.get("expected_amount", 0.0),
                "receivedAmount": recon.get("received_amount", 0.0),
                "difference": diff,
                "recommendedAction": recon.get("recommended_action") or recon.get("safe_action"),
            }
        })
        cross_domain_findings.append(f"Reconciliation Agent: Discrepancy classified as {hyp} based on Level 1-4 evidence hierarchy.")

    # Build Executive Summary
    inv_label = entities.get("invoice_number") or "target account"
    cust_label = entities.get("customer_name") or rec.get("customer_name") or "customer"

    if intent == "CROSS_DOMAIN_INVESTIGATION":
        exec_summary = (
            f"Cross-Domain Investigation for {inv_label} ({cust_label}): "
            f"Receivables Agent assigned {rec.get('agent_priority') or 'MEDIUM'} collection priority. "
            f"P2P Agent reports promise status as {p2p.get('deterministic_promise_state') or 'N/A'}. "
            f"Reconciliation Agent identified discrepancy hypothesis as {recon.get('primary_hypothesis') or 'N/A'}."
        )
        rec_action = (
            p2p.get("recommended_action")
            or rec.get("recommended_action")
            or recon.get("recommended_action")
            or "Review cross-domain investigation case and execute recommended specialist operator follow-up."
        )

    elif intent == "PROMISE":
        exec_summary = f"Promise Assessment for {cust_label}: Status is {p2p.get('deterministic_promise_state')} with {p2p.get('commitment_reliability')} commitment reliability."
        rec_action = p2p.get("recommended_action") or "Follow up on payment commitment."
    elif intent == "RECONCILIATION":
        exec_summary = f"Reconciliation Discrepancy Assessment for {inv_label}: Primary hypothesis is {recon.get('primary_hypothesis')}."
        rec_action = recon.get("recommended_action") or "Audit tax/fee documentation."
    else:
        exec_summary = f"Receivables Priority Assessment for {inv_label}: Priority is {rec.get('agent_priority') or 'MEDIUM'}."
        rec_action = rec.get("recommended_action") or "Contact customer regarding overdue invoice."

    has_conflict, conflict_summary = check_cross_agent_conflicts(specialist_results)

    return {
        "final_summary": exec_summary,
        "cross_domain_findings": cross_domain_findings,
        "agent_insights": insights,
        "final_recommendation": rec_action,
        "has_cross_agent_conflict": has_conflict,
        "conflict_summary": conflict_summary,
    }
