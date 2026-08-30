# Architecture Overview — AI Revenue Recovery & Receivables Intelligence

This document outlines the system architecture for the B2B AI Revenue Recovery & Receivables Intelligence platform, featuring three specialist graphs (**Receivables Intelligence Agent**, **Promise-to-Pay (P2P) Intelligence Agent**, and **Reconciliation Intelligence Agent**) orchestrated by the **Multi-Agent Supervisor**.

---

## 1. System Architecture Overview

```
Next.js 14 Financial Operations UI / Assistant Modal
        │
        ▼ HTTP REST / API Proxy
Node.js / Express Backend
        │
        ▼ HTTP POST Proxy (Port 8000)
Python FastAPI Microservice
        │
┌───────┴───────────────────────────────────────────────────────┐
│ MULTI-AGENT SUPERVISOR                                        │
│  ├── 1. Intent Classification & Entity Resolution             │
│  ├── 2. Selective Specialist Routing Plan                     │
│  ├── 3. Specialist Execution Topology:                        │
│  │     ├── Receivables Intelligence Graph                    │
│  │     ├── Promise-to-Pay (P2P) Intelligence Graph           │
│  │     └── Reconciliation Intelligence Graph                 │
│  ├── 4. Cross-Agent Synthesis & Conflict Engine               │
│  └── 5. Final Safety Policy Precedence Gate                   │
└───────┬───────────────────────────────────────────────────────┘
        │
        ├──► Supabase PostgreSQL (Authoritative Financial Source of Truth)
        ├──► Gemini 3.6 Flash (Structured Operational Reasoning)
        ├──► Policy Engine (Deterministic Safety Guardrails)
        └──► Telemetry & Traceability (agent_runs, agent_decisions, audit_logs)
```

---

## 2. Implemented Platform Architecture

### Multi-Agent Supervisor (Phase 6)
- **Business Purpose**: Central orchestrator providing unified entry point for queries, selecting specialists deterministically, cross-synthesizing insights, and enforcing cross-agent safety policy.
- **Workflow**: `UNDERSTAND_REQUEST` → `RESOLVE_ENTITIES` → `CREATE_EXECUTION_PLAN` → `RUN_SPECIALISTS` → `COLLECT_RESULTS` → `CHECK_CONFLICTS` → `SYNTHESIZE` → `FINAL_POLICY_GATE` → `AUDIT`.
- **API Endpoint**: `POST /api/agents/supervisor/run`.

### Specialist Agent 1: Receivables Intelligence Agent (Phase 3)
- **Business Purpose**: Evaluates individual invoices within customer account context to determine collection priority and urgency.
- **API Endpoint**: `POST /api/agents/receivables/run` & `POST /api/agents/receivables/rank`.

### Specialist Agent 2: Promise-to-Pay (P2P) Intelligence Agent (Phase 4)
- **Business Purpose**: Answers whether a customer fulfilled their commitment, calculates customer commitment reliability (`HIGH`, `MEDIUM`, `LOW`, `CRITICAL`), and recommends next-step collection actions.
- **API Endpoint**: `POST /api/agents/promises/run`.

### Specialist Agent 3: Reconciliation Intelligence Agent (Phase 5 & 5.5)
- **Business Purpose**: Hardened with 4-level evidence hierarchy, 0-100 evidence quality score, and 4 conflict detection rules to evaluate payment discrepancies (`TDS`, `MDR`, `GST`, `PARTIAL_PAYMENT`, `REFUND`, `WRONG_INVOICE`, `DUPLICATE_PAYMENT`, `UNALLOCATED_PAYMENT`, `UNKNOWN`).
- **API Endpoint**: `POST /api/agents/reconciliation/run`.

---

## 3. Strict Non-Negotiable Financial Data Architecture

1. **Supabase PostgreSQL is the sole financial source of truth.**
2. **The LLM (Gemini 3.6 Flash) NEVER determines financial truth.**
3. **Deterministic Safety Policy Engine**: Enforces safety guardrails across specialist outputs and supervisor synthesis.
4. **Execution Audit**: Every run writes immutable telemetry to `agent_runs`, `agent_decisions`, and `audit_logs`.
