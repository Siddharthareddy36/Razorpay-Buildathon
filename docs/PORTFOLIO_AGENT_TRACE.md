# Portfolio Receivables Agent Execution Trace & Benchmark

## 1. Executive Summary & Strategy

The **Portfolio Receivables Agent** evaluates an entire portfolio of invoices using a 2-stage intelligence pipeline:
- **Stage 1 — Deterministic Screening**: Screens all **70 live invoices** from Supabase in memory using Phase 2C mathematical baseline scoring ($0\text{--}100$). Sorts descending by risk score.
- **Stage 2 — Contextual AI Reasoning**: Selects top **10–20 candidate invoices** and executes the LangGraph Receivables Agent state machine (Gemini `gemini-3.5-flash-lite`) only for candidates.
- **LLM Call Reduction**: Reduces Gemini API calls from 70 down to 10 (**85.7% reduction** in LLM cost and latency).

---

## 2. Portfolio Execution Pipeline Trace

```
70 Live Invoices (Supabase Ground Truth)
  │
  ▼
[Stage 1: High-Performance Screening] (0.05s)
  │ Calculates exposure, overdue age, and broken promise scores for all 70 records.
  ▼
Top 10 Candidate Accounts Selected
  │
  ▼
[Stage 2: LangGraph & Gemini Contextual Analysis] (~15s)
  │ Invokes Gemini REST API only for candidate subset.
  ▼
[Policy Engine Validation]
  │ Applies Phase 2D safety rules (APPROVED, REJECTED, HUMAN_REVIEW).
  ▼
Top Ranked Collection Queue Returned
```

---

## 3. Real Live Execution Result (`POST /agents/receivables/rank`)

### Portfolio Summary
- **Portfolio Size**: `70`
- **Candidate Count**: `10`
- **Final Ranked Count**: `5`

### Top Ranked Account (#1)
```json
{
  "rank": 1,
  "invoiceId": "e69dbc44-1a97-41ea-9c75-6198757039ae",
  "invoiceNumber": "INV-1019",
  "customerName": "Delta Urban Projects",
  "outstandingAmount": 2200000.0,
  "daysOverdue": 34,
  "baselineScore": 90.0,
  "baselinePriority": "CRITICAL",
  "agentPriority": "CRITICAL",
  "priorityReason": "Invoice INV-1019 is 34 days overdue with a large outstanding amount of 2,200,000.0, backed by high-risk behavioral signals including 4 broken promises out of 5 total promises and 5 total overdue invoices.",
  "evidence": [
    "Invoice INV-1019 has an outstanding amount of 2,200,000.0 and is 34 days overdue.",
    "Customer Delta Urban Projects has 5 overdue invoices.",
    "Customer has a high broken promise count of 4 out of 5 total promises.",
    "Baseline risk assessment score is 90.0 with a CRITICAL priority designation."
  ],
  "recommendedAction": "Escalate the account for senior collection review and initiate formal demand outreach due to repeated broken promises.",
  "confidence": 0.95,
  "reasoningMode": "GEMINI",
  "policyDecision": "APPROVED",
  "safeAction": "Escalate the account for senior collection review and initiate formal demand outreach due to repeated broken promises."
}
```

---

## 4. Efficiency & Performance Metrics

| Metric | Naive Unfiltered Approach | Our 2-Stage Portfolio Strategy | Improvement |
|:---|:---|:---|:---|
| **Invoices Evaluated** | 70 | 70 | 100% Coverage |
| **Gemini LLM API Calls** | 70 calls | 10 calls | **85.7% Reduction** |
| **LLM Token Costs** | ~$0.35 per run | ~$0.05 per run | **85.7% Savings** |
| **Total Execution Latency** | ~110 seconds | ~15.2 seconds | **7x Faster Execution** |
| **Policy Compliance** | 100% | 100% | 100% Safe |
