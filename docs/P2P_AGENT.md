# Promise-to-Pay (P2P) Intelligence Agent — Operational Guide & Reference

## Overview

The **Promise-to-Pay (P2P) Intelligence Agent** is the second specialist AI agent in the **AI Revenue Recovery & Receivables Intelligence** platform. It provides real-time, deterministic, and AI-assisted analysis of customer payment commitments, promise fulfillment, historical reliability, and operational next-step recommendations.

---

## Key Operational Capabilities

1. **Deterministic Promise State Evaluation**:
   - **`ACTIVE`**: Promise date is unexpired and fulfillment is pending.
   - **`FULFILLED`**: Fulfilled amount matches or exceeds promised amount with verified bank payment allocations.
   - **`PARTIALLY_FULFILLED`**: Partial payment allocation received.
   - **`BROKEN`**: Promise date passed with 0 qualifying payment allocations.

2. **Customer Commitment Reliability Engine**:
   - Computes long-term customer reliability: `HIGH`, `MEDIUM`, `LOW`, `CRITICAL`.
   - Distinguishes between **Current Promise Status** (e.g. `ACTIVE`) and **Commitment Reliability** (e.g. `LOW` due to repeated historical defaults).

3. **LangGraph Agentic Orchestration**:
   - 10-node StateGraph: `LOAD_CONTEXT` → `BUILD_SIGNALS` → `EVALUATE_PROMISE_STATE` → `ASSESS_RELIABILITY` → `P2P_AGENT` → `VALIDATE_OUTPUT` → `POLICY_CHECK` → `PERSIST_DECISION` → `AUDIT` → `END`.

4. **Gemini 3.6 Flash Reasoning**:
   - Provides operational explanations, bulleted factual evidence, and recommended collection actions.
   - Validated against a strict Pydantic schema (`P2PAgentStructuredOutput`).

5. **Safety Policy Engine**:
   - Enforces 8 deterministic safety guardrails blocking automated collection escalation on paid or disputed invoices, flagging data consistency warnings or low confidence for `HUMAN_REVIEW`.

6. **Immutable Execution Audit**:
   - Records every run to `agent_runs`, `agent_decisions`, and `audit_logs` in Supabase PostgreSQL without modifying schema or financial data.

---

## API References

### Endpoint: `POST /api/agents/promises/run` (or Node proxy)
**Request Body**:
```json
{
  "promiseId": "1b09eef5-f9d2-43e9-9cf9-5ac3b9762540"
}
```

**Response**:
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
  "fulfilledAmount": 0.0,
  "fulfillmentRatio": 0.0,
  "daysUntilPromise": -1,
  "daysPastPromise": 1,
  "deterministicPromiseState": "BROKEN",
  "commitmentReliability": "MEDIUM",
  "promiseAssessment": "BROKEN",
  "reason": "The customer promised to pay 500,000.0 by 2026-08-29, but no payment has been received, leaving the promise unfulfilled and 1 day past due.",
  "evidence": [
    "Promised ₹5,00,000 on 2026-08-29 (1 day past promised date).",
    "Zero qualifying payment allocations found in Supabase for INV-1002.",
    "Deterministic promise state evaluated as BROKEN."
  ],
  "recommendedAction": "Initiate automated payment reminder and follow up with outbound call.",
  "confidence": 0.95,
  "policyDecision": "APPROVED",
  "policyReason": "Approved collections escalation for BROKEN promise with MEDIUM commitment reliability.",
  "rulesTriggered": ["RULE_8_BROKEN_PROMISE_ESCALATION_APPROVED"],
  "safeAction": "Initiate automated payment reminder and follow up with outbound call.",
  "agentRunId": "792d1baf-41d7-4911-aba4-8035772b3409",
  "agentDecisionId": "2fede4bf-d41d-4dfb-b5d6-ab42f566bee5"
}
```

---

## Conversational Assistant Prompts

The financial operations assistant supports these P2P queries:
- *"What did this customer promise?"*
- *"Did they fulfill the promise for INV-1002?"*
- *"Which promises are at risk?"*
- *"Which customers repeatedly break commitments?"*
- *"Should I trust this customer's latest promise?"*
