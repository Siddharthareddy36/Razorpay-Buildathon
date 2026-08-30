# Receivables Intelligence Policy Engine Specification

## 1. Overview & Purpose

The **Receivables Intelligence Policy Engine** is a pure, deterministic safety layer. It evaluates AI recommendations against business safety rules to guarantee that no unsafe action, illegal financial mutation, or inappropriate collection escalation is ever executed.

Policy decision outcomes:
- **`APPROVED`**: Recommendation passes all safety checks and is approved for execution.
- **`REJECTED`**: Recommendation attempts an unsafe financial mutation or violates core business rules.
- **`HUMAN_REVIEW`**: Active customer dispute, unresolved exception, low confidence, or workflow error requires human intervention.

---

## 2. Deterministic Precedence & Safety Rules

| Precedence | Policy Rule | Trigger Condition | Outcome | Safe Action Override |
|:---|:---|:---|:---|:---|
| **1 (Highest)** | `RULE_INVALID_CONTEXT` | Missing invoice or workflow failure | `HUMAN_REVIEW` | None |
| **2** | `RULE_UNSAFE_FINANCIAL_MUTATION` | Action contains unsafe ledger mutation keywords | `REJECTED` | Reject recommendation |
| **3** | `RULE_PAID_INVOICE` | `outstandingAmount <= 0` or status `PAID` | `APPROVED` | `"No action required"` |
| **4** | `RULE_ACTIVE_DISPUTE` | `hasDispute == True` | `HUMAN_REVIEW` | `"Assign to account manager to resolve dispute before initiating collections."` |
| **5** | `RULE_PAYMENT_EXCEPTION` | `hasOpenException == True` | `HUMAN_REVIEW` | `"Verify short-pay / TDS reconciliation exception before collection outreach."` |
| **6** | `RULE_LOW_CONFIDENCE` | `confidence < 0.60` | `HUMAN_REVIEW` | `"Review context manually before proceeding."` |
| **7 (Default)** | `RULE_DEFAULT_APPROVED` | All checks pass | `APPROVED` | Original recommended action |

---

## 3. Test Data Examples

### EXAMPLE A: Standard Overdue Invoice (Approved)
- **Context**: ₹60K outstanding, 54 days overdue, no dispute, confidence 0.92
- **Recommendation**: `"Escalate to senior credit manager for direct outreach"`
- **Expected Outcome**: `decision: APPROVED`, `rulesTriggered: ["RULE_DEFAULT_APPROVED"]`

### EXAMPLE B: Active Customer Dispute (Human Review)
- **Context**: ₹60K outstanding, 54 days overdue, active inbound dispute message
- **Recommendation**: `"Immediate aggressive collection call"`
- **Expected Outcome**: `decision: HUMAN_REVIEW`, `rulesTriggered: ["RULE_ACTIVE_DISPUTE"]`, `safeAction: "Assign to account manager to resolve dispute before initiating collections."`

### EXAMPLE C: Paid Invoice (Approved + Forced Safe Action)
- **Context**: ₹0 outstanding, status `PAID`
- **Recommendation**: `"Send payment collection reminder"`
- **Expected Outcome**: `decision: APPROVED`, `rulesTriggered: ["RULE_PAID_INVOICE"]`, `safeAction: "No action required"`

### EXAMPLE D: Low Confidence Model Output (Human Review)
- **Context**: Confidence = `0.35`
- **Recommendation**: `"Send formal legal notice"`
- **Expected Outcome**: `decision: HUMAN_REVIEW`, `rulesTriggered: ["RULE_LOW_CONFIDENCE"]`

### EXAMPLE E: Unsafe Financial Mutation (Rejected)
- **Context**: Outstanding ₹50K
- **Recommendation**: `"Change invoice amount to ₹40K"`
- **Expected Outcome**: `decision: REJECTED`, `rulesTriggered: ["RULE_UNSAFE_FINANCIAL_MUTATION"]`
