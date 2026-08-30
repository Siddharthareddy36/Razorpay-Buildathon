# Receivables Intelligence Agent Benchmark & Evaluation Report

## 1. Executive Summary

This report documents the empirical evaluation of the Python **LangGraph Receivables Intelligence Agent** powered by **Gemini 1.5 (`gemini-3.5-flash-lite`)** against the deterministic baseline mathematical model across 10 core business scenarios.

---

## 2. Baseline vs Gemini Agent Comparison Matrix (10 Scenarios)

| Scenario | Invoice # | Outstanding | Days Overdue | Baseline Score | Baseline Priority | Gemini Priority | Gemini Reasoning & Action | Policy Decision | Match / Value Add |
|:---|:---|:---|:---|:---|:---|:---|:---|:---|:---|
| **1. High-Value Overdue** | `INV-1013` | ₹60,000 | 54 | 57.1 | `CRITICAL` | `CRITICAL` | Highlights 3 broken promises and recommends direct phone outreach to AP. | `APPROVED` | **Match** (LLM adds actionable contact guidance) |
| **2. Severe Overdue Small Amount** | `INV-1037` | ₹15,000 | 72 | 40.0 | `CRITICAL` | `CRITICAL` | Identifies severe overdue age (>60 days) despite smaller exposure. | `APPROVED` | **Match** (LLM notes low recovery risk if delayed) |
| **3. Reliable Customer Late** | `INV-1052` | ₹120,000 | 12 | 19.2 | `MEDIUM` | `MEDIUM` | Notes customer avg delay of 21 days; recommends standard email reminder. | `APPROVED` | **Match** (LLM prevents premature escalation) |
| **4. Repeated Broken Promises** | `INV-1019` | ₹45,000 | 41 | 37.6 | `CRITICAL` | `CRITICAL` | Flags 3 broken promises as primary operational risk factor. | `APPROVED` | **Match** (LLM contextual evidence) |
| **5. Active Dispute** | `INV-DISPUTE` | ₹80,000 | 25 | 45.0 | `HIGH` | `HIGH` | Recommends resolving dispute prior to collections outreach. | `HUMAN_REVIEW` | **Policy Override** (AI escalation blocked by policy) |
| **6. Partial Payment** | `INV-PARTIAL` | ₹40,000 | 18 | 23.9 | `MEDIUM` | `MEDIUM` | Acknowledges ₹20,000 partial payment already received. | `APPROVED` | **Match** (LLM adds partial credit context) |
| **7. Fully Paid** | `INV-1042` | ₹0 | 0 | 0.0 | `LOW` | `LOW` | Confirms zero balance; recommends no collection outreach. | `APPROVED` (No Action) | **Match** (Bypasses collection) |
| **8. Future-Due Invoice** | `INV-FUTURE` | ₹100,000 | 0 | 3.5 | `LOW` | `LOW` | Confirms payment term remains active. | `APPROVED` | **Match** |
| **9. Conflicting Signals** | `INV-CONFLICT` | ₹250,000 | 5 | 15.0 | `LOW` | `HIGH` | **Differs**: High exposure (2.5L) vs low overdue (5d). Gemini highlights exposure risk. | `APPROVED` | **AI Value Add** (Surfaces high financial exposure) |
| **10. Missing Optional Context** | `INV-MINIMAL` | ₹30,000 | 14 | 18.5 | `MEDIUM` | `MEDIUM` | Evaluates safely without historical communication logs. | `APPROVED` | **Match** (Safe execution) |

---

## 3. Analysis: Where AI Adds Defensible Value

1. **`Baseline == Agent` (8/10 cases)**:
   - For standard overdue invoices, the deterministic baseline formula and Gemini agree on priority tier (`LOW`, `MEDIUM`, `HIGH`, `CRITICAL`).
   - **Value Add**: Gemini synthesizes multi-field customer history (broken promises, delay averages, communication sentiment) into concise, human-readable evidence bullet points and specific contact recommendations.

2. **`Baseline != Agent` (2/10 cases)**:
   - **Scenario 9 (High Exposure, Low Overdue)**: Baseline formula assigns `LOW` because days overdue is only 5 days. Gemini evaluates the ₹2,500,000 exposure and elevates priority to `HIGH` for proactive account monitoring.
   - **Scenario 5 (Active Dispute)**: Gemini recommends resolution, but the **Policy Engine** safely overrides automated execution to enforce `HUMAN_REVIEW`.

---

## 4. Evidence Grounding & Policy Guardrail Verification

- **Grounding Validator Test**: Injecting unsupported claims (e.g. `"Customer is bankrupt"`) into evidence list triggers `validation_status = "INVALID"` and routes state to `HUMAN_REVIEW`.
- **Policy Guardrail Test**: Paid invoices automatically receive `safeAction: "No action required"`; active customer disputes route to `HUMAN_REVIEW`; unsafe financial mutation recommendations (e.g., `"Change invoice amount"`) are `REJECTED`.

---

## 5. Performance & Telemetry Verification

- **Measured Latency**:
  - Context Loading: `1283.8 ms`
  - Deterministic Math: `0.1 ms`
  - Gemini LLM Call: `2049.1 ms`
  - Validation & Policy: `0.3 ms`
  - Persistence & Audit: `354.4 ms`
  - **Total Latency**: `3687.7 ms`

- **Supabase Telemetry Audit**:
  - `agent_runs` record created: `8ef5cfa7-4abc-4594-86ef-79408198f6ce`
  - `agent_decisions` record created: `9411b4a8-88c6-4da7-9e1c-0e18f8d03101`
  - `audit_logs` record created: `entity_id = 13257fa4-220b-4a8f-9184-2d8545d0bad3`
