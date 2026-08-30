# Receivables Intelligence Agent — Architecture & Design Specification

## 1. Agent Purpose
The **Receivables Intelligence Agent** evaluates an individual invoice within its broader customer account context to determine whether and why it requires immediate collection attention. Rather than relying solely on simple balance sorting, the agent synthesizes financial facts, payment history, commitment performance, and communication signals into an actionable priority assessment and operational recommendation.

---

## 2. Inputs & Context Data
The agent operates strictly on verified database facts loaded from Supabase:
- **Invoice Facts**: `amount`, `paid_amount`, `outstanding_amount`, `due_date`, `days_overdue`, `status`.
- **Customer Profile**: `name`, `credit_limit`, `average_payment_delay_days`, `total_invoices`, `total_overdue_invoices`, `total_promises`, `total_broken_promises`.
- **Payment History**: Linked payments, payment allocations, payment methods.
- **Promise History**: Active, fulfilled, and broken promises-to-pay.
- **Recent Communications**: Inbound and outbound message logs, intent markers.
- **Reconciliation Exceptions**: Short-pay discrepancies, TDS withholdings, dispute markers.

---

## 3. Separation of Responsibilities

```
+-----------------------------------------------------------------------------------+
|                                 RESPONSIBILITY MATRIX                             |
+--------------------------+--------------------------------------------------------+
| Component                | Role & Scope                                           |
+--------------------------+--------------------------------------------------------+
| Supabase PostgreSQL      | Ground truth for financial amounts, statuses, history. |
| Deterministic TypeScript | Hard calculations (days overdue, baseline priority).   |
| LLM (Gemini / OpenAI)    | Reasoning, evidence synthesis, natural language why.   |
| LangGraph                | State machine workflow orchestration.                  |
| Policy Engine            | Hard deterministic safety guardrails & approval gate.  |
| Audit Log                | Immutable execution traceability.                     |
+--------------------------+--------------------------------------------------------+
```

> **CRITICAL RULE**: The LLM NEVER determines financial amounts, invoice statuses, or database states.

---

## 4. LangGraph Workflow Architecture

### Graph Nodes & Edges
```
  [START]
     │
     ▼
┌─────────────────────────┐
│ 1. LOAD_CONTEXT         │  Fetch invoice, customer, payments, promises, comms, exceptions
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 2. BUILD_SIGNALS        │  Calculate deterministic baseline score & risk indicators
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 3. RECEIVABLES_AGENT    │  LLM reasoning for priority rating, evidence & action
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 4. POLICY_CHECK         │  Deterministic safety checks (APPROVED / REJECTED / HUMAN_REVIEW)
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 5. SAVE_DECISION        │  Persist run to agent_runs & agent_decisions
└──────────┬──────────────┘
           │
           ▼
┌─────────────────────────┐
│ 6. AUDIT                │  Record execution event to audit_logs
└──────────┬──────────────┘
           │
           ▼
   [END]
```

---

## 5. LangGraph State Definition (`ReceivablesAgentState`)

```typescript
export interface ReceivablesAgentState {
  // Identification
  businessId: string;
  invoiceId: string;
  customerId: string;

  // Invoice Financial Facts (Supabase Ground Truth)
  invoiceAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate: string;
  daysOverdue: number;
  invoiceStatus: string;
  invoiceNumber: string;

  // Customer Behaviour Context
  customerName: string;
  averagePaymentDelay: number;
  overdueInvoiceCount: number;
  promiseCount: number;
  brokenPromiseCount: number;
  creditLimit: number;

  // Relational Event History
  paymentHistory: any[];
  promiseHistory: any[];
  recentCommunications: any[];
  exceptionContext: any[];

  // Deterministic Baseline Signals
  hasBrokenPromise: boolean;
  hasOpenException: boolean;
  hasDispute: boolean;
  baselineScore: number;
  baselinePriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  // Agent AI Outputs
  agentPriority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priorityReason: string;
  evidence: string[];
  recommendedAction: string;
  confidence: number;

  // Policy & Audit Controls
  policyDecision: 'APPROVED' | 'REJECTED' | 'HUMAN_REVIEW';
  policyReason?: string;
  agentRunId?: string;
  agentDecisionId?: string;
  workflowStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  error?: string;
}
```

---

## 6. Deterministic Baseline Scoring Formula
Outside the LLM, TypeScript computes a baseline priority score ($S$) from 0 to 100:
$$\text{Base Score} = \min(100, (\text{Days Overdue} \times 1.5) + (\text{Outstanding Ratio} \times 30) + (\text{Broken Promises} \times 20) + (\text{Dispute/Exception} \times 15))$$

- **CRITICAL**: Score $\ge 75$ or Days Overdue $> 60$ or Broken Promises $> 1$.
- **HIGH**: Score $\ge 50$ or Days Overdue $> 30$.
- **MEDIUM**: Score $\ge 25$ or Days Overdue $> 0$.
- **LOW**: Score $< 25$.

---

## 7. Policy Engine Guardrails
Before saving, `POLICY_CHECK` enforces:
1. **Financial Immutability**: AI output cannot alter `outstandingAmount` or `invoiceStatus`.
2. **Paid Invoice Protection**: If `outstandingAmount == 0` or `invoiceStatus == 'PAID'`, decision must be `LOW` / `NO_ACTION`.
3. **Dispute Pause**: If `hasDispute` is `true`, aggressive collection actions are blocked (`HUMAN_REVIEW` required).
4. **Low Confidence Gate**: If `confidence < 0.60`, policy Decision becomes `HUMAN_REVIEW`.
5. **Schema Validation**: If LLM JSON parsing fails, fallback state returns `HUMAN_REVIEW` with baseline priority.

---

## 8. Database Persistence Schema
- **`agent_runs`**: Records run metadata (`agent_name: 'Receivables Intelligence Agent'`, `status: 'COMPLETED'`, timestamps).
- **`agent_decisions`**: Records decision details (`agent_run_id`, `invoice_id`, `customer_id`, `decision_type: 'PRIORITY_ASSESSMENT'`, `reasoning`, `confidence_score`).
- **`audit_logs`**: Records immutable audit event (`entity_type: 'INVOICE'`, `action: 'RECEIVABLES_AGENT_EVALUATION'`, details JSON).

---

## 9. API Specification (`POST /api/agents/receivables/run`)
- **Request**: `{ "invoiceId": "uuid" }`
- **Response**:
```json
{
  "success": true,
  "invoiceId": "c19cd994-fb07-4363-b4b9-ed1cbe7b2909",
  "invoiceNumber": "INV-1001",
  "customerName": "Apex Retail Systems",
  "outstandingAmount": 1200000,
  "daysOverdue": 23,
  "baselinePriority": "HIGH",
  "baselineScore": 64.5,
  "priority": "HIGH",
  "priorityReason": "High exposure balance of ₹12,000,000 is 23 days past due with no recorded payment promises.",
  "evidence": [
    "Invoice is 23 days past due date (2026-08-05).",
    "Outstanding balance of ₹12,00,000 represents high exposure.",
    "Customer has 0 active payment promises on record."
  ],
  "recommendedAction": "Send formal payment reminder and schedule phone follow-up with accounts payable.",
  "confidence": 0.92,
  "policyDecision": "APPROVED",
  "agentRunId": "uuid",
  "agentDecisionId": "uuid"
}
```
