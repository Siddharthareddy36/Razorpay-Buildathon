# Receivables Intelligence Agent — Operational Manual

## Core Business Function

The **Receivables Intelligence Agent** solves a fundamental financial operations challenge:

> *"Which receivables should the merchant focus on first, and why?"*

Instead of blindly sorting invoices by largest dollar amount or oldest overdue date, the agent evaluates a comprehensive multi-factor matrix of financial, behavioural, and relational signals to prioritize limited human collection attention.

---

## Key Capabilities

1. **Ground Truth Financial Preservation**:
   All financial amounts ($\text{amount}$, $\text{paid\_amount}$, $\text{outstanding\_amount}$) and ledger statuses are fetched deterministically from Supabase PostgreSQL. The LLM is never allowed to invent or alter financial figures.

2. **7-Node LangGraph State Machine**:
   - `START` $\rightarrow$ `LOAD_CONTEXT` $\rightarrow$ `BUILD_SIGNALS` $\rightarrow$ `RECEIVABLES_AGENT` $\rightarrow$ `VALIDATE_OUTPUT` $\rightarrow$ `POLICY_CHECK` $\rightarrow$ `PERSIST_DECISION` $\rightarrow$ `AUDIT` $\rightarrow$ `END`.

3. **Deterministic Baseline vs AI Reasoning**:
   Computes a transparent mathematical baseline score ($0\text{--}100$) combining exposure, overdue age, broken promises, and open exceptions, compared against structured AI prioritization reasoning.

4. **Deterministic Policy Engine Guardrails**:
   - Automatically approves low-risk/paid invoices.
   - Restricts aggressive collection escalation on disputed invoices to `HUMAN_REVIEW`.
   - Forces `HUMAN_REVIEW` if confidence drops below 60% or context is invalid.

5. **Immutable Persistence & Telemetry**:
   Every run generates telemetry in `agent_runs`, decision payloads in `agent_decisions`, and execution events in `audit_logs`.

---

## REST API Specification

### 1. Single Invoice Analysis
- **Endpoint**: `POST /api/agents/receivables/run`
- **Payload**:
  ```json
  {
    "invoiceId": "13257fa4-220b-4a8f-9184-2d8545d0bad3"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "invoiceId": "13257fa4-220b-4a8f-9184-2d8545d0bad3",
    "invoiceNumber": "INV-1013",
    "customerName": "Sapphire Stores",
    "outstandingAmount": 60000,
    "daysOverdue": 54,
    "baselinePriority": "CRITICAL",
    "baselineScore": 57.1,
    "priority": "CRITICAL",
    "priorityReason": "High-exposure receivable (₹60,000) is 54 days past due with elevated account risk signals.",
    "evidence": [
      "Invoice INV-1013 is 54 days overdue with outstanding balance of ₹60,000.",
      "Customer Sapphire Stores has 3 historical broken payment promise(s)."
    ],
    "recommendedAction": "Escalate immediately to senior credit manager for formal outreach and payment commitment confirmation.",
    "confidence": 0.92,
    "policyDecision": "APPROVED",
    "policyReason": "Policy Rule: Assessment validated against all deterministic financial safety guardrails.",
    "agentRunId": "28aaf14a-46ed-4793-be64-b34685361b1c",
    "agentDecisionId": "360aa732-04c9-4733-9b9c-a5fa8f475036"
  }
  ```

### 2. Batch Portfolio Ranking
- **Endpoint**: `POST /api/agents/receivables/rank`
- **Payload**: `{}` (or optional `{ "invoiceIds": ["uuid1", "uuid2"] }`)
- **Response**: Returns prioritized list sorted by Priority Rank (`CRITICAL` > `HIGH` > `MEDIUM` > `LOW`) and Baseline Score.
