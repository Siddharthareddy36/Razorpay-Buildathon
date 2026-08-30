# Agent Architecture Migration Specification: TypeScript to Python LangGraph

## Executive Overview

This document provides a comprehensive architectural review and migration blueprint for decoupling the **Receivables Intelligence Agent** from the Node.js backend into a dedicated **Python LangGraph Agent Microservice (`agent-service/`)**.

The target architecture maintains clean microservice boundaries:
- **Frontend**: Next.js + React (User Interface)
- **Application Backend**: Node.js + Express (Business API, Authentication, Data Aggregation)
- **Agent Service**: Python + FastAPI + LangGraph (Workflow State Machine, Signal Scoring, Policy Engine)
- **LLM Reasoning Engine**: Gemini 1.5 Pro / Flash API
- **Ground Truth Storage**: Supabase PostgreSQL

---

## Part 1: Comprehensive Codebase Inspection & Current State

### 1. What has already been built?
- **Phase 1 & 1.5 Core Foundation**: Next.js frontend console, Express REST backend, Supabase live PostgreSQL connection (5 businesses, 25 customers, 70 invoices, 22 payments, 18 allocations, 70 communications, 29 promises, 6 reconciliation exceptions).
- **Phase 2 Receivables Intelligence Agent**: A 7-stage state machine workflow, deterministic baseline scoring ($0\text{--}100$), LLM structured output evaluation with Gemini/OpenAI + deterministic fallback, deterministic Policy Engine safety rules, database persistence to `agent_runs`, `agent_decisions`, and `audit_logs`, REST APIs (`POST /api/agents/receivables/run`, `POST /api/agents/receivables/rank`), and UI integration in `InvoiceDetail.tsx`.

### 2. Which parts are Node.js?
- **HTTP Server**: [`backend/src/server.ts`](file:///c:/Razorpay-Project/backend/src/server.ts) (Express app listening on port 5000).
- **Database & Supabase Service**: [`backend/src/lib/supabase.ts`](file:///c:/Razorpay-Project/backend/src/lib/supabase.ts) and [`backend/src/services/database.service.ts`](file:///c:/Razorpay-Project/backend/src/services/database.service.ts).
- **Controllers & Routes**: [`backend/src/controllers/agent.controller.ts`](file:///c:/Razorpay-Project/backend/src/controllers/agent.controller.ts), [`backend/src/routes/agent.routes.ts`](file:///c:/Razorpay-Project/backend/src/routes/agent.routes.ts), `customer.routes.ts`, `invoice.routes.ts`, `dashboard.routes.ts`, `business.routes.ts`.

### 3. Which parts are currently TypeScript agent logic?
- [`backend/src/agents/receivables/state.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/state.ts): `ReceivablesAgentState` interface & initializer.
- [`backend/src/agents/receivables/graph.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/graph.ts): State machine orchestrator function `runReceivablesAgentGraph()`.
- [`backend/src/agents/receivables/nodes/load-context.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/nodes/load-context.ts): Context loader node.
- [`backend/src/agents/receivables/nodes/build-signals.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/nodes/build-signals.ts): Deterministic signal calculator node.
- [`backend/src/agents/receivables/nodes/analyze.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/nodes/analyze.ts): LLM prompt builder, Gemini API caller, and output schema validator.
- [`backend/src/agents/receivables/nodes/policy.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/nodes/policy.ts): Policy Engine node.
- [`backend/src/agents/receivables/nodes/persist.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/nodes/persist.ts): `agent_runs` & `agent_decisions` writer node.
- [`backend/src/agents/receivables/nodes/audit.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/nodes/audit.ts): `audit_logs` writer node.

### 4. Where is LangGraph currently used?
- Currently, the 7-node state machine workflow is implemented in TypeScript using explicit node functions and state transitions in [`backend/src/agents/receivables/graph.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/graph.ts). In the target architecture, this graph logic will migrate to Python `langgraph.graph.StateGraph`.

### 5. Which files/functions perform the LLM call?
- [`backend/src/agents/receivables/nodes/analyze.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/nodes/analyze.ts) $\rightarrow$ `callLLMProvider()` function.

### 6. Which files calculate deterministic signals?
- [`backend/src/agents/receivables/nodes/build-signals.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/nodes/build-signals.ts) $\rightarrow$ `buildSignalsNode()` function.

### 7. Which files implement policy?
- [`backend/src/agents/receivables/nodes/policy.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/nodes/policy.ts) $\rightarrow$ `policyCheckNode()` function.

### 8. Which files write `agent_runs`?
- [`backend/src/agents/receivables/nodes/persist.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/nodes/persist.ts) $\rightarrow$ `persistDecisionNode()` function.

### 9. Which files write `agent_decisions`?
- [`backend/src/agents/receivables/nodes/persist.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/nodes/persist.ts) $\rightarrow$ `persistDecisionNode()` function.

### 10. Which files write `audit_logs`?
- [`backend/src/agents/receivables/nodes/audit.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/nodes/audit.ts) $\rightarrow$ `auditNode()` function.

### 11. Which API currently triggers the agent?
- Express endpoint: `POST /api/agents/receivables/run` handled by `AgentController.runReceivablesAgent()` in [`backend/src/controllers/agent.controller.ts`](file:///c:/Razorpay-Project/backend/src/controllers/agent.controller.ts).
- Batch endpoint: `POST /api/agents/receivables/rank` handled by `AgentController.rankReceivables()`.

### 12. Why are there currently 21 `agent_runs`?
- **Run 1**: Initial single invoice test execution (`INV-1013`, ID `13257fa4-220b-4a8f-9184-2d8545d0bad3`) via `test_receivables_agent.ps1`.
- **Runs 2--11**: Batch ranking API test (`POST /api/agents/receivables/rank`) processing top 10 invoices.
- **Runs 12--21**: 10-scenario empirical test matrix execution (`test_matrix.js`) evaluating Case 1 through Case 10.
- Total: $1 + 10 + 10 = 21$ agent runs.

---

## Part 2: Component Mapping Table (TypeScript $\rightarrow$ Python LangGraph)

| Current TypeScript File | Current Responsibility | Target Python Module | Target Python Responsibility |
|:---|:---|:---|:---|
| [`state.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/state.ts) | `ReceivablesAgentState` interface & initial state | `agent-service/app/state/receivables_state.py` | `TypedDict` / Pydantic state definition for LangGraph |
| [`nodes/load-context.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/nodes/load-context.ts) | DB context fetching | `agent-service/app/nodes/load_context.py` | Fetches invoice context via Supabase Python SDK / Node proxy |
| [`nodes/build-signals.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/nodes/build-signals.ts) | Risk signals & Baseline score formula | `agent-service/app/nodes/build_signals.py` | Deterministic Python calculation of baseline score ($0\text{--}100$) |
| [`nodes/analyze.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/nodes/analyze.ts) | LLM prompt & structured JSON parsing | `agent-service/app/nodes/analyze.py` | LangChain / Gemini API call returning structured Pydantic model |
| [`nodes/policy.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/nodes/policy.ts) | Deterministic Policy Guardrails | `agent-service/app/policies/receivables_policy.py` | Safety evaluation (`APPROVED`, `REJECTED`, `HUMAN_REVIEW`) |
| [`nodes/persist.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/nodes/persist.ts) | Telemetry persistence | `agent-service/app/nodes/persist.py` | Writes to `agent_runs` and `agent_decisions` in Supabase |
| [`nodes/audit.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/nodes/audit.ts) | Audit event logging | `agent-service/app/nodes/audit.py` | Writes to `audit_logs` in Supabase |
| [`graph.ts`](file:///c:/Razorpay-Project/backend/src/agents/receivables/graph.ts) | Sequential workflow execution | `agent-service/app/graph/receivables_graph.py` | `langgraph.graph.StateGraph` definition and compilation |
| [`agent.controller.ts`](file:///c:/Razorpay-Project/backend/src/controllers/agent.controller.ts) | Express API Controller | `agent-service/app/api/receivables_router.py` | FastAPI router serving `POST /agents/receivables/run` |

---

## Part 3: Target Python Project Structure (`agent-service/`)

```
agent-service/
├── .env                          # Local secrets (GEMINI_API_KEY, SUPABASE_URL, etc.)
├── .gitignore
├── requirements.txt              # fastapi, uvicorn, langgraph, langchain-google-genai, pydantic, supabase
├── main.py                       # FastAPI entrypoint (Port 8000)
└── app/
    ├── api/
    │   ├── __init__.py
    │   └── receivables_router.py # POST /agents/receivables/run & /agents/receivables/rank
    ├── graph/
    │   ├── __init__.py
    │   └── receivables_graph.py  # LangGraph StateGraph builder & workflow runner
    ├── state/
    │   ├── __init__.py
    │   └── receivables_state.py  # ReceivablesState TypedDict
    ├── nodes/
    │   ├── __init__.py
    │   ├── load_context.py       # Node 1: Context loader
    │   ├── build_signals.py      # Node 2: Deterministic signals & baseline score
    │   ├── analyze.py            # Node 3: LLM reasoning (Gemini)
    │   ├── policy.py             # Node 4: Policy engine guardrails
    │   ├── persist.py            # Node 5: Persistence to agent_runs & agent_decisions
    │   └── audit.py              # Node 6: Audit log writer
    ├── policies/
    │   ├── __init__.py
    │   └── receivables_policy.py # Deterministic safety rules
    ├── models/
    │   ├── __init__.py
    │   └── schema.py             # Pydantic models for request/response & structured output
    └── services/
        ├── __init__.py
        └── supabase_service.py   # Supabase Python client wrapper
```

---

## Part 4: Node ↔ Python API Contract & Architecture Boundary

### Flow Diagram
```
Browser (Next.js) 
   │
   │ POST /api/agents/receivables/run { invoiceId }
   ▼
Node.js Backend (Port 5000)
   │
   │ Forward HTTP POST http://localhost:8000/agents/receivables/run { invoiceId }
   ▼
Python Agent Service (FastAPI - Port 8000)
   │
   ├── 1. Load Context from Supabase
   ├── 2. Compute Deterministic Signals & Baseline Score
   ├── 3. Execute LangGraph Node -> Gemini 1.5 Pro / Flash API
   ├── 4. Apply Policy Engine Guardrails
   ├── 5. Persist to agent_runs, agent_decisions, audit_logs
   │
   ▼
Python Response -> Node.js Backend -> Next.js Frontend UI
```

### Request Payload (Node.js $\rightarrow$ Python Service)
- **HTTP Method**: `POST http://localhost:8000/agents/receivables/run`
- **Body**:
  ```json
  {
    "invoiceId": "c19cd994-fb07-4363-b4b9-ed1cbe7b2909"
  }
  ```

### Response Payload (Python Service $\rightarrow$ Node.js Backend)
- **HTTP Status**: `200 OK`
- **Body**:
  ```json
  {
    "success": true,
    "invoiceId": "c19cd994-fb07-4363-b4b9-ed1cbe7b2909",
    "invoiceNumber": "INV-1001",
    "customerName": "Acme Corp",
    "outstandingAmount": 2500000,
    "daysOverdue": 27,
    "baselinePriority": "HIGH",
    "baselineScore": 56.5,
    "priority": "HIGH",
    "priorityReason": "High-exposure invoice (₹25L) is 27 days past due with 2 historical broken payment promises.",
    "evidence": [
      "Invoice INV-1001 is 27 days overdue with outstanding balance of ₹25,000,000.",
      "Customer Acme Corp has 2 historical broken payment promise(s)."
    ],
    "recommendedAction": "Escalate immediately to senior credit manager for direct phone outreach.",
    "confidence": 0.95,
    "policyDecision": "APPROVED",
    "policyReason": "Policy Rule: Assessment validated against all deterministic financial safety guardrails.",
    "agentRunId": "uuid-here",
    "agentDecisionId": "uuid-here"
  }
  ```

---

## Part 5: Step-by-Step Migration Plan

1. **Step 1: Setup Python Environment**:
   Create `agent-service/` directory, initialize Python virtual environment (`venv`), install dependencies (`fastapi`, `uvicorn`, `langgraph`, `langchain-google-genai`, `pydantic`, `supabase`), and configure `agent-service/.env`.

2. **Step 2: Implement State & Models**:
   Port TypeScript `ReceivablesAgentState` to Python `TypedDict` in `agent-service/app/state/receivables_state.py` and Pydantic validation models in `models/schema.py`.

3. **Step 3: Port Context Loader & Deterministic Signals**:
   Port `loadContextNode` to `load_context.py` using `supabase-py` and port `buildSignalsNode` to `build_signals.py` maintaining the exact baseline equation ($0\text{--}100$).

4. **Step 4: Implement LangGraph Workflow & Gemini LLM Node**:
   Build `langgraph.graph.StateGraph` in `graph/receivables_graph.py` wiring `LOAD_CONTEXT` $\rightarrow$ `BUILD_SIGNALS` $\rightarrow$ `RECEIVABLES_AGENT` (Gemini) $\rightarrow$ `POLICY_CHECK` $\rightarrow$ `PERSIST` $\rightarrow$ `AUDIT`.

5. **Step 5: Expose FastAPI Microservice**:
   Create `FastAPI` server in `main.py` listening on port `8000` with endpoints `POST /agents/receivables/run` and `POST /agents/receivables/rank`.

6. **Step 6: Update Node.js Backend Route Proxy**:
   Modify `AgentController.runReceivablesAgent` in Node.js backend to forward requests to `http://localhost:8000/agents/receivables/run`, keeping the public API contract for Next.js unchanged!
