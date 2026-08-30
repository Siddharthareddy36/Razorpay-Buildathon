# LangGraph Receivables Intelligence Workflow Specification

## 1. Overview & Architecture

The **Receivables Intelligence Agent** is orchestrated via Python's native **LangGraph `StateGraph`** state machine. It combines deterministic financial analysis, LLM contextual reasoning (Gemini 1.5), deterministic policy safety guardrails, and persistent database audit logging.

```
START
  │
  ▼
LOAD_CONTEXT ─────────▶ Fetches ground truth from Supabase (Invoice, Customer, Promises, Communications)
  │
  ▼
BUILD_SIGNALS ────────▶ Calculates deterministic risk signals (Exposure, Days Overdue, Broken Promises, Disputes)
  │
  ▼
BASELINE ─────────────▶ Calculates transparent mathematical Baseline Score (0-100) & Baseline Priority
  │
  ▼
ANALYZE_WITH_GEMINI ──▶ LLM contextual reasoning (or Deterministic Fallback if API key absent/failing)
  │
  ▼
VALIDATE_OUTPUT ──────▶ Grounding & schema validator (Validates Pydantic schema & factual evidence)
  │
  ├─────────────────────────────────────┐
  │ [VALID]                             │ [INVALID]
  ▼                                     ▼
POLICY_CHECK ──────────┐            HUMAN_REVIEW ──▶ Safe fallback routing for disputed/low-confidence/invalid context
  │                    │                │
  └────────────────────┼────────────────┘
                       ▼
                PERSIST_DECISION ────────▶ Inserts execution telemetry into Supabase (agent_runs & agent_decisions)
                       │
                       ▼
                    AUDIT ───────────────▶ Inserts immutable audit trace into audit_logs
                       │
                       ▼
                      END
```

---

## 2. State Schema (`ReceivablesState`)

Strongly typed `TypedDict` tracking state progression:
- **Identity**: `business_id`, `invoice_id`, `customer_id`, `invoice_number`
- **Financial Facts**: `invoice_amount`, `paid_amount`, `outstanding_amount`, `due_date`, `days_overdue`, `invoice_status`
- **Customer Context**: `average_payment_delay_days`, `total_invoices`, `overdue_invoice_count`, `total_promises`, `broken_promise_count`
- **Signals & Baseline**: `signals` (dict), `baseline_score` (float), `baseline_priority` ('LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL')
- **Agent AI Output**: `agent_priority`, `priority_reason`, `evidence` (list), `recommended_action`, `confidence`, `reasoning_mode` ('GEMINI' | 'DETERMINISTIC_FALLBACK')
- **Validation**: `validation_status` ('VALID' | 'INVALID'), `validation_errors` (list)
- **Policy Engine**: `policy_decision` ('APPROVED' | 'REJECTED' | 'HUMAN_REVIEW'), `policy_reason`, `rules_triggered`, `safe_action`
- **Persistence**: `agent_run_id`, `agent_decision_id`

---

## 3. Node Responsibilities

| Node Name | File Location | Primary Function |
|:---|:---|:---|
| `LOAD_CONTEXT` | [`app/nodes/load_context.py`](file:///c:/Razorpay-Project/agent-service/app/nodes/load_context.py) | Queries Supabase for ground-truth invoice facts and relational event history |
| `BUILD_SIGNALS` | [`app/nodes/build_signals.py`](file:///c:/Razorpay-Project/agent-service/app/nodes/build_signals.py) | Computes deterministic risk indicators (exposure, overdue, broken promises, disputes) |
| `BASELINE` | [`app/nodes/baseline.py`](file:///c:/Razorpay-Project/agent-service/app/nodes/baseline.py) | Evaluates baseline mathematical score ($0\text{--}100$) and baseline priority benchmark |
| `ANALYZE_WITH_GEMINI` | [`app/nodes/analyze.py`](file:///c:/Razorpay-Project/agent-service/app/nodes/analyze.py) | Contextual LLM reasoning via Gemini 1.5 REST API or deterministic fallback engine |
| `VALIDATE_OUTPUT` | [`app/nodes/validate.py`](file:///c:/Razorpay-Project/agent-service/app/nodes/validate.py) | Validates JSON schema bounds and verifies evidence grounding against state facts |
| `POLICY_CHECK` | [`app/nodes/policy.py`](file:///c:/Razorpay-Project/agent-service/app/nodes/policy.py) | Enforces 7 deterministic safety guardrails (Paid Invoice, Dispute, Low Confidence, Unsafe Mutation) |
| `HUMAN_REVIEW` | [`app/nodes/human_review.py`](file:///c:/Razorpay-Project/agent-service/app/nodes/human_review.py) | Safe fallback node routing unverified or disputed cases for human analyst review |
| `PERSIST_DECISION` | [`app/nodes/persist.py`](file:///c:/Razorpay-Project/agent-service/app/nodes/persist.py) | Writes execution records to `agent_runs` and `agent_decisions` Supabase tables |
| `AUDIT` | [`app/nodes/audit.py`](file:///c:/Razorpay-Project/agent-service/app/nodes/audit.py) | Inserts immutable governance audit trace into `audit_logs` table |

---

## 4. Execution Trace Example (`INV-1013`)

- **Input**: `POST /agents/receivables/run` with `{"invoiceNumber": "INV-1013"}`
- **Resolved Invoice UUID**: `13257fa4-220b-4a8f-9184-2d8545d0bad3`
- **Calculated Baseline Score**: `57.1` (`CRITICAL`)
- **Agent Priority**: `CRITICAL`
- **Reasoning Mode**: `DETERMINISTIC_FALLBACK`
- **Policy Decision**: `APPROVED` (`RULE_DEFAULT_APPROVED`)
- **Safe Action**: `"Escalate immediately to senior credit manager for formal outreach and payment commitment confirmation."`
- **Telemetry Records**: `agent_run_id`: `5ceecf5e-d559-4019-a8d9-2b02432327d9`, `agent_decision_id`: `8bd7bb82-99e4-48a4-af78-584223663bdd`.
