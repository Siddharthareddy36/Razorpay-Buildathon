from app.models.policy import PolicyInput, PolicyDecision

UNSAFE_ACTION_KEYWORDS = [
    "change invoice amount",
    "modify invoice amount",
    "change payment amount",
    "mark invoice as paid",
    "mark as paid",
    "modify customer financial history",
    "execute transaction",
    "execute payment",
    "write-off amount",
]

def evaluate_receivables_policy(policy_input: PolicyInput) -> PolicyDecision:
    # Precedence 1: Invalid Context / Workflow Error Check
    if policy_input.error or not policy_input.invoice:
        return PolicyDecision(
            decision="HUMAN_REVIEW",
            reason=f"Policy Rule: Context loading or workflow error: {policy_input.error or 'Missing invoice context'}",
            rulesTriggered=["RULE_INVALID_CONTEXT"],
            safeAction=None,
        )

    inv = policy_input.invoice
    sig = policy_input.signals
    agent = policy_input.agent

    if inv.outstandingAmount is None or inv.daysOverdue is None or not inv.status:
        return PolicyDecision(
            decision="HUMAN_REVIEW",
            reason="Policy Rule: Invalid financial context (missing outstanding amount, status, or overdue days).",
            rulesTriggered=["RULE_INVALID_CONTEXT"],
            safeAction=None,
        )

    # Precedence 2: Unsafe Financial Mutation Check
    if agent and agent.recommendedAction:
        action_lower = agent.recommendedAction.lower()
        if any(keyword in action_lower for keyword in UNSAFE_ACTION_KEYWORDS):
            return PolicyDecision(
                decision="REJECTED",
                reason="Policy Rule: Unsafe financial action recommendation detected. Direct mutation of financial ledger or state is strictly forbidden.",
                rulesTriggered=["RULE_UNSAFE_FINANCIAL_MUTATION"],
                safeAction="Reject recommendation; enforce financial state immutability.",
            )

    # Precedence 3: Paid Invoice Check
    if inv.outstandingAmount <= 0 or inv.status.upper() == "PAID":
        return PolicyDecision(
            decision="APPROVED",
            reason="Policy Rule: Paid invoices automatically bypass collection escalation.",
            rulesTriggered=["RULE_PAID_INVOICE"],
            safeAction="No action required",
        )

    # Precedence 4: Active Dispute Check
    if sig.hasDispute:
        return PolicyDecision(
            decision="HUMAN_REVIEW",
            reason="Policy Rule: Active dispute detected; automated collection escalation requires human review.",
            rulesTriggered=["RULE_ACTIVE_DISPUTE"],
            safeAction="Assign to account manager to resolve dispute before initiating collections.",
        )

    # Precedence 5: Payment Exception Check
    if sig.hasOpenException:
        return PolicyDecision(
            decision="HUMAN_REVIEW",
            reason="Policy Rule: Unresolved reconciliation exception detected. Escalation paused for human review.",
            rulesTriggered=["RULE_PAYMENT_EXCEPTION"],
            safeAction="Verify short-pay / TDS reconciliation exception before collection outreach.",
        )

    # Precedence 6: Low Confidence Check
    confidence = agent.confidence if agent else 1.0
    if confidence < 0.60:
        return PolicyDecision(
            decision="HUMAN_REVIEW",
            reason="Policy Rule: Confidence score below 0.60 safety threshold requires human review.",
            rulesTriggered=["RULE_LOW_CONFIDENCE"],
            safeAction="Review context manually before proceeding.",
        )

    # Precedence 7: Default Approved
    action = agent.recommendedAction if agent else "Standard collection follow-up"
    return PolicyDecision(
        decision="APPROVED",
        reason="Policy Rule: Assessment validated against all deterministic financial safety guardrails.",
        rulesTriggered=["RULE_DEFAULT_APPROVED"],
        safeAction=action,
    )
