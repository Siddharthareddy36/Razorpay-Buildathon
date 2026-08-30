# Database Schema & Entity Documentation

This document describes the 13 core database tables and 1 dynamic view in the Supabase PostgreSQL database.

> [!WARNING]
> **Source-of-Truth Rule**: The live Supabase PostgreSQL database is the single authoritative source of truth. Repository SQL files under `database/` serve as version-controlled reference/documentation and MUST NEVER override or drop the live database schema.

---

## 1. Audit & Consistency Report
For a complete table-by-table schema alignment report and foreign key matrix, see [docs/DATABASE_AUDIT.md](file:///c:/Razorpay-Project/docs/DATABASE_AUDIT.md).

---

## 2. Schema Tables Specification

| Table Name | Description | Key Fields |
|---|---|---|
| `businesses` | Onboarded merchant business entity | `id`, `name`, `email` |
| `customers` | Merchant customer accounts & risk scores | `id`, `business_id`, `name`, `credit_limit`, `risk_score` |
| `invoices` | Accounts receivable invoice records | `id`, `business_id`, `customer_id`, `amount`, `paid_amount`, `due_date`, `status` |
| `payments` | Customer payment receipts | `id`, `business_id`, `customer_id`, `amount`, `payment_method`, `payment_date` |
| `payment_allocations` | Allocation of payment to specific invoice | `id`, `payment_id`, `invoice_id`, `allocated_amount` |
| `communications` | Inbound & outbound customer interaction logs | `id`, `customer_id`, `invoice_id`, `channel`, `summary`, `timestamp` |
| `promises` | Customer commitments to pay specific amount by date | `id`, `customer_id`, `invoice_id`, `promised_amount`, `promised_date`, `status` |
| `reconciliation_exceptions` | Payment mismatches & short pays | `id`, `invoice_id`, `payment_id`, `expected_amount`, `received_amount`, `discrepancy_amount`, `status` |
| `agent_runs` | Execution trace of AI Agent runs | `id`, `agent_name`, `status`, `started_at` |
| `agent_decisions` | Reasoning & outputs from specialist agents | `id`, `agent_run_id`, `decision_type`, `reasoning`, `confidence_score` |
| `actions` | Action payloads triggered by agents | `id`, `agent_decision_id`, `action_type`, `target_id`, `status` |
| `policy_decisions` | Policy guardrail evaluation records | `id`, `action_id`, `policy_name`, `allowed`, `violation_reason` |
| `audit_logs` | Immutable audit trail for financial actions | `id`, `entity_type`, `entity_id`, `action`, `performed_by`, `timestamp` |

---

## 3. Dynamic Working View

### `invoice_working_view`
A dynamic database view computing current outstanding balances, real-time `days_overdue`, priority scoring, and active promise count for each invoice.

---

## 4. Entity Relationships (Foreign Keys)

```
businesses (id)
  ├── customers (business_id)
  ├── invoices (business_id)
  └── payments (business_id)

customers (id)
  ├── invoices (customer_id)
  ├── payments (customer_id)
  ├── communications (customer_id)
  └── promises (customer_id)

invoices (id)
  ├── payment_allocations (invoice_id)
  ├── communications (invoice_id)
  ├── promises (invoice_id)
  └── reconciliation_exceptions (invoice_id)

payments (id)
  ├── payment_allocations (payment_id)
  └── reconciliation_exceptions (payment_id)

agent_runs (id)
  └── agent_decisions (agent_run_id)

agent_decisions (id)
  └── actions (agent_decision_id)

actions (id)
  └── policy_decisions (action_id)
```
