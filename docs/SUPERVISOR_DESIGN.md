# Multi-Agent Supervisor — Design & Architecture Specification (Phase 6.1 Hardened)

## 1. Executive Overview & Mission

The **Multi-Agent Supervisor** is the central orchestrating intelligence for the **AI Revenue Recovery & Receivables Intelligence** platform. It coordinates three specialist agents:
1. **Receivables Intelligence Agent**
2. **Promise-to-Pay (P2P) Intelligence Agent**
3. **Reconciliation Intelligence Agent**

---

## 2. Hardened Core Architecture

```
USER QUERY / BUSINESS EVENT
            │
            ▼
┌──────────────────────────────────────────────────────────┐
│ MULTI-AGENT SUPERVISOR                                   │
│  1. UNDERSTAND_REQUEST (Intent Classification)           │
│  2. RESOLVE_ENTITIES (Supabase Existence Check)          │
│  3. CREATE_EXECUTION_PLAN & MINIMIZATION                 │
│  4. RUN_SPECIALISTS (Selective Routing)                  │
│  5. COLLECT_RESULTS & CHECK_CONFLICTS                    │
│  6. SYNTHESIZE (Executive Summary & Cross-Domain)       │
│  7. FINAL_POLICY_GATE (Safety Policy Precedence)         │
│  8. AUDIT (Immutable Telemetry)                          │
└──────────────────────────────────────────────────────────┘
            │
            ▼
UNIFIED RESPONSE & POLICY DECISION
```

---

## 3. Key Hardening Principles (Phase 6.1)

1. **Authoritative Existence Validation (`NOT_FOUND` Safety)**:
   - When a query references an explicit entity (e.g. invoice `INV-999999`, customer `CUST-999999`, promise `PROMISE-999999`, or exception `00000000-0000-0000-0000-000000000000`), the Supervisor queries Supabase PostgreSQL.
   - If 0 rows exist, execution halts immediately: `intent = "NOT_FOUND"`, `success = false`, `selectedAgents = []`. No specialist reasoning is run and zero fake financial facts are generated.

2. **Ambiguous Query Clarification Safety**:
   - Vague questions (e.g. *"What should I do today?"*) do NOT silently default to Receivables.
   - The Supervisor sets `intent = "UNKNOWN"`, `selectedAgents = []`, and prompts the user with structured choices (*"Do you want a portfolio priority summary, customer promise review, or payment reconciliation investigation?"*).

3. **Reconciliation Exception Routing**:
   - Queries specifying an exception UUID or Form 16A claim route to `RECONCILIATION`.

4. **Multi-Domain Request Selection**:
   - Queries requesting risk score and TDS withholding select both `RECEIVABLES` and `RECONCILIATION` specialists.

5. **Cross-Agent Conflict Gate**:
   - Contradictory specialist outputs automatically trigger `hasConflict = True` and route to `HUMAN_REVIEW`.

6. **Safety Policy Precedence**:
   - Unsafe balance write-off attempts are strictly `REJECTED`.
