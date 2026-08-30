# REST API Specification — AI Revenue Recovery & Receivables Intelligence

Base URL: `http://localhost:5000/api`

---

## 1. System Health

### `GET /api/health/database`
Verifies connection to remote Supabase PostgreSQL database, table presence, and row count verification.

**Response (200 OK):**
```json
{
  "connected": true,
  "tablesVerified": true,
  "tableCounts": {
    "businesses": 5,
    "customers": 25,
    "invoices": 70,
    "payments": 22,
    "payment_allocations": 18,
    "communications": 70,
    "promises": 29,
    "reconciliation_exceptions": 6,
    "agent_runs": 0,
    "agent_decisions": 0,
    "actions": 0,
    "policy_decisions": 0,
    "audit_logs": 0
  }
}
```

---

## 2. Dashboard & Core Entities

### `GET /api/dashboard/summary`
Returns top-level accounts receivable KPIs and aggregate numbers.

**Response (200 OK):**
```json
{
  "revenueAtRisk": 42500.00,
  "outstandingAmount": 128500.00,
  "overdueInvoiceCount": 18,
  "activePromiseCount": 12,
  "openExceptionCount": 4,
  "customerCount": 25
}
```

### `GET /api/businesses`
Returns list of onboarded merchant businesses.

### `GET /api/customers`
Returns list of customer accounts.

---

## 3. Invoices & Relational Records

### `GET /api/invoices`
Returns all receivables prioritized by days overdue and risk, queried directly from `invoice_working_view`.

**Response (200 OK):**
```json
[
  {
    "id": "inv_101",
    "business_id": "bus_1",
    "customer_id": "cust_1",
    "customer_name": "Acme Corp",
    "customer_email": "billing@acme.com",
    "invoice_number": "INV-2024-001",
    "amount": 5000.00,
    "paid_amount": 1000.00,
    "outstanding_amount": 4000.00,
    "due_date": "2024-07-15",
    "days_overdue": 44,
    "status": "overdue",
    "priority": "HIGH"
  }
]
```

### `GET /api/invoices/:id`
Returns single invoice detail joined with customer metadata.

### `GET /api/invoices/:id/payments`
Returns payment allocations for the specified invoice.

### `GET /api/invoices/:id/promises`
Returns payment promises made by the customer for the specified invoice.

### `GET /api/invoices/:id/communications`
Returns communication history (emails, calls, notes) for the invoice/customer.

### `GET /api/invoices/:id/exceptions`
Returns reconciliation mismatches and exceptions for the specified invoice.

---

## 4. Agent Stub Interface

### `POST /api/agent/query`
Chatbot query stub interface (Phase 1 placeholder).

**Request Body:**
```json
{
  "query": "Which invoices need attention today?"
}
```

**Response (200 OK):**
```json
{
  "status": "placeholder",
  "message": "AI Specialist Agents are intentionally not implemented in Phase 1 (Foundation Setup). LangGraph Orchestrator & Specialist Agents will be integrated in Phase 2+.",
  "query": "Which invoices need attention today?",
  "timestamp": "2026-08-28T11:00:00.000Z",
  "agent": "Receivables Intelligence System (Shell)"
}
```
