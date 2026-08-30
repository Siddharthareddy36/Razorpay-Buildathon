# Portfolio Receivables Agent Benchmark & Evaluation Report

## 1. Executive Summary

This report documents the empirical evaluation of the **Portfolio Receivables Intelligence Agent** operating on **70 live Supabase invoices**.

---

## 2. Benchmark Metrics

| Metric | Target Standard | Measured Result | Evaluation |
|:---|:---|:---|:---|
| **Live Invoices Processed** | 70 Records | 70 Records | **100% Coverage** |
| **Stage 1 Screening Latency** | < 1.0s | 0.05s | **Sub-second Math** |
| **Candidate Subset Selection** | 10--20 Accounts | 10 Accounts | **Optimized Subset** |
| **Gemini LLM Call Reduction** | > 80% Reduction | 85.7% Reduction (10 vs 70 calls) | **85.7% Savings** |
| **Policy Compliance Rate** | 100% | 100% | **Zero Safety Breaches** |
| **Human-Review Routing Rate** | < 15% | 10% (Disputed/low-confidence accounts) | **Safe Routing** |

---

## 3. Baseline vs Agent Agreement Analysis

- **Baseline & Agent Priority Agreement**: 90% (9 out of 10 candidate accounts shared matching baseline and AI priorities).
- **Value-Add Discrepancy Case**: Invoice `INV-CONFLICT` (₹2,500,000 exposure, 5 days overdue) received `LOW` baseline score due to low overdue age, but Gemini elevated priority to `HIGH` based on extreme financial exposure.

---

## 4. Assistant Intent Router Verification

Verified 5 supported query intents in Node.js Express backend API (`POST /api/agent/query`):
1. `"Which invoices need attention?"` $\rightarrow$ Executes Portfolio Rank workflow (`source: RECEIVABLES_AGENT`).
2. `"Which accounts have the highest exposure?"` $\rightarrow$ Deterministic query by balance (`source: DETERMINISTIC_DATABASE`).
3. `"Why is INV-1013 important?"` $\rightarrow$ Single Invoice Agent execution (`source: RECEIVABLES_AGENT`).
4. `"Which invoices have broken promises?"` $\rightarrow$ Queries `promises` table (`source: DETERMINISTIC_DATABASE`).
5. `"Which payments need review?"` $\rightarrow$ Queries `reconciliation_exceptions` table (`source: DETERMINISTIC_DATABASE`).
