# Promise-to-Pay (P2P) Intelligence Agent — Design & Architecture Specification

## 1. Agent Mission & Business Purpose

The **Promise-to-Pay (P2P) Intelligence Agent** answers four fundamental operational questions for financial recovery and collection operations:

> **1. What did the customer promise to pay?**  
> **2. Did they fulfill the promise?**  
> **3. How reliable is this commitment based on their historical behavior?**  
> **4. What specific action should the collections team take next?**

This agent operates as a real agentic workflow. It synthesizes authoritative database facts, computes deterministic fulfillment metrics, evaluates customer commitment reliability, processes communication signals, and leverages Gemini 3.6 Flash for structured reasoning and actionable recommendations—all governed by deterministic policy safety guardrails.

---

## 2. Non-Negotiable Financial Data Principles

1. **Supabase PostgreSQL is the sole authoritative financial source of truth.**
2. **The LLM (Gemini) NEVER determines financial truth.** Financial amounts, dates, allocation math, promise states, and historical reliability scores are computed deterministically in Python before the LLM is invoked.
3. **No Schema Mutations**: No tables are created, altered, dropped, truncated, or re-seeded. The agent operates strictly on existing tables: `customers`, `invoices`, `payments`, `payment_allocations`, `promises`, `communications`, `reconciliation_exceptions`, `agent_runs`, `agent_decisions`, `policy_decisions`, `audit_logs`.
4. **Data Consistency Enforcement**: When database promise status conflicts with deterministic payment allocation evidence, the agent flags a `DATA_CONSISTENCY_WARNING` and routes the case for `HUMAN_REVIEW`.

---

## 3. Architecture Responsibility Matrix

```
+-----------------------------------------------------------------------------------+
|                               RESPONSIBILITY MATRIX                               |
+--------------------------+--------------------------------------------------------+
| Component                | Scope & Responsibility                                 |
+--------------------------+--------------------------------------------------------+
| Supabase PostgreSQL      | Authoritative business facts & financial history.      |
| Python Deterministic     | Math, promise fulfillment, reliability score, timing.   |
| LangGraph                | Orchestration, state transition, conditional routing. |
| Gemini 3.6 Flash         | Reasoning, explanation, evidence, next-step action.   |
| Policy Engine            | Safety guardrails (APPROVED / HUMAN_REVIEW / REJECT).  |
| Audit Engine             | Execution logging to agent_runs, decisions, audit_logs.|
+--------------------------+--------------------------------------------------------+
```

---

## 4. Domain & Data Relationship Model

```
Customer
  │
  ├──► Invoice (amount, paid_amount, due_date, status)
  │      │
  │      ├──► Promise to Pay (promised_amount, promised_date, DB status)
  │      │      │
  │      │      ▼
  │      └──► Payments (payment_date, amount, method, status)
  │             │
  │             └──► Payment Allocations (allocated_amount, allocated_at)
  │                    │
  │                    ▼
  │             Actual Fulfillment Calculation
  │
  ├──► Promise History (All past customer promises -> broken vs. fulfilled ratio)
  └──► Communications (Inbound/Outbound signals: delay requests, extension, dispute)
```

- **Supporting Evidence vs. Financial Truth**: Communication logs provide contextual signals (e.g. extension requests, cash flow issue), but communication text can NEVER override financial database records.

---

## 5. Strongly Typed P2P Agent State (`P2PAgentState`)

```python
class P2PAgentState(TypedDict, total=False):
    # Identifiers
    business_id: str
    customer_id: str
    invoice_id: str
    promise_id: str

    # Invoice Facts
    invoice_number: str
    invoice_amount: float
    invoice_paid_amount: float
    invoice_outstanding_amount: float
    invoice_status: str
    invoice_due_date: str
    days_overdue: int

    # Promise Facts
    promised_amount: float
    promised_date: str
    promise_db_status: str  # ACTIVE / FULFILLED / BROKEN from DB

    # Deterministic Fulfillment Analysis
    fulfilled_amount: float
    remaining_promised_amount: float
    fulfillment_ratio: float
    days_until_promise: int
    days_past_promise: int
    days_to_fulfill: Optional[int]
    has_qualifying_payment_evidence: bool
    payment_occurred_before_promise_date: bool
    deterministic_promise_state: str  # ACTIVE | FULFILLED | PARTIALLY_FULFILLED | BROKEN
    data_consistency_warning: bool

    # Historical Customer Commitment Metrics
    historical_promise_count: int
    historical_fulfilled_count: int
    historical_partial_count: int
    historical_broken_count: int
    historical_cancelled_count: int
    historical_broken_ratio: float
    historical_fulfillment_ratio: float
    historical_average_promised_amount: float
    historical_average_fulfillment_amount: float
    recent_broken_trend: str  # NO_HISTORY | STABLE_FULFILLMENT | IMPROVING | DETERIORATING | REPEATED_BROKEN
    commitment_reliability: str  # HIGH | MEDIUM | LOW | CRITICAL

    # Customer Account Facts
    customer_name: str
    customer_risk_score: int
    customer_average_payment_delay: float
    customer_overdue_invoice_count: int

    # Relational Context
    payment_evidence: List[Dict[str, Any]]
    recent_communications: List[Dict[str, Any]]
    communication_signals: List[str]
    exception_context: List[Dict[str, Any]]

    # Gemini Structured Output
    promise_assessment: str  # RELIABLE | AT_RISK | BROKEN | PARTIALLY_FULFILLED | FULFILLED
    priority_reason: str
    evidence: List[str]
    recommended_action: str
    confidence: float
    reasoning_mode: str

    # Policy & Governance
    policy_decision: str  # APPROVED | HUMAN_REVIEW | REJECTED
    policy_reason: str
    rules_triggered: List[str]

    # Traceability
    agent_run_id: str
    agent_decision_id: str
    workflow_status: str  # COMPLETED | FAILED | HUMAN_REVIEW_REQUIRED
    error: Optional[str]
```

---

## 6. Deterministic Promise Evaluation Rules

### Evaluation Formulas

1. $\text{Fulfilled Amount} = \sum (\text{Allocated Amount for Invoice received after Promise Creation})$
2. $\text{Remaining Amount} = \max(0.0, \text{Promised Amount} - \text{Fulfilled Amount})$
3. $\text{Fulfillment Ratio} = \frac{\text{Fulfilled Amount}}{\text{Promised Amount}}$
4. $\text{Days Until Promise Date} = \text{Promised Date} - \text{Current Date}$
5. $\text{Days Past Promise Date} = \max(0, \text{Current Date} - \text{Promised Date})$

### Deterministic State Logic

```
   [Promised Date > Current Date]
        │
        ├──► Fulfilled Amount >= Promised Amount ──► FULFILLED
        └──► Fulfilled Amount < Promised Amount  ──► ACTIVE

   [Promised Date <= Current Date]
        │
        ├──► Fulfilled Amount >= Promised Amount ──► FULFILLED
        ├──► Fulfilled Amount > 0                ──► PARTIALLY_FULFILLED
        └──► Fulfilled Amount == 0               ──► BROKEN
```

- **Conflict Detection**: If `database_status == 'FULFILLED'` but `fulfilled_amount < promised_amount`, flag `data_consistency_warning = True` and trigger `HUMAN_REVIEW`.

---

## 7. Commitment Reliability Scoring Engine

Customer Commitment Reliability reflects long-term behavior rather than a single promise.

Inputs:
- Historical broken ratio ($\text{Broken Count} / \text{Total History}$)
- Current fulfillment ratio
- Days past promise date
- Repeated broken trend marker

Determined strictly by Python rules:

| Condition / Formula | Commitment Reliability |
|---|---|
| Historical Broken Ratio $\ge 0.50$ OR Repeated Broken Commitments ($\ge 2$ broken) | **CRITICAL** |
| Historical Broken Ratio $\ge 0.25$ OR Days Past Promise $> 3$ with 0 payment | **LOW** |
| Historical Broken Ratio $< 0.25$ AND Days Past Promise $\le 0$ (Active) | **MEDIUM** |
| Historical Broken Ratio $< 0.10$ AND Fulfillment Ratio $\ge 1.0$ | **HIGH** |

> **IMPORTANT**: The agent distinguishes between **Current Promise Status** (e.g. `ACTIVE`) and **Commitment Reliability** (e.g. `LOW` due to 3 broken promises in history).

---

## 8. LangGraph Workflow Architecture

```
  [START]
     │
     ▼
┌───────────────────────────┐
│ 1. LOAD_P2P_CONTEXT       │  Fetch Promise, Invoice, Customer, Payments, Allocations, History, Comms
└────────────┬──────────────┘
             │
             ▼
┌───────────────────────────┐
│ 2. BUILD_SIGNALS          │  Extract communication intent markers (extension request, delay, dispute)
└────────────┬──────────────┘
             │
             ▼
┌───────────────────────────┐
│ 3. EVALUATE_PROMISE_STATE │  Compute deterministic promise state & fulfillment ratio
└────────────┬──────────────┘
             │
             ▼
┌───────────────────────────┐
│ 4. ASSESS_RELIABILITY     │  Calculate customer commitment history & reliability score (HIGH..CRITICAL)
└────────────┬──────────────┘
             │
             ▼
┌───────────────────────────┐
│ 5. P2P_AGENT_REASONING    │  Gemini 3.6 Flash structured explanation & recommended action
└────────────┬──────────────┘
             │
             ▼
┌───────────────────────────┐
│ 6. VALIDATE_OUTPUT        │  Pydantic validation of Gemini response
└────────────┬──────────────┘
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

## 9. Gemini Structured Output Contract

Gemini receives normalized facts and produces structured JSON matching this schema:

```json
{
  "promiseAssessment": "RELIABLE | AT_RISK | BROKEN | PARTIALLY_FULFILLED | FULFILLED",
  "reason": "Clear 1-2 sentence operational explanation based on evidence.",
  "evidence": [
    "Fact 1 (e.g., Promised ₹5,00,000 on 2026-08-25)",
    "Fact 2 (e.g., Customer has 2 historical broken promises out of 3)",
    "Fact 3 (e.g., Payment allocation shows ₹0 received to date)"
  ],
  "recommendedAction": "Actionable collections step (e.g., Issue formal notice and initiate call)",
  "confidence": 0.92
}
```

---

## 10. Policy Engine Guardrails

Deterministic rules executed in `POLICY_CHECK`:

1. **Rule 1 (Paid Invoice)**: If invoice status is `PAID` or outstanding is 0, block collection escalation -> `APPROVED` (No collection action required).
2. **Rule 2 (Active Promise + Verified Payment)**: If promise is active and full payment allocation is verified, suppress escalation -> `APPROVED`.
3. **Rule 3 (Disputed Invoice)**: If invoice has active dispute or reconciliation exception, require human intervention -> `HUMAN_REVIEW`.
4. **Rule 4 (Claimed Fulfillment without Payment Evidence)**: If database status is `FULFILLED` but zero allocation evidence exists -> `HUMAN_REVIEW`.
5. **Rule 5 (Data Consistency Warning)**: Any mismatch between DB status and deterministic evidence -> `HUMAN_REVIEW`.
6. **Rule 6 (Low LLM Confidence)**: If Gemini confidence $< 0.60$ -> `HUMAN_REVIEW`.
7. **Rule 7 (Unsafe Financial Mutation)**: AI output proposing balance alterations -> `REJECTED`.
8. **Rule 8 (Broken Promise with History)**: Broken promise with history of broken commitments -> Escalation `APPROVED`.

---

## 11. API Specification (`POST /agents/promises/run`)

### Request
```json
{
  "promiseId": "1b09eef5-f9d2-43e9-9cf9-5ac3b9762540"
}
```

### Response
```json
{
  "success": true,
  "promiseId": "1b09eef5-f9d2-43e9-9cf9-5ac3b9762540",
  "invoiceId": "20a9bb94-56fa-4a44-a89b-db3e3791f7df",
  "customerId": "20000000-0000-4000-8000-000000000002",
  "invoiceNumber": "INV-1002",
  "customerName": "Acme Corp",
  "promisedAmount": 500000.0,
  "promisedDate": "2026-08-29",
  "deterministicPromiseState": "ACTIVE",
  "commitmentReliability": "LOW",
  "promiseAssessment": "AT_RISK",
  "reason": "Customer promise date passed yesterday with zero payment received. Account history shows 2 previous broken commitments.",
  "evidence": [
    "Promised ₹5,00,000 on 2026-08-29 (1 day past promised date).",
    "Customer has 2 broken promises out of 3 historical promises (66.7% broken ratio).",
    "Zero qualifying payment allocations found for invoice INV-1002."
  ],
  "recommendedAction": "Escalate to outbound telephone collections and request immediate bank payment reference.",
  "confidence": 0.94,
  "policyDecision": "APPROVED",
  "policyReason": "Policy approved outbound telephone escalation for broken promise with history of defaults.",
  "rulesTriggered": ["RULE_8_BROKEN_PROMISE_ESCALATION_APPROVED"],
  "agentRunId": "uuid",
  "agentDecisionId": "uuid"
}
```
