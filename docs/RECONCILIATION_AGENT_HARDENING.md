# Reconciliation Intelligence Agent — Business-Logic Hardening & Evidence-Based Reasoning Specification

This document details the hardening specification for the **Reconciliation Intelligence Agent** (Phase 5.5). The purpose of this phase is to transform candidate hypothesis classification into a genuinely distinguishable, evidence-based financial reasoning engine.

---

## 1. Existing System Audit & Identified Gaps

### Existing Implementation Review
1. **Hypothesis Engine**: Previously relied heavily on database `exception_type` as a direct weight shortcut (+0.50), creating vulnerability to misleading DB labels.
2. **Conflict Detection**: Lacked explicit detection for contradictory evidence (e.g. communication claiming TDS when no payment allocation exists, or DB exception stating partial payment when received > expected).
3. **Evidence Quality Score**: Previously defaulted to static candidate score without explicit weighted formula across data levels.
4. **Human Review Reason Detail**: Lacked structured explanation of **WHY** review is required, **EVIDENCE CONFLICT**, **MISSING EVIDENCE**, and **WHAT HUMAN SHOULD VERIFY**.
5. **Hard Negative Scenarios**: Needed explicit negative test coverage where intuitive hypotheses are contradicted by Level 1 financial math.

---

## 2. Strict 4-Level Evidence Hierarchy

```
+-----------------------------------------------------------------------------------+
|                            EVIDENCE PRIORITY HIERARCHY                            |
+---------+-----------------------------------+-------------------------------------+
| Level   | Category                          | Fields / Elements                   |
+---------+-----------------------------------+-------------------------------------+
| LEVEL 1 | Direct Financial Evidence (High)  | Invoice amount, payment amount,     |
|         |                                   | payment status, payment date,       |
|         |                                   | payment allocations, difference.    |
| LEVEL 2 | Transaction Metadata (Med-High)   | Payment reference, payment method,  |
|         |                                   | gateway transaction status.         |
| LEVEL 3 | Customer History (Medium)         | Historical exceptions, past payment |
|         |                                   | delays, recurring TDS patterns.     |
| LEVEL 4 | Communication Support (Supporting)| Form 16A claims, short pay notices, |
|         |                                   | dispute notes.                      |
+---------+-----------------------------------+-------------------------------------+
```

> **CORE RULE**: Level 4 Communication claims can NEVER override contradictory Level 1 Direct Financial Evidence.

---

## 3. Explicit Deterministic Rules for 9 Outcomes

1. **`TDS`**: `expected > received` AND difference matches statutory withholding ratio (1%–15%) AND payment method is bank transfer/NEFT/RTGS/ACH. Level 4 comms add supporting weight (+20%), but cannot invent a TDS deduction if payment math contradicts it.
2. **`MDR`**: `expected > received` AND payment method is CARD/UPI/PAYMENT_GATEWAY AND difference ratio is 0.5%–3.5%.
3. **`GST`**: Difference matches 18% GST tax rate component mismatch on tax-exclusive line items.
4. **`PARTIAL_PAYMENT`**: `received_amount > 0` AND `received_amount < expected_amount` AND no stronger statutory/fee explanation accounts for the difference.
5. **`REFUND`**: Payment received AND subsequent reversal/chargeback record or reference exists.
6. **`WRONG_INVOICE`**: Payment reference or customer allocation indicates mismatch with target invoice.
7. **`DUPLICATE_PAYMENT`**: Multiple identical payment receipts found for same invoice or `received_amount > expected_amount` with duplicate transaction reference.
8. **`UNALLOCATED_PAYMENT`**: `received_amount > 0` AND `allocated_amount == 0`.
9. **`UNKNOWN`**: Insufficient or contradictory evidence. UNKNOWN is a valid, safe outcome.

---

## 4. Evidence Quality Score Formula (0 to 100)

$$\text{Score} = \text{L1\_Weight} (40) + \text{L2\_Weight} (25) + \text{L3\_Weight} (15) + \text{L4\_Weight} (20) - \text{Conflict\_Penalty} (50)$$

- **Level 1 (Direct Financial Proof)**: +40 points if payment allocation & difference math are verified.
- **Level 2 (Transaction Metadata)**: +25 points if valid payment reference & gateway method match.
- **Level 3 (Customer History)**: +15 points if historical reconciliation pattern matches.
- **Level 4 (Communication Support)**: +20 points if Form 16A / remittance advice exists.
- **Penalty for Data Conflict**: -50 points if contradictory evidence is detected.
- Normalized score range: $0.0 \text{ to } 1.0$.

---

## 5. Explicit Data Conflict Detection

The engine evaluates 4 conflict rules before calling Gemini:
1. **`CONFLICT_COMMUNICATION_NO_PAYMENT`**: Customer claims payment made, but no successful payment record exists.
2. **`CONFLICT_TDS_MATH_MISMATCH`**: Customer claims TDS withholding, but difference ratio is $> 25\%$ or payment method is cash/card.
3. **`CONFLICT_OVERPAYMENT_PARTIAL_DB`**: DB exception states partial payment, but `received_amount > expected_amount`.
4. **`CONFLICT_UNALLOCATED_CLAIM`**: Allocation exists in DB, but exception states unallocated.

When any conflict is detected:
`has_conflict = True` $\rightarrow$ Hypothesis = `UNKNOWN` or candidate with low confidence $\rightarrow$ Policy Decision = `HUMAN_REVIEW`.

---

## 6. Recommendation Safety & Policy Precedence

### Forbidden Mutations (REJECTED)
- "Write off ₹25,000 balance"
- "Change invoice total"
- "Mark invoice fully paid automatically"
- "Delete payment entry"

### Policy Precedence
1. Missing Financial Context $\rightarrow$ `HUMAN_REVIEW`
2. Data Conflict Detected $\rightarrow$ `HUMAN_REVIEW`
3. Unsafe Mutation Proposal $\rightarrow$ `REJECTED`
4. Paid Invoice Protection $\rightarrow$ `APPROVED` (`NO_ACTION`)
5. Active Dispute $\rightarrow$ `HUMAN_REVIEW`
6. Inconclusive Evidence / `UNKNOWN` $\rightarrow$ `HUMAN_REVIEW`
7. Low Confidence Gate ($< 0.60$) $\rightarrow$ `HUMAN_REVIEW`
8. Confirmed Tax/Fee Verification $\rightarrow$ `HUMAN_REVIEW` (to audit certificate) / `APPROVED`
