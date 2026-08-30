# Reconciliation Intelligence Agent — Design & Architecture Specification

## 1. Agent Purpose & Business Question

The **Reconciliation Intelligence Agent** is the third specialist AI agent in the **AI Revenue Recovery & Receivables Intelligence** platform. It answers the fundamental financial question:

> **"Why does the money received differ from what we expected, what evidence explains the difference, and what should the finance operator do next?"**

This agent goes beyond a simple `exception_type → explanation` lookup table. It synthesizes authoritative database facts across invoices, payments, payment allocations, customer profiles, communication logs, and reconciliation exceptions to determine the most defensible explanation from available evidence.

---

## 2. Non-Negotiable Financial Principles

1. **Supabase PostgreSQL is the sole financial source of truth.**
2. **The LLM (Gemini 3.6 Flash) NEVER determines financial truth.** Financial values (`expected_amount`, `received_amount`, `allocated_amount`, `unallocated_amount`, `difference`, allocation ratios) are computed deterministically in Python before LLM reasoning is invoked.
3. **No Database Mutations**: No tables created, altered, dropped, truncated, or re-seeded. Invoices, payments, allocations, and customer records are read-only.
4. **Evidence Priority**: Direct financial records (payments, allocations, invoice amounts, exception records) take precedence over qualitative communication claims. Conversational claims cannot override financial database facts.

---

## 3. Architecture Responsibility Matrix

```
+-----------------------------------------------------------------------------------+
|                               RESPONSIBILITY MATRIX                               |
+--------------------------+--------------------------------------------------------+
| Component                | Scope & Responsibility                                 |
+--------------------------+--------------------------------------------------------+
| Supabase PostgreSQL      | Authoritative financial facts & allocation history.    |
| Python Deterministic     | Math, value comparisons, signal extraction, hypothesis |
|                          | generation & evidence weighting.                       |
| LangGraph                | State orchestration, conditional routing, nodes/edges. |
| Gemini 3.6 Flash         | Reasoning, evidence synthesis, hypothesis ranking, why.|
| Policy Engine            | Deterministic safety guardrails (APPROVED/HUMAN/REJECT)|
| Audit Engine             | Execution logging to agent_runs, decisions, audit_logs.|
+--------------------------+--------------------------------------------------------+
```

---

## 4. Domain & Data Relationship Model

```
Invoice (expected_amount, paid_amount, outstanding_amount, status)
  │
  ├──► Payment (received_amount, payment_date, payment_method, status)
  │      │
  │      └──► Payment Allocations (allocated_amount, allocated_at)
  │             │
  │             ▼
  │      Allocated vs. Unallocated Calculation
  │
  ├──► Reconciliation Exception (expected, received, discrepancy, exception_type)
  │
  ├──► Customer Profile & Transaction History
  │
  └──► Communications (Inbound/Outbound: TDS claims, MDR fees, short pay notices)
```

### Financial Distinctions
- **`INVOICE EXPECTED`**: Original invoice total billed to customer.
- **`PAYMENT RECEIVED`**: Actual gross transaction amount received via bank/gateway.
- **`PAYMENT ALLOCATED`**: Amount explicitly allocated to settle the invoice.
- **`RECONCILIATION DIFFERENCE`**: `expected_amount - received_amount` (or `expected_amount - allocated_amount`).

---

## 5. Strongly Typed State (`ReconciliationAgentState`)

```python
class ReconciliationAgentState(TypedDict, total=False):
    # Identifiers
    business_id: str
    customer_id: str
    invoice_id: str
    payment_id: str
    exception_id: str

    # Invoice Facts
    invoice_number: str
    invoice_amount: float
    invoice_paid_amount: float
    invoice_outstanding_amount: float
    invoice_status: str

    # Payment Facts
    payment_amount: float
    payment_status: str
    payment_method: str
    payment_date: str
    payment_reference: str

    # Allocation Math
    allocated_amount: float
    unallocated_amount: float
    allocation_coverage_ratio: float
    payment_to_invoice_ratio: float

    # Reconciliation Exception Facts
    expected_amount: float
    received_amount: float
    difference: float
    exception_type_db: str
    exception_status_db: str
    db_ai_hypothesis: str
    db_resolution_notes: str

    # Qualitative Signals
    tds_signal: bool
    partial_payment_signal: bool
    mdr_signal: bool
    gst_signal: bool
    refund_signal: bool
    wrong_invoice_signal: bool
    duplicate_payment_signal: bool
    unallocated_payment_signal: bool
    overpayment_signal: bool
    dispute_signal: bool

    # Candidate Hypotheses & Evidence
    candidate_hypotheses: List[Dict[str, Any]]
    ranked_hypotheses: List[str]
    evidence_quality_score: float

    # Customer & Relational Context
    customer_name: str
    customer_risk_score: int
    recent_communications: List[Dict[str, Any]]
    communication_signals: List[str]
    payment_history_context: List[Dict[str, Any]]

    # Gemini Structured Output
    primary_hypothesis: str  # TDS | MDR | GST | PARTIAL_PAYMENT | REFUND | WRONG_INVOICE | DUPLICATE_PAYMENT | UNALLOCATED_PAYMENT | UNKNOWN
    reason: str
    evidence: List[str]
    alternative_hypotheses: List[str]
    recommended_action: str
    confidence: float
    reasoning_mode: str

    # Validation & Policy
    validation_status: str
    validation_errors: List[str]
    policy_decision: str  # APPROVED | HUMAN_REVIEW | REJECTED
    policy_reason: str
    rules_triggered: List[str]
    safe_action: Optional[str]

    # Control & Traceability
    workflow_status: str
    error: Optional[str]
    agent_run_id: Optional[str]
    agent_decision_id: Optional[str]
```

---

## 6. Deterministic Special Case Logic & Hypothesis Candidates

Python pre-computes candidate hypotheses before calling Gemini:

1. **`TDS` (Tax Deducted at Source)**: Difference matches statutory deduction ratio (e.g. 2%, 5%, 10%) or communication confirms Form 16A withholding.
2. **`MDR` (Merchant Discount Rate)**: Difference matches payment gateway fee percentages (e.g. 1.5%–3.0%) on card/gateway transactions.
3. **`GST` (Goods & Services Tax)**: Difference matches GST component mismatch (e.g. 18%).
4. **`PARTIAL_PAYMENT`**: `received_amount < expected_amount` with valid payment allocations and customer acknowledgment of residual balance.
5. **`OVERPAYMENT`**: `received_amount > expected_amount`.
6. **`UNALLOCATED_PAYMENT`**: Payment received but `allocated_amount == 0`.
7. **`WRONG_INVOICE`**: Payment reference indicates a different invoice or account.
8. **`DUPLICATE_PAYMENT`**: Multiple identical receipts found for the same invoice.
9. **`REFUND`**: Transaction includes chargeback/reversal markers.
10. **`UNKNOWN`**: Insufficient evidence. (Never hallucinate certainty).

---

## 7. LangGraph Workflow Architecture

```
  [START]
     │
     ▼
┌─────────────────────────────────┐
│ 1. LOAD_CONTEXT                 │  Fetch Exception, Invoice, Payment, Allocations, Customer, Comms
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ 2. BUILD_RECONCILIATION_SIGNALS │  Extract qualitative markers from payment method & communications
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ 3. COMPARE_FINANCIAL_VALUES     │  Compute expected, received, allocated, unallocated, difference, ratios
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ 4. BUILD_HYPOTHESES             │  Generate & rank candidate hypotheses with evidence weights
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ 5. RECONCILIATION_AGENT         │  Gemini 3.6 Flash structured reasoning & operational recommendation
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ 6. VALIDATE_OUTPUT              │  Pydantic validation of Gemini response
└────────────┬────────────────────┘
             │
      [Validation Status]
      ├── INVALID / FAILED ──► [HUMAN_REVIEW]
      └── VALID ─────────────► [POLICY_CHECK]
                                      │
                                      ▼
                             ┌──────────────────┐
                             │ 7. POLICY_CHECK  │
                             └────────┬─────────┘
                                      │
                                      ▼
                             ┌──────────────────┐
                             │ 8. PERSIST       │ (agent_runs, agent_decisions)
                             └────────┬─────────┘
                                      │
                                      ▼
                             ┌──────────────────┐
                             │ 9. AUDIT         │ (audit_logs)
                             └────────┬─────────┘
                                      │
                                      ▼
                                   [END]
```

---

## 8. Safety Policy Engine Guardrails

1. **`RULE_1_PAID_INVOICE_PROTECTION`**: Invoice status `PAID` or zero outstanding -> `APPROVED` (No action).
2. **`RULE_2_MISSING_FINANCIAL_EVIDENCE`**: Missing key transaction facts -> `HUMAN_REVIEW`.
3. **`RULE_3_UNKNOWN_RECONCILIATION`**: Primary hypothesis `UNKNOWN` -> `HUMAN_REVIEW`.
4. **`RULE_4_ACTIVE_DISPUTE`**: Active dispute or contested invoice -> `HUMAN_REVIEW`.
5. **`RULE_5_DATA_INCONSISTENCY`**: Conflicting transaction allocation evidence -> `HUMAN_REVIEW`.
6. **`RULE_6_LOW_CONFIDENCE`**: Confidence score $< 0.60$ -> `HUMAN_REVIEW`.
7. **`RULE_7_UNSAFE_MUTATION`**: Proposal to write off or alter ledger balances -> `REJECTED`.
8. **`RULE_8_CONFIRMED_RECONCILIATION`**: High evidence quality + verified hypothesis -> `APPROVED` or `HUMAN_REVIEW` (per operational resolution).

---

## 9. API Specification (`POST /agents/reconciliation/run`)

### Request
```json
{
  "exceptionId": "68bcd063-6c6a-4cac-be55-8a12deac8b8c"
}
```

### Response
```json
{
  "success": true,
  "exceptionId": "68bcd063-6c6a-4cac-be55-8a12deac8b8c",
  "invoiceId": "c783e085-fb71-4f83-b4d6-4e8940bb4fb4",
  "paymentId": "ea5c6da0-aa71-49c0-b95a-b99b5d88892f",
  "invoiceNumber": "INV-1039",
  "customerName": "Bharat Tech Solutions",
  "expectedAmount": 600000.0,
  "receivedAmount": 575000.0,
  "difference": 25000.0,
  "allocatedAmount": 575000.0,
  "unallocatedAmount": 0.0,
  "primaryHypothesis": "TDS",
  "reason": "Difference of ₹25,000 corresponds to exactly 4.17% (close to statutory 5% TDS threshold) on invoice INV-1039. Customer communication indicates TDS withholding.",
  "evidence": [
    "Expected ₹6,00,000 vs Received ₹5,75,000 (Difference: ₹25,000).",
    "Customer communication explicitly states ₹25,000 tax withholding under statutory deduction.",
    "Payment method is Bank Transfer with complete payment allocation."
  ],
  "alternativeHypotheses": ["MDR", "PARTIAL_PAYMENT"],
  "recommendedAction": "Request Form 16A TDS withholding certificate from customer finance department to close exception.",
  "confidence": 0.92,
  "policyDecision": "HUMAN_REVIEW",
  "policyReason": "TDS deduction requires verification of Form 16A certificate before closing exception.",
  "rulesTriggered": ["RULE_8_CONFIRMED_RECONCILIATION"],
  "safeAction": "Request Form 16A TDS certificate from customer finance department.",
  "agentRunId": "uuid",
  "agentDecisionId": "uuid"
}
```
