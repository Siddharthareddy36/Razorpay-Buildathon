# Conversational Financial Operations Copilot Architecture

> [!IMPORTANT]
> **PHASE 7.3 SPECIFICATION — FINAL ASSISTANT HARDENING**: This document details the session-bound conversational context architecture, intent routing order, promise fulfillment tracking, and transparent fallback contract for the **Receivables Operations Copilot**.
>
> - **NO SCHEMA MUTATIONS**: Uses existing live Supabase PostgreSQL tables without database alterations.
> - **THREAD-SAFE & STATELESS BACKEND**: Session context is maintained on the client (`sessionContext`) and echoed per request.
> - **DETERMINISTIC FACT GROUNDING**: All financial facts (amounts, dates, promise statuses, exception details) originate from Supabase. Specialist microservices or DB fallback reason strictly over retrieved facts.
> - **TRANSPARENT FALLBACK & FAITHFUL REASONING**: When microservices are offline, responses are tagged `LIVE_DATABASE_FALLBACK` with zero artificial confidence scores or fabricated AI reasoning.

---

## 1. INTENT PRECEDENCE & ROUTING HIERARCHY

To ensure promise queries and explicit entity mentions are never misrouted to generic customer or invoice handlers, the intent router enforces the following strict precedence:

```
┌────────────────────────────────────────────────────────────────────────┐
│                      INTENT PRECEDENCE HIERARCHY                       │
├────────────────────────────────────────────────────────────────────────┤
│ 1. CONTEXT RESET                                                       │
│    ("reset", "clear", "start a new case", "new investigation")         │
│    ──> Resets all context fields to null.                              │
├────────────────────────────────────────────────────────────────────────┤
│ 2. EXPLICIT ENTITY RESOLUTION & OVERRIDES                             │
│    (e.g., INV-SYNTH-10002, "Acme Corp", explicit customer search)      │
│    ──> Overrides current context. Explicit entity switch clears stale  │
│        promise IDs.                                                    │
├────────────────────────────────────────────────────────────────────────┤
│ 3. PROMISE ROUTING (Runs BEFORE Customer/Invoice Analysis!)            │
│    ("What did this customer promise?", "Did they fulfill it?",         │
│     "active commitments", "broken promises", "supposed to pay")        │
│    ──> Evaluates exact promise in context or retrieves customer/invoice│
│        promises. Outputs standard PROMISE-TO-PAY or fulfillment schema. │
├────────────────────────────────────────────────────────────────────────┤
│ 4. INVOICE ANALYSIS                                                    │
│    ("Explain INV-10002", "Why is this invoice important?")            │
├────────────────────────────────────────────────────────────────────────┤
│ 5. CUSTOMER ANALYSIS                                                   │
│    ("What about its customer?", "customer risk", "payment history")    │
├────────────────────────────────────────────────────────────────────────┤
│ 6. RECONCILIATION & PAYMENTS                                           │
│    ("What about payments?", "short pay", "TDS", "exceptions")          │
├────────────────────────────────────────────────────────────────────────┤
│ 7. NEXT BEST ACTION                                                    │
│    ("What should we do next?")                                         │
├────────────────────────────────────────────────────────────────────────┤
│ 8. PORTFOLIO PRIORITY & EXPOSURE & SUMMARY                            │
│    ("Which invoices need attention?", "highest exposure", "summary")   │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. HARDENED SESSION CONTEXT MODEL

The client maintains a session context object (`sessionContext`) that is sent with every request and updated in every API response:

```typescript
export interface AssistantSessionContext {
  currentInvoiceId?: string | null;
  currentInvoiceNumber?: string | null;
  currentCustomerId?: string | null;
  currentCustomerName?: string | null;
  currentPromiseId?: string | null;
  currentPromiseContext?: any | null;
  currentPaymentId?: string | null;
  currentExceptionId?: string | null;
  lastReferencedEntity?: string | null;
  lastReferencedEntityType?: 'INVOICE' | 'CUSTOMER' | 'PROMISE' | 'PAYMENT' | 'EXCEPTION' | null;
}
```

### Context Persistence Rules

1. **Promise Context Attachment**:
   - Querying promises attaches `currentPromiseId` and `currentPromiseContext` to the session context.
   - On follow-up query *"Did they fulfill it?"*, the assistant evaluates the exact promise specified in `currentPromiseId`.

2. **Ambiguity Disambiguation**:
   - If a customer has multiple active/broken promises and no `currentPromiseId` is set, the assistant asks an explicit disambiguation question listing amounts and due dates instead of returning generic totals.

3. **Explicit Overrides & Stale State Clearance**:
   - When a user explicitly mentions a new invoice (`INV-SYNTH-10008`) or customer, previous `currentPromiseId` and `currentPromiseContext` are cleared (`null`) to avoid evaluating stale promises against a new entity.

---

## 3. PROMISE-TO-PAY RESPONSE SCHEMAS

### Promise Summary Schema (Part 7)
```
PROMISE-TO-PAY

Customer:
[Customer Name]

Current Promise:
₹[Promised Amount]

Promised Date:
[Date]

Status:
[ACTIVE | BROKEN | FULFILLED]

Fulfilled Amount:
₹[Amount]

Remaining:
₹[Amount]

Commitment Reliability:
[HIGH | LOW]

Evidence:
- [Fact 1]
- [Fact 2]

RECOMMENDATION:
[Action recommendation]

POLICY:
[APPROVED | HUMAN_REVIEW]
```

### Promise Fulfillment Evaluation Schema (Part 8)
```
Promise:
₹[Promised Amount]

Promised Date:
[Date]

Fulfilled:
[YES | NO | PARTIAL]

Amount Fulfilled:
₹[Amount]

Remaining:
₹[Amount]

Actual Payment Date:
[Date or 'No qualifying payment']

Final Promise State:
[FULFILLED | BROKEN | ACTIVE | PARTIALLY_FULFILLED]

Evidence:
- promised date passed: [YES | NO]
- qualifying payment received: [Amount]
- commitment reliability: [HIGH | LOW]
```

---

## 4. TRANSPARENT FALLBACK & UNIFIED PORTFOLIO METRICS

### Fallback Contract
When specialist Python microservices are unavailable:
- `source`: `'LIVE_DATABASE_FALLBACK'`
- `sourceLabel`: `'LIVE DATABASE FALLBACK'`
- `answer`: Introduced with clean facts from database (e.g., *"Receivables Intelligence is temporarily unavailable. Based on live Supabase records..."*).
- **Zero fake AI reasoning** or fabricated confidence scores.

### Unified Overdue Invoice Definition
Consistent definition applied across Backend, Assistant, and Dashboard:
```sql
outstanding_amount > 0 AND (days_overdue > 0 OR status IN ('overdue', 'OVERDUE') OR due_date < TODAY)
```

---

## 5. API PAYLOAD & RESPONSE EXAMPLE

### Request Body (`POST /api/agent/query`)
```json
{
  "query": "Did they fulfill it?",
  "context": {
    "currentInvoiceNumber": "INV-SYNTH-10002",
    "currentCustomerId": "a608dd45-f504-421d-a26d-b54a039fa047",
    "currentCustomerName": "Trident Enterprises 001",
    "currentPromiseId": "c3fb7561-b0da-405a-a075-855df96c55b8",
    "currentPromiseContext": {
      "id": "c3fb7561-b0da-405a-a075-855df96c55b8",
      "promised_amount": 3375000,
      "promised_date": "2026-09-08",
      "status": "ACTIVE"
    }
  }
}
```

### Response Body
```json
{
  "success": true,
  "intent": "PROMISE_FULFILLMENT_EVALUATION",
  "source": "LIVE_DATABASE_FALLBACK",
  "sourceLabel": "LIVE DATABASE FALLBACK",
  "answer": "Promise:\n₹33,75,000\n\nPromised Date:\n8 Sep 2026\n\nFulfilled:\nNO\n\nAmount Fulfilled:\n₹0\n\nRemaining:\n₹33,75,000\n\nActual Payment Date:\nNo qualifying payment\n\nFinal Promise State:\nACTIVE\n\nEvidence:\n- promised date passed: NO\n- qualifying payment received: No qualifying payment\n- commitment reliability: HIGH",
  "latencyMs": 35,
  "context": {
    "currentInvoiceNumber": "INV-SYNTH-10002",
    "currentCustomerId": "a608dd45-f504-421d-a26d-b54a039fa047",
    "currentCustomerName": "Trident Enterprises 001",
    "currentPromiseId": "c3fb7561-b0da-405a-a075-855df96c55b8"
  },
  "facts": {
    "promised_amount": 3375000,
    "status": "ACTIVE"
  },
  "recommendation": "Verify payment receipt against promised date.",
  "policy": "APPROVED"
}
```
