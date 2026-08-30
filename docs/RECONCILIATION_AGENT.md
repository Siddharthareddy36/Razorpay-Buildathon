# Reconciliation Intelligence Agent — Operational Guide & Reference

This document serves as the operational reference guide for the **Reconciliation Intelligence Agent**, detailing setup, API usage, internal candidate hypothesis evaluation, evidence hierarchy weighting, safety policy enforcement, and audit telemetry.

---

## 1. Core Workflow Architecture

```
[REST Client / Frontend UI]
       │
       ▼ POST /api/agents/reconciliation/run
[Node.js / Express Proxy]
       │
       ▼ POST http://127.0.0.1:8000/agents/reconciliation/run
[Python FastAPI Microservice]
       │
       ▼ LangGraph 10-Node StateGraph Execution Workflow
┌──────────────────────────────────────────────────────────────────┐
│ 1. LOAD_CONTEXT (Exception, Invoice, Payment, Allocations, Comms) │
│ 2. BUILD_SIGNALS (Extract qualitative & payment method markers) │
│ 3. COMPARE_FINANCIAL_VALUES (Expected, Received, Difference, Alloc) │
│ 4. BUILD_HYPOTHESES (Generates & ranks candidate hypotheses)    │
│ 5. RECONCILIATION_AGENT (Gemini 3.6 Flash structured reasoning) │
│ 6. VALIDATE_OUTPUT (Pydantic schema validation)                  │
│ 7. POLICY_CHECK (Deterministic 8-rule safety guardrails)        │
│ 8. PERSIST_DECISION (Write agent_runs & agent_decisions)         │
│ 9. AUDIT (Write audit_logs execution telemetry)                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Evidence Priority Hierarchy

1. **HIGHEST PRIORITY (Financial Database Truth)**:
   - Payment allocation records (`payment_allocations`)
   - Payment amounts and transaction status (`payments`)
   - Invoice expected total and status (`invoices`)
   - Exception record (`reconciliation_exceptions`)
2. **MEDIUM PRIORITY (Transaction Metadata)**:
   - Payment method (`CARD`, `UPI`, `BANK_TRANSFER`, `NEFT`, `RTGS`)
   - Payment reference number history
3. **SUPPORTING PRIORITY (Qualitative Communications)**:
   - Inbound customer communications, Form 16A claims, short-pay notices.

> **Rule**: Direct financial records strictly supersede qualitative communication claims.

---

## 3. Candidate Hypotheses & Special Case Detectors

- **`TDS`**: Tax Deducted at Source (Form 16A withholding).
- **`MDR`**: Merchant Discount Rate (payment gateway / card processing fee).
- **`GST`**: Goods & Services Tax component discrepancy.
- **`PARTIAL_PAYMENT`**: Partial payment tranche against expected total.
- **`OVERPAYMENT`**: Received amount exceeds expected invoice total.
- **`UNALLOCATED_PAYMENT`**: Payment received but zero allocation in database.
- **`WRONG_INVOICE`**: Payment reference indicates mismatch with target invoice.
- **`DUPLICATE_PAYMENT`**: Multiple identical payment receipts found.
- **`REFUND`**: Transaction includes refund or chargeback reversal.
- **`UNKNOWN`**: Inconclusive evidence (Requires human review).

---

## 4. API Reference

### Proxy Endpoint (Node.js Express)
`POST /api/agents/reconciliation/run`

### Internal Microservice Endpoint (Python FastAPI)
`POST /agents/reconciliation/run`

### Request Payload
```json
{
  "exceptionId": "68bcd063-6c6a-4cac-be55-8a12deac8b8c"
}
```

### Response Payload
```json
{
  "success": true,
  "exceptionId": "68bcd063-6c6a-4cac-be55-8a12deac8b8c",
  "invoiceId": "c783e085-fb71-4f83-b4d6-4e8940bb4fb4",
  "paymentId": "ea5c6da0-aa71-49c0-b95a-b99b5d88892f",
  "customerId": "20000000-0000-4000-8000-000000000015",
  "invoiceNumber": "INV-1039",
  "customerName": "ValueBasket Distributors",
  "expectedAmount": 600000,
  "receivedAmount": 575000,
  "difference": 25000,
  "allocatedAmount": 575000,
  "unallocatedAmount": 0,
  "primaryHypothesis": "TDS",
  "reason": "The money received is less than expected by 25,000.00 due to statutory tax deduction, which is explicitly supported by the database exception record, customer communication referencing tax withholding, and a discrepancy matching standard withholding patterns.",
  "evidence": [
    "Expected amount is 600,000.00 and received amount is 575,000.00, resulting in a difference of 25,000.00.",
    "Reconciliation exception record explicitly specifies TDS.",
    "Customer communication states 25,000 was withheld under the agreed deduction and references tax withholding / Form 16A."
  ],
  "alternativeHypotheses": ["PARTIAL_PAYMENT"],
  "recommendedAction": "Verify receipt of Form 16A from ValueBasket Distributors for the 25,000.00 tax deduction, post the amount to the TDS withholding ledger account, and clear invoice INV-1039 as fully settled.",
  "confidence": 0.98,
  "policyDecision": "HUMAN_REVIEW",
  "policyReason": "TDS withholding identified. Human operator review required to verify tax/fee documentation.",
  "rulesTriggered": ["RULE_8_CONFIRMED_RECONCILIATION"],
  "safeAction": "Verify receipt of Form 16A from ValueBasket Distributors for the 25,000.00 tax deduction, post the amount to the TDS withholding ledger account, and clear invoice INV-1039 as fully settled.",
  "agentRunId": "3cfc18bc-310d-4a83-a23f-aa226b498543",
  "agentDecisionId": "6da679f0-954c-4c40-97b4-b8699c53e8f9"
}
```
