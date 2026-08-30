# Gemini Execution Trace — Receivables Intelligence Agent

## 1. Overview & Verification

This document captures the complete real execution trace of the **Receivables Intelligence Agent** utilizing the **Google Gemini API (`gemini-3.5-flash-lite`)** orchestrated via native **Python LangGraph**.

- **Environment**: Python FastAPI Agent Service (Port 8000)
- **LLM Provider**: Google Gemini REST API (`gemini-3.5-flash-lite`)
- **Reasoning Mode**: `GEMINI`
- **Telemetry Verification**:
  - `agent_runs`: Verified (`8ef5cfa7-4abc-4594-86ef-79408198f6ce`)
  - `agent_decisions`: Verified (`9411b4a8-88c6-4da7-9e1c-0e18f8d03101`)
  - `audit_logs`: Verified (`entity_id`: `13257fa4-220b-4a8f-9184-2d8545d0bad3`)

---

## 2. Input Context Payload (Sent to Gemini)

```json
{
  "invoice": {
    "number": "INV-1013",
    "amount": 60000.0,
    "outstanding": 60000.0,
    "daysOverdue": 54,
    "status": "OVERDUE"
  },
  "customer": {
    "name": "Sapphire Stores",
    "averagePaymentDelayDays": 21,
    "overdueInvoices": 8,
    "brokenPromises": 3
  },
  "signals": {
    "outstandingAmount": 60000.0,
    "daysOverdue": 54,
    "hasBrokenPromise": true,
    "hasDispute": false,
    "hasOpenException": false,
    "hasPartialPayment": false
  },
  "baseline": {
    "score": 57.1,
    "priority": "CRITICAL"
  }
}
```

---

## 3. Raw Gemini LLM Output

```json
{
  "priority": "CRITICAL",
  "priorityReason": "Invoice INV-1013 is 54 days overdue with a significant outstanding amount of 60,000.0, and the customer has 8 total overdue invoices and 3 broken promises.",
  "evidence": [
    "Invoice INV-1013 is overdue by 54 days with an outstanding amount of 60,000.0.",
    "Customer Sapphire Stores has 8 overdue invoices.",
    "Customer has a history of 3 broken payment promises out of 5 total promises.",
    "No active payment promise or active dispute currently exists."
  ],
  "recommendedAction": "Escalate the account for direct phone outreach by a senior collection specialist to address the 8 overdue invoices and establish a firm payment schedule for INV-1013.",
  "confidence": 0.95
}
```

---

## 4. Policy Engine & Final API Response

```json
{
  "success": true,
  "invoiceId": "13257fa4-220b-4a8f-9184-2d8545d0bad3",
  "invoiceNumber": "INV-1013",
  "priority": "CRITICAL",
  "priorityReason": "Invoice INV-1013 is 54 days overdue with a significant outstanding amount of 60,000.0, and the customer has 8 total overdue invoices and 3 broken promises.",
  "evidence": [
    "Invoice INV-1013 is overdue by 54 days with an outstanding amount of 60,000.0.",
    "Customer Sapphire Stores has 8 overdue invoices.",
    "Customer has a history of 3 broken payment promises out of 5 total promises.",
    "No active payment promise or active dispute currently exists."
  ],
  "recommendedAction": "Escalate the account for direct phone outreach by a senior collection specialist to address the 8 overdue invoices and establish a firm payment schedule for INV-1013.",
  "confidence": 0.95,
  "reasoningMode": "GEMINI",
  "policyDecision": "APPROVED",
  "policyReason": "Policy Rule: Assessment validated against all deterministic financial safety guardrails.",
  "rulesTriggered": [
    "RULE_DEFAULT_APPROVED"
  ],
  "safeAction": "Escalate the account for direct phone outreach by a senior collection specialist to address the 8 overdue invoices and establish a firm payment schedule for INV-1013.",
  "agentRunId": "8ef5cfa7-4abc-4594-86ef-79408198f6ce",
  "agentDecisionId": "9411b4a8-88c6-4da7-9e1c-0e18f8d03101"
}
```

---

## 5. Performance Latency Breakdown

| Workflow Phase | Measured Latency |
|:---|:---|
| **Context Loading (Supabase 6-table join)** | 1283.8 ms |
| **Deterministic Signals & Baseline Math** | 0.1 ms |
| **Gemini LLM API Call (`gemini-3.5-flash-lite`)** | 2049.1 ms |
| **Pydantic Validation & Evidence Grounding** | 0.2 ms |
| **Policy Engine Safety Check** | 0.1 ms |
| **Telemetry Persistence & Audit Logging** | 354.4 ms |
| **Total Workflow Execution Latency** | **3687.7 ms** |
