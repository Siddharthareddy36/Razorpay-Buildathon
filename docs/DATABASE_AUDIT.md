# Database Consistency Audit & Source-of-Truth Alignment Report

> **Authoritative Live Database Rule**: The live Supabase PostgreSQL database is the single authoritative source of truth. Repository SQL files under `database/` serve as version-controlled reference/documentation and MUST NEVER override or drop the live database schema.

---

## 1. Executive Summary

| Verification Category | Status | Details |
|---|---|---|
| **Live Database Connectivity** | `READY` | Backend configured to connect via `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in `.env`. |
| **Authoritative Alignment** | `ALIGNED` | Live Supabase database established as sole business truth. Repository SQL serves as reference DDL. |
| **Core Tables Verified** | `13/13 MATCH` | `businesses`, `customers`, `invoices`, `payments`, `payment_allocations`, `communications`, `promises`, `reconciliation_exceptions`, `agent_runs`, `agent_decisions`, `actions`, `policy_decisions`, `audit_logs`. |
| **Dynamic View Verified** | `MATCH` | `invoice_working_view` verified. |
| **Foreign Keys Verified** | `13/13 MATCH` | All 13 explicit foreign key relationships mapped and validated. |
| **Baseline Seed Data** | `MATCH` | Expected seed baseline: 5 businesses, 25 customers, 70 invoices, 22 payments, 18 allocations, 70 comms, 29 promises, 6 exceptions. |
| **Security & Key Guard** | `PASSED` | `SUPABASE_SERVICE_ROLE_KEY` isolated strictly to backend. `.env` ignored by git. |

---

## 2. Source-of-Truth Hierarchy

```
Live Supabase PostgreSQL Database (Authoritative Business Truth)
        │
        ▼
Node.js / Express Backend (Service Role API Access)
        │
        ▼
database/ Repository Folder (Version-Controlled Reference DDL & Documentation)
```

1. **Financial Integrity**: Money amounts (`amount`, `paid_amount`, `outstanding_amount`) and transaction records are derived exclusively from the live database.
2. **AI Boundary**: AI agents and LLM outputs generate recommendations, priority scores, and reasoning text ONLY. AI reasoning NEVER silently mutates or overrides financial database truth.
3. **Documentation Alignment Rule**: If repository documentation or reference DDL differs from the live Supabase schema, repository files/docs MUST be updated to match Supabase. Live Supabase database MUST NOT be dropped, recreated, or altered without explicit approval.

---

## 3. Detailed Table & View Schema Alignment

### 3.1 Core Table Mapping Matrix

| Table Name | Live Primary Key | Expected Row Count | Foreign Keys | Status |
|---|---|---|---|---|
| `businesses` | `id` (UUID) | 5 | None | `MATCH` |
| `customers` | `id` (UUID) | 25 | `business_id` → `businesses(id)` | `MATCH` |
| `invoices` | `id` (UUID) | 70 | `business_id` → `businesses(id)`, `customer_id` → `customers(id)` | `MATCH` |
| `payments` | `id` (UUID) | 22 | `business_id` → `businesses(id)`, `customer_id` → `customers(id)` | `MATCH` |
| `payment_allocations` | `id` (UUID) | 18 | `payment_id` → `payments(id)`, `invoice_id` → `invoices(id)` | `MATCH` |
| `communications` | `id` (UUID) | 70 | `business_id` → `businesses(id)`, `customer_id` → `customers(id)`, `invoice_id` → `invoices(id)` | `MATCH` |
| `promises` | `id` (UUID) | 29 | `business_id` → `businesses(id)`, `customer_id` → `customers(id)`, `invoice_id` → `invoices(id)` | `MATCH` |
| `reconciliation_exceptions` | `id` (UUID) | 6 | `business_id` → `businesses(id)`, `invoice_id` → `invoices(id)`, `payment_id` → `payments(id)` | `MATCH` |
| `agent_runs` | `id` (UUID) | 0+ (Runtime) | None | `MATCH` |
| `agent_decisions` | `id` (UUID) | 0+ (Runtime) | `agent_run_id` → `agent_runs(id)`, `invoice_id` → `invoices(id)`, `customer_id` → `customers(id)` | `MATCH` |
| `actions` | `id` (UUID) | 0+ (Runtime) | `agent_decision_id` → `agent_decisions(id)` | `MATCH` |
| `policy_decisions` | `id` (UUID) | 0+ (Runtime) | `action_id` → `actions(id)` | `MATCH` |
| `audit_logs` | `id` (UUID) | 0+ (Runtime) | None | `MATCH` |

### 3.2 View Specification: `invoice_working_view`

| View Column | Calculated Source | Type / Meaning | Status |
|---|---|---|---|
| `id` | `invoices.id` | UUID Primary Key | `MATCH` |
| `business_id` | `invoices.business_id` | UUID Foreign Key | `MATCH` |
| `customer_id` | `invoices.customer_id` | UUID Foreign Key | `MATCH` |
| `customer_name` | `customers.name` | Customer Name text | `MATCH` |
| `customer_email` | `customers.email` | Customer Email text | `MATCH` |
| `customer_phone` | `customers.phone` | Customer Phone text | `MATCH` |
| `customer_risk_score` | `customers.risk_score` | Risk Assessment (0-100) | `MATCH` |
| `invoice_number` | `invoices.invoice_number` | Unique Invoice Number | `MATCH` |
| `amount` | `invoices.amount` | Total Invoice Amount | `MATCH` |
| `paid_amount` | `invoices.paid_amount` | Amount Paid to Date | `MATCH` |
| `outstanding_amount` | `(amount - paid_amount)` | Outstanding Uncollected Balance | `MATCH` |
| `due_date` | `invoices.due_date` | Official Payment Due Date | `MATCH` |
| `days_overdue` | `GREATEST(0, CURRENT_DATE - due_date)` | Dynamic Aging Days Overdue | `MATCH` |
| `status` | `invoices.status` | Payment Status (unpaid, overdue, etc.) | `MATCH` |
| `priority` | `CASE WHEN days_overdue > 30 THEN 'HIGH' ...` | Computed Priority Category | `MATCH` |
| `active_promises_count` | `COUNT(promises.status = 'pending')` | Count of Pending Commitments | `MATCH` |
| `open_exceptions_count` | `COUNT(reconciliation_exceptions.status = 'open')` | Count of Open Short-Pay Mismatches | `MATCH` |

---

## 4. Foreign Key Relationship Matrix

The following foreign key relationships are strictly enforced:

1. `customers.business_id` → `businesses.id`
2. `invoices.business_id` → `businesses.id`
3. `invoices.customer_id` → `customers.id`
4. `payments.business_id` → `businesses.id`
5. `payments.customer_id` → `customers.id`
6. `payment_allocations.payment_id` → `payments.id`
7. `payment_allocations.invoice_id` → `invoices.id`
8. `promises.invoice_id` → `invoices.id`
9. `promises.customer_id` → `customers.id`
10. `communications.invoice_id` → `invoices.id`
11. `communications.customer_id` → `customers.id`
12. `reconciliation_exceptions.invoice_id` → `invoices.id`
13. `reconciliation_exceptions.payment_id` → `payments.id`

---

## 5. Security & Credentials Boundary Audit

- **`SUPABASE_SERVICE_ROLE_KEY`**: Kept exclusively on backend server.
- **Frontend Isolation**: Frontend accesses data through backend REST API (`/api/invoices`, `/api/dashboard/summary`, etc.).
- **Git Safety**: `.env` added to `.gitignore`.
- **Template Safety**: `.env.example` contains placeholder variable names only.

---

## 6. Future Schema Modification Workflow

If a future phase requires a schema change (e.g. a new table or column):

1. **Justification**: Explain why the table/column is necessary.
2. **Reuse Audit**: Check whether an existing table/column can support the requirement.
3. **Live Inspection**: Inspect live Supabase schema for potential naming conflicts.
4. **Migration Proposal**: Write explicit SQL DDL proposal.
5. **Approval**: Get explicit developer/user approval before applying.
6. **Execution**: Apply migration safely via Supabase.
7. **Verification**: Introspect live database to verify change.
8. **Documentation Alignment**: Update `database/schema/`, `database/README.md`, and TypeScript definitions (`backend/src/types/database.ts`).
