# Financial Case File Investigation Workspace — Architecture & Specification

This document outlines the architecture, routing, data sources, and component layout for the **Financial Case File Investigation Workspace** within the **AI Revenue Recovery & Receivables Intelligence** platform.

---

## 1. Page Purpose

The **Financial Case File** provides finance operators and collectors with an in-depth, production-quality investigation workspace for any specific invoice or customer account. It unifies ground-truth ledger facts from Supabase PostgreSQL with agentic insights from all three specialist graphs (**Receivables Intelligence**, **Promise-to-Pay**, and **Reconciliation**) and the **Multi-Agent Supervisor**.

---

## 2. Target Routing Architecture

```
ASSISTANT / RECEIVABLES QUEUE
            │
            ▼ (Click "Inspect Case")
  /invoices/[id]  OR  /invoices?id=[identifier]
            │
            ▼
    [DYNAMIC ROUTE RESOLVER]
   Supports UUIDs (20a9bb94-...) & Invoice Numbers (INV-SYNTH-10002, INV-1002)
            │
            ▼
[FINANCIAL CASE FILE INVESTIGATION WORKSPACE]
```

### Supported Routes & Deep-Links
- `/invoices/INV-SYNTH-10002` (Direct Invoice Number route)
- `/invoices/20a9bb94-56fa-4a44-a89b-db3e3791f7df` (Direct Invoice UUID route)
- `/invoices?id=INV-SYNTH-10002` (Query Parameter search route)

---

## 3. Workspace Layout & 22 Core Sections

1. **Case Header**: Invoice Number, Customer Name, Status Badge, Priority Badge, Policy Status, Outstanding Balance (₹), Due Date, Days Overdue.
2. **Financial Summary Cards**: Invoice Amount, Amount Paid, Outstanding, Due Date, Days Overdue (`LIVE DATABASE` / `DETERMINISTIC ANALYSIS`).
3. **Receivables Intelligence**: Baseline Score, AI Priority, Confidence, Evidence Summary, Recommended Collection Action.
4. **Customer Context**: Profile summary, Paid/Overdue ratio, Average Payment Delay, Commitment Reliability (`HIGH`/`MEDIUM`/`LOW`/`CRITICAL`), link to Open Customer Profile.
5. **Promise Intelligence**: Current promise status vs Customer historical reliability (separated visually).
6. **Payment & Reconciliation**: Allocated payments, open reconciliation exceptions (TDS, Partial, etc.), AI hypothesis, confidence, evidence.
7. **Communication Evidence**: Inbound/outbound timeline tagged as supporting evidence.
8. **Multi-Agent Assessment & Supervisor Synthesis**: Specialist panels (Receivables, P2P, Reconciliation) + Supervisor synthesis + **Cross-Agent Conflict Banner** (explaining why `HUMAN_REVIEW` is required).
9. **Policy Guardrail**: Decision (`APPROVED`/`HUMAN_REVIEW`/`REJECTED`), Rules Triggered, Reason, Safe Action.
10. **Next Best Action / Action Planner**: Proposed action type (`SEND_PAYMENT_REMINDER`, `REQUEST_TDS_DOCUMENT`, etc.), Priority, Approval requirement, execution status.
11. **Recovery Outcome**: Outstanding Before, Outstanding Current, Recovered Amount, Recovery Rate, Outcome Status (`NO_RECOVERY_OBSERVED` if ₹0).
12. **Case Audit Trail**: Timeline of agent runs, supervisor decisions, policy evaluations, and audit logs.

---

## 4. Performance & Safety Rules

- **Zero Automatic Agent Reruns**: Opening a Case File displays authoritative Supabase facts and cached intelligence. Specialist agents are **NOT** automatically executed on page load.
- **Independent Outcome Tracking**: Recovered revenue is calculated **exclusively** from authoritative Supabase payment allocation records ($\max(0, \text{Before} - \text{After})$).
- **Graceful Fallback**: Missing invoices render a styled application notification with a "Back to Receivables Queue" button instead of generic Next.js 404.
