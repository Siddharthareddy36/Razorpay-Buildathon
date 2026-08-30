# Synthetic Evaluation Dataset Expansion Plan

> [!IMPORTANT]
> **INSPECTION & PLANNING REPORT ONLY**: This document specifies the complete, non-destructive synthetic evaluation dataset expansion plan for **AI Revenue Recovery & Receivables Intelligence**.
> 
> - **NO SCHEMA ALTERATIONS**: The exact production schema in [`database/schema/01_tables.sql`](file:///c:/Razorpay-Project/database/schema/01_tables.sql) is used without modifications.
> - **NO PRODUCTION SEED MODIFICATION**: Existing production/demo seed records in [`database/seeds/01_seed_data.sql`](file:///c:/Razorpay-Project/database/seeds/01_seed_data.sql) remain completely untouched and unchanged.
> - **NO IMMEDIATE INSERTS**: No SQL `INSERT` statements are executed during this phase.

---

## 1. CURRENT DATASET

### Overview of Baseline Seed Counts
Based on [`database/README.md`](file:///c:/Razorpay-Project/database/README.md) and [`database/seeds/01_seed_data.sql`](file:///c:/Razorpay-Project/database/seeds/01_seed_data.sql):

| Table Name | Baseline Record Count | Description |
|---|---|---|
| `businesses` | ~5 | Onboarded merchant accounts |
| `customers` | ~25 | Customer profiles & credit/risk metadata |
| `invoices` | ~70 | Receivable invoices with amounts & statuses |
| `payments` | ~22 | Gateway & bank payment receipts |
| `payment_allocations` | ~18 | Allocation maps tying payments to invoices |
| `communications` | ~70 | Inbound/outbound call logs, emails, & messages |
| `promises` | ~29 | Customer commitments to pay (P2P) |
| `reconciliation_exceptions` | ~6 | Payment discrepancy & deduction records |

---

### Detailed Inspection of Required Tables

#### 1. Table: `customers`
- **Columns**:
  - `id` (UUID, PK, Default: `gen_random_uuid()`)
  - `business_id` (UUID, NOT NULL, FK → `businesses.id` ON DELETE CASCADE)
  - `name` (VARCHAR(255), NOT NULL)
  - `email` (VARCHAR(255), Nullable)
  - `phone` (VARCHAR(50), Nullable)
  - `credit_limit` (NUMERIC(15, 2), Default: `0.00`)
  - `risk_score` (INTEGER, Default: `50`, range 0-100)
  - `created_at` (TIMESTAMP WITH TIME ZONE, Default: `NOW()`)
- **Primary Key**: `id`
- **Foreign Keys**: `business_id` → `businesses(id)` ON DELETE CASCADE
- **Relationships**:
  - Belongs to 1 `business`
  - Has many `invoices`
  - Has many `payments`
  - Has many `promises`
  - Has many `communications`
- **Required / Non-null Fields**: `id`, `business_id`, `name`
- **Enum / Status / Range Values**: `risk_score` integer range `0` (lowest risk) to `100` (highest risk)
- **Indexes**: Primary key index on `id`
- **Existing Seed Record Count**: ~25 (3 explicitly seeded in `01_seed_data.sql`)
- **Example Record Structure**:
  ```json
  {
    "id": "c0000000-0000-0000-0000-000000000001",
    "business_id": "b0000000-0000-0000-0000-000000000001",
    "name": "Acme India Enterprises",
    "email": "ap@acmeindia.com",
    "phone": "+91 98765 43210",
    "credit_limit": 5000000.00,
    "risk_score": 75,
    "created_at": "2026-08-01T00:00:00Z"
  }
  ```

---

#### 2. Table: `invoices`
- **Columns**:
  - `id` (UUID, PK, Default: `gen_random_uuid()`)
  - `business_id` (UUID, NOT NULL, FK → `businesses.id` ON DELETE CASCADE)
  - `customer_id` (UUID, NOT NULL, FK → `customers.id` ON DELETE CASCADE)
  - `invoice_number` (VARCHAR(100), NOT NULL, UNIQUE)
  - `amount` (NUMERIC(15, 2), NOT NULL)
  - `paid_amount` (NUMERIC(15, 2), Default: `0.00`)
  - `due_date` (DATE, NOT NULL)
  - `status` (VARCHAR(50), NOT NULL, Default: `'unpaid'`)
  - `created_at` (TIMESTAMP WITH TIME ZONE, Default: `NOW()`)
  - `updated_at` (TIMESTAMP WITH TIME ZONE, Default: `NOW()`)
- **Primary Key**: `id`
- **Foreign Keys**:
  - `business_id` → `businesses(id)` ON DELETE CASCADE
  - `customer_id` → `customers(id)` ON DELETE CASCADE
- **Relationships**:
  - Belongs to 1 `business` and 1 `customer`
  - Has many `payment_allocations`
  - Has many `promises`
  - Has many `communications`
  - Has many `reconciliation_exceptions`
- **Required / Non-null Fields**: `id`, `business_id`, `customer_id`, `invoice_number`, `amount`, `due_date`, `status`
- **Enum / Status Values**: `'unpaid'`, `'partially_paid'`, `'paid'`, `'overdue'`
- **Indexes**: Primary key index on `id`, Unique constraint index on `invoice_number`
- **Existing Seed Record Count**: ~70
- **Example Record Structure**:
  ```json
  {
    "id": "i0000000-0000-0000-0000-000000000001",
    "business_id": "b0000000-0000-0000-0000-000000000001",
    "customer_id": "c0000000-0000-0000-0000-000000000001",
    "invoice_number": "INV-2024-001",
    "amount": 1250000.00,
    "paid_amount": 0.00,
    "due_date": "2026-07-15",
    "status": "overdue",
    "created_at": "2026-06-15T00:00:00Z",
    "updated_at": "2026-07-16T00:00:00Z"
  }
  ```

---

#### 3. Table: `payments`
- **Columns**:
  - `id` (UUID, PK, Default: `gen_random_uuid()`)
  - `business_id` (UUID, NOT NULL, FK → `businesses.id` ON DELETE CASCADE)
  - `customer_id` (UUID, NOT NULL, FK → `customers.id` ON DELETE CASCADE)
  - `amount` (NUMERIC(15, 2), NOT NULL)
  - `payment_method` (VARCHAR(100), Default: `'Bank Transfer'`)
  - `reference_number` (VARCHAR(100), Nullable)
  - `payment_date` (TIMESTAMP WITH TIME ZONE, NOT NULL)
  - `status` (VARCHAR(50), Default: `'completed'`)
  - `created_at` (TIMESTAMP WITH TIME ZONE, Default: `NOW()`)
- **Primary Key**: `id`
- **Foreign Keys**:
  - `business_id` → `businesses(id)` ON DELETE CASCADE
  - `customer_id` → `customers(id)` ON DELETE CASCADE
- **Relationships**:
  - Belongs to 1 `business` and 1 `customer`
  - Has many `payment_allocations`
  - Referenced by `reconciliation_exceptions`
- **Required / Non-null Fields**: `id`, `business_id`, `customer_id`, `amount`, `payment_date`
- **Enum / Status Values**:
  - `payment_method`: `'Bank Transfer'`, `'NEFT'`, `'RTGS'`, `'UPI'`, `'Credit Card'`, `'Cheque'`
  - `status`: `'completed'`, `'pending'`, `'failed'`, `'refunded'`
- **Indexes**: Primary key index on `id`
- **Existing Seed Record Count**: ~22
- **Example Record Structure**:
  ```json
  {
    "id": "p0000000-0000-0000-0000-000000000001",
    "business_id": "b0000000-0000-0000-0000-000000000001",
    "customer_id": "c0000000-0000-0000-0000-000000000001",
    "amount": 1125000.00,
    "payment_method": "Bank Transfer",
    "reference_number": "UTR-NEFT-99881122",
    "payment_date": "2026-08-10T14:30:00Z",
    "status": "completed",
    "created_at": "2026-08-10T14:30:00Z"
  }
  ```

---

#### 4. Table: `promises` (Promise-to-Pay)
- **Columns**:
  - `id` (UUID, PK, Default: `gen_random_uuid()`)
  - `business_id` (UUID, Nullable, FK → `businesses.id` ON DELETE CASCADE)
  - `customer_id` (UUID, NOT NULL, FK → `customers.id` ON DELETE CASCADE)
  - `invoice_id` (UUID, NOT NULL, FK → `invoices.id` ON DELETE CASCADE)
  - `promised_amount` (NUMERIC(15, 2), NOT NULL)
  - `promised_date` (DATE, NOT NULL)
  - `status` (VARCHAR(50), NOT NULL, Default: `'pending'`)
  - `created_at` (TIMESTAMP WITH TIME ZONE, Default: `NOW()`)
- **Primary Key**: `id`
- **Foreign Keys**:
  - `business_id` → `businesses(id)` ON DELETE CASCADE
  - `customer_id` → `customers(id)` ON DELETE CASCADE
  - `invoice_id` → `invoices(id)` ON DELETE CASCADE
- **Relationships**:
  - Belongs to 1 `customer` and 1 `invoice` (and optionally 1 `business`)
- **Required / Non-null Fields**: `id`, `customer_id`, `invoice_id`, `promised_amount`, `promised_date`, `status`
- **Enum / Status Values**: `'pending'`, `'fulfilled'`, `'broken'`
- **Indexes**: Primary key index on `id`
- **Existing Seed Record Count**: ~29
- **Example Record Structure**:
  ```json
  {
    "id": "pr000000-0000-0000-0000-000000000001",
    "business_id": "b0000000-0000-0000-0000-000000000001",
    "customer_id": "c0000000-0000-0000-0000-000000000001",
    "invoice_id": "i0000000-0000-0000-0000-000000000001",
    "promised_amount": 1250000.00,
    "promised_date": "2026-08-20",
    "status": "broken",
    "created_at": "2026-07-20T10:00:00Z"
  }
  ```

---

#### 5. Table: `communications`
- **Columns**:
  - `id` (UUID, PK, Default: `gen_random_uuid()`)
  - `business_id` (UUID, Nullable, FK → `businesses.id` ON DELETE CASCADE)
  - `customer_id` (UUID, NOT NULL, FK → `customers.id` ON DELETE CASCADE)
  - `invoice_id` (UUID, Nullable, FK → `invoices.id` ON DELETE CASCADE)
  - `channel` (VARCHAR(50), NOT NULL)
  - `direction` (VARCHAR(20), NOT NULL)
  - `summary` (TEXT, NOT NULL)
  - `sentiment` (VARCHAR(50), Nullable)
  - `timestamp` (TIMESTAMP WITH TIME ZONE, NOT NULL, Default: `NOW()`)
  - `created_at` (TIMESTAMP WITH TIME ZONE, Default: `NOW()`)
- **Primary Key**: `id`
- **Foreign Keys**:
  - `business_id` → `businesses(id)` ON DELETE CASCADE
  - `customer_id` → `customers(id)` ON DELETE CASCADE
  - `invoice_id` → `invoices(id)` ON DELETE CASCADE
- **Relationships**:
  - Belongs to 1 `customer`, optionally linked to 1 `invoice` and 1 `business`
- **Required / Non-null Fields**: `id`, `customer_id`, `channel`, `direction`, `summary`, `timestamp`
- **Enum / Status Values**:
  - `channel`: `'email'`, `'call'`, `'sms'`, `'portal'`
  - `direction`: `'inbound'`, `'outbound'`
  - `sentiment`: `'positive'`, `'neutral'`, `'negative'`, `'cooperative'`, `'disputing'`
- **Indexes**: Primary key index on `id`
- **Existing Seed Record Count**: ~70
- **Example Record Structure**:
  ```json
  {
    "id": "cm000000-0000-0000-0000-000000000001",
    "business_id": "b0000000-0000-0000-0000-000000000001",
    "customer_id": "c0000000-0000-0000-0000-000000000001",
    "invoice_id": "i0000000-0000-0000-0000-000000000001",
    "channel": "call",
    "direction": "outbound",
    "summary": "Followed up on INV-2024-001. Customer promised payment by Aug 20.",
    "sentiment": "cooperative",
    "timestamp": "2026-07-20T09:45:00Z",
    "created_at": "2026-07-20T09:45:00Z"
  }
  ```

---

#### 6. Table: `reconciliation_exceptions`
- **Columns**:
  - `id` (UUID, PK, Default: `gen_random_uuid()`)
  - `business_id` (UUID, Nullable, FK → `businesses.id` ON DELETE CASCADE)
  - `invoice_id` (UUID, NOT NULL, FK → `invoices.id` ON DELETE CASCADE)
  - `payment_id` (UUID, NOT NULL, FK → `payments.id` ON DELETE CASCADE)
  - `expected_amount` (NUMERIC(15, 2), NOT NULL)
  - `received_amount` (NUMERIC(15, 2), NOT NULL)
  - `discrepancy_amount` (NUMERIC(15, 2), NOT NULL)
  - `reason` (TEXT, Nullable)
  - `status` (VARCHAR(50), NOT NULL, Default: `'open'`)
  - `created_at` (TIMESTAMP WITH TIME ZONE, Default: `NOW()`)
- **Primary Key**: `id`
- **Foreign Keys**:
  - `business_id` → `businesses(id)` ON DELETE CASCADE
  - `invoice_id` → `invoices(id)` ON DELETE CASCADE
  - `payment_id` → `payments(id)` ON DELETE CASCADE
- **Relationships**:
  - Connects 1 `invoice` and 1 `payment` (and optionally 1 `business`)
- **Required / Non-null Fields**: `id`, `invoice_id`, `payment_id`, `expected_amount`, `received_amount`, `discrepancy_amount`, `status`
- **Enum / Status Values**: `'open'`, `'investigating'`, `'resolved'`
- **Indexes**: Primary key index on `id`
- **Existing Seed Record Count**: ~6
- **Example Record Structure**:
  ```json
  {
    "id": "rx000000-0000-0000-0000-000000000001",
    "business_id": "b0000000-0000-0000-0000-000000000001",
    "invoice_id": "i0000000-0000-0000-0000-000000000001",
    "payment_id": "p0000000-0000-0000-0000-000000000001",
    "expected_amount": 1250000.00,
    "received_amount": 1125000.00,
    "discrepancy_amount": 125000.00,
    "reason": "10% TDS deduction withheld by customer without Form 16A submission",
    "status": "open",
    "created_at": "2026-08-10T14:35:00Z"
  }
  ```

---

#### Supporting Table: `payment_allocations`
- **Columns**:
  - `id` (UUID, PK, Default: `gen_random_uuid()`)
  - `payment_id` (UUID, NOT NULL, FK → `payments.id` ON DELETE CASCADE)
  - `invoice_id` (UUID, NOT NULL, FK → `invoices.id` ON DELETE CASCADE)
  - `allocated_amount` (NUMERIC(15, 2), NOT NULL)
  - `allocated_at` (TIMESTAMP WITH TIME ZONE, Default: `NOW()`)
- **Primary Key**: `id`
- **Foreign Keys**:
  - `payment_id` → `payments(id)` ON DELETE CASCADE
  - `invoice_id` → `invoices(id)` ON DELETE CASCADE

---

## 2. SCHEMA RELATIONSHIPS

The authoritative relational graph across entities:

```
[ businesses ]
   │
   ├──< [ customers ]
   │       │
   │       ├──< [ invoices ]
   │       │       │
   │       │       ├──< [ payment_allocations ] >── [ payments ]
   │       │       │                                    │
   │       │       ├──< [ promises ]                    │
   │       │       │                                    │
   │       │       ├──< [ communications ]              │
   │       │       │                                    │
   │       │       └──< [ reconciliation_exceptions ] >─┘
   │       │
   │       └──< [ communications ]
   │
   └──< [ payments ]
```

### Exact Navigation Paths
1. **customer → invoices**:
   `customers.id` = `invoices.customer_id`
2. **invoice → payments**:
   Via `payment_allocations`: `invoices.id` = `payment_allocations.invoice_id` AND `payment_allocations.payment_id` = `payments.id`
   Direct exception mapping: `invoices.id` = `reconciliation_exceptions.invoice_id` AND `reconciliation_exceptions.payment_id` = `payments.id`
3. **invoice → promises**:
   `invoices.id` = `promises.invoice_id`
4. **invoice → communications**:
   `invoices.id` = `communications.invoice_id`
5. **invoice → reconciliation_exceptions**:
   `invoices.id` = `reconciliation_exceptions.invoice_id`

---

## 3. DATA GENERATION PATTERN

### Non-Destructive Distinguishable Strategy
To ensure synthetic evaluation records are **clearly distinguishable** from baseline demo seed records while preserving 100% schema compliance:

1. **UUID Allocation Strategy**:
   - Baseline seed records use static UUIDs starting with `b0000000-...`, `c0000000-...`, `i0000000-...`, `p0000000-...`, `pr000000-...`, `cm000000-...`, `rx000000-...`.
   - Expanded synthetic dataset will use dedicated synthetic namespace prefixes:
     - `businesses`: `b9000000-0000-4000-8000-xxxxxxxxxxxx`
     - `customers`: `c9000000-0000-4000-8000-xxxxxxxxxxxx`
     - `invoices`: `i9000000-0000-4000-8000-xxxxxxxxxxxx`
     - `payments`: `p9000000-0000-4000-8000-xxxxxxxxxxxx`
     - `payment_allocations`: `a9000000-0000-4000-8000-xxxxxxxxxxxx`
     - `promises`: `r9000000-0000-4000-8000-xxxxxxxxxxxx`
     - `communications`: `m9000000-0000-4000-8000-xxxxxxxxxxxx`
     - `reconciliation_exceptions`: `e9000000-0000-4000-8000-xxxxxxxxxxxx`

2. **Naming & Reference Conventions**:
   - **Invoices**: `INV-SYNTH-10001` through `INV-SYNTH-99999` (guarantees uniqueness against baseline `INV-2024-xxx`).
   - **Payments**: `PAY-SYNTH-10001` with reference numbers like `UTR-SYNTH-xxxxxxxx`.
   - **Customers**: Realistic corporate names prefixed/tagged for synthetic evaluation (e.g. `SynthTech Industries Ltd`, `Vertex Logistics India`).

3. **Multi-Invoice Customer Story Generation**:
   - Records are NOT generated randomly in isolation.
   - Each customer is assigned a **Behavioral Archetype** that dictates:
     - Number of historical invoices (3 to 15 per customer).
     - Payment promptness probability.
     - Promise fulfillment history.
     - Exception/dispute frequency.

---

## 4. CONSTRAINTS

### Inspected Database Schema Constraints
1. **Foreign Key Referential Integrity**:
   - All child tables enforce `ON DELETE CASCADE`.
   - Parent keys must exist prior to child insertion (`businesses` → `customers` → `invoices` → `payments` & `payment_allocations` / `promises` / `communications` / `reconciliation_exceptions`).
2. **Unique Constraints**:
   - `invoices.invoice_number` is globally `UNIQUE`.
3. **Data Type Boundaries & Precision**:
   - Monies (`credit_limit`, `amount`, `paid_amount`, `promised_amount`, `expected_amount`, `received_amount`, `discrepancy_amount`): `NUMERIC(15, 2)`.
   - Scores (`risk_score`): `INTEGER` between `0` and `100`.
   - Dates: `due_date` and `promised_date` are `DATE`. Timestamps are `TIMESTAMP WITH TIME ZONE`.

### Domain & Business Rules
1. **Mathematical Ledger Consistency**:
   - `invoices.paid_amount` MUST equal the SUM of all `allocated_amount` in `payment_allocations` for that invoice.
   - `invoices.status` MUST reflect arithmetic logic:
     - `paid_amount == 0` AND `due_date >= CURRENT_DATE` → `'unpaid'`
     - `paid_amount == 0` AND `due_date < CURRENT_DATE` → `'overdue'`
     - `0 < paid_amount < amount` → `'partially_paid'`
     - `paid_amount >= amount` → `'paid'`
2. **Reconciliation Exceptions Arithmetic**:
   - `discrepancy_amount = ABS(expected_amount - received_amount)`.
3. **Promise-to-Pay Integrity**:
   - `status = 'fulfilled'` requires matching `payment` and `payment_allocation` on or before `promised_date`.
   - `status = 'broken'` occurs when `CURRENT_DATE > promised_date` and `paid_amount < promised_amount`.

---

## 5. SYNTHETIC SCENARIO PLAN & CUSTOMER PROFILES

### Agent Scenario Coverage Matrix

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       AGENT TARGET SCENARIOS                                         │
├──────────────────────────────────────┬──────────────────────────────────┬────────────────────────────┤
│ 1. Receivables Intelligence Agent    │ 2. Promise-to-Pay (P2P) Agent    │ 3. Reconciliation Agent    │
├──────────────────────────────────────┼──────────────────────────────────┼────────────────────────────┤
│ • High Overdue (>30d, >₹10L)         │ • Active/Pending Commitments     │ • 10% TDS Deductions       │
│ • Severely Overdue (>60d, >90d)      │ • Fulfilled Commitments          │ • Short Payments (Dispute) │
│ • Low-Value Severely Overdue         │ • Repeated Broken Commitments    │ • Overpayments             │
│ • Recently Overdue (1-14d)           │ • Partial Promise Commitments    │ • Unmatched Float Payments │
│ • Future-Due Invoices                │ • Post-Broken Escalations        │ • Bank Charge Discrepancies│
│ • Deteriorating Customer Risk Scores │ • Broken Promise Sentiment Logs  │ • Resolved vs Open Exceptions│
└──────────────────────────────────────┴──────────────────────────────────┴────────────────────────────┘
```

### Customer Behavioral Archetypes

1. **Archetype A: Strong Payment History (Tier 1 Blue-Chip)**
   - *Risk Score*: 10 – 25
   - *Invoice History*: 80% Paid on time, 15% future due, 5% minor delay (<7 days). Zero broken promises, zero reconciliation exceptions.
2. **Archetype B: Deteriorating Payment Behavior (High Risk Escalation)**
   - *Risk Score*: 75 – 95
   - *Invoice History*: Historically paid on time 6 months ago, recently accumulated multiple overdue invoices (>30d, >60d), repeated broken promises, negative communication sentiment.
3. **Archetype C: TDS Withholding / Deduction Prone (Tax Compliant Enterprise)**
   - *Risk Score*: 30 – 50
   - *Invoice History*: Pays systematically at net 30/60, but consistently deducts 10% TDS under Section 194C/194J without providing immediate Form 16A certificates, triggering open `reconciliation_exceptions`.
4. **Archetype D: Disputed & Partial Payer (Operational Friction)**
   - *Risk Score*: 60 – 80
   - *Invoice History*: Frequent partial payments, short-pays due to line-item quantity disputes, active communication call logs disputing delivery receipts.

---

### Explicit Edge Case Coverage Plan

| Edge Case Scenario | Targeted Table(s) | Specific Data Setup in Expanded Synthetic Dataset | Targeted Agent |
|---|---|---|---|
| **Paid Invoice** | `invoices`, `payment_allocations` | `paid_amount = amount`, `status = 'paid'` | Receivables |
| **Future-Due Invoice** | `invoices` | `due_date = CURRENT_DATE + 30 days`, `status = 'unpaid'` | Receivables |
| **Recently Overdue** | `invoices` | `due_date = CURRENT_DATE - 7 days`, `status = 'overdue'` | Receivables |
| **Severely Overdue** | `invoices` | `due_date = CURRENT_DATE - 75 days`, `status = 'overdue'` | Receivables |
| **High-Value Overdue** | `invoices`, `customers` | `amount = ₹25,00,000`, `due_date = CURRENT_DATE - 45 days`, `risk_score = 85` | Receivables |
| **Low-Value Severely Overdue** | `invoices` | `amount = ₹15,000`, `due_date = CURRENT_DATE - 120 days` | Receivables |
| **Partial Payment** | `invoices`, `payments`, `payment_allocations` | `amount = ₹5,00,000`, `paid_amount = ₹2,00,000`, `status = 'partially_paid'` | Reconciliation / P2P |
| **Repeated Broken Promises** | `promises`, `communications` | 3 sequential `promises` with `status = 'broken'` on same `invoice_id` | Promise-to-Pay |
| **Fulfilled Promise** | `promises`, `payments` | `promised_date` matched by `payment_date` on time, `status = 'fulfilled'` | Promise-to-Pay |
| **Pending Promise** | `promises` | `promised_date = CURRENT_DATE + 5 days`, `status = 'pending'` | Promise-to-Pay |
| **Active Dispute** | `communications` | `direction = 'inbound'`, `sentiment = 'disputing'`, summary detailing damaged goods | Promise-to-Pay / Rec |
| **Short Payment (10% TDS)** | `reconciliation_exceptions`, `payments` | `expected = ₹10,00,000`, `received = ₹9,00,000`, `discrepancy = ₹1,00,000`, `reason = '10% TDS'` | Reconciliation |
| **Overpayment** | `reconciliation_exceptions`, `payments` | `expected = ₹50,000`, `received = ₹55,000`, `discrepancy = ₹5,000` | Reconciliation |
| **TDS / Deduction Mismatch** | `reconciliation_exceptions` | Exception with `status = 'open'` requiring Form 16A verification | Reconciliation |
| **Unmatched Payment / Float** | `payments` | `payment` record without any row in `payment_allocations` | Reconciliation |
| **Open Exception** | `reconciliation_exceptions` | `status = 'open'`, linked to active overdue invoice | Reconciliation |
| **Strong Customer History** | `customers`, `invoices` | Customer with 12 paid invoices, 0 overdue, `risk_score = 15` | Receivables |
| **Deteriorating Customer** | `customers`, `invoices`, `promises` | Customer with 5 paid (old), 4 overdue (recent), 2 broken promises, `risk_score = 90` | Receivables / P2P |

---

## 6. PROPOSED TARGET COUNTS

The proposed synthetic evaluation expansion will scale the dataset cleanly to meet and exceed all evaluation requirements:

| Entity / Table Name | Existing Baseline Seed Count | Proposed Synthetic Expansion Count | Total Target Count | Requested Requirement |
|---|---|---|---|---|
| **`businesses`** | 5 | 5 | **10** | Baseline anchor |
| **`customers`** | 25 | 275 | **300** | 200 – 500 |
| **`invoices`** | 70 | 1,130 | **1,200** | 1,000+ |
| **`payments`** | 22 | 2,178 | **2,200** | 2,000+ |
| **`payment_allocations`** | 18 | 1,982 | **2,000** | Supporting ledger |
| **`promises`** | 29 | 571 | **600** | 500+ |
| **`communications`** | 70 | 3,130 | **3,200** | 3,000+ |
| **`reconciliation_exceptions`** | 6 | 244 | **250** | 200+ |

---

## 7. INSERT ORDER (TOPOLOGICAL SEQUENCE)

To prevent foreign key constraint violations (`FK ON DELETE CASCADE`), the generation and insertion in Phase 2 MUST follow this exact 8-step topological hierarchy:

```
Step 1: businesses
  └── Step 2: customers
        └── Step 3: invoices
              ├── Step 4: payments
              │     └── Step 5: payment_allocations
              │     └── Step 8: reconciliation_exceptions (depends on invoices & payments)
              ├── Step 6: promises
              └── Step 7: communications
```

### Topological Execution Sequence
1. `businesses`: Create 5 new synthetic merchant accounts (`b9000000-...`).
2. `customers`: Create 275 synthetic customers linked to synthetic businesses (`c9000000-...`).
3. `invoices`: Create 1,130 synthetic invoices distributed across synthetic customers (`i9000000-...`).
4. `payments`: Create 2,178 synthetic payment receipts linked to businesses & customers (`p9000000-...`).
5. `payment_allocations`: Create 1,982 allocation records connecting payments to specific invoices (`a9000000-...`).
6. `promises`: Create 571 P2P records connected to invoices & customers (`r9000000-...`).
7. `communications`: Create 3,130 communication log entries (calls, emails, portal notes) (`m9000000-...`).
8. `reconciliation_exceptions`: Create 244 exception records linking specific invoices and short-paid payments (`e9000000-...`).

---

## 8. VALIDATION PLAN

Before any data generation script is executed in Phase 2, the following verification queries will be used to validate data safety, foreign key integrity, mathematical consistency, and scenario coverage:

### 1. Count Total Validation Query
```sql
SELECT 
    (SELECT COUNT(*) FROM businesses) AS total_businesses,
    (SELECT COUNT(*) FROM customers) AS total_customers,
    (SELECT COUNT(*) FROM invoices) AS total_invoices,
    (SELECT COUNT(*) FROM payments) AS total_payments,
    (SELECT COUNT(*) FROM payment_allocations) AS total_payment_allocations,
    (SELECT COUNT(*) FROM promises) AS total_promises,
    (SELECT COUNT(*) FROM communications) AS total_communications,
    (SELECT COUNT(*) FROM reconciliation_exceptions) AS total_reconciliation_exceptions;
```

### 2. Distinguishability & Seed Protection Query
```sql
-- Verify baseline seeds remain 100% untouched
SELECT 
    COUNT(*) FILTER (WHERE id::text LIKE 'c0000000-%') AS baseline_customers,
    COUNT(*) FILTER (WHERE id::text LIKE 'c9000000-%') AS synthetic_customers,
    COUNT(*) FILTER (WHERE invoice_number LIKE 'INV-2024-%') AS baseline_invoices,
    COUNT(*) FILTER (WHERE invoice_number LIKE 'INV-SYNTH-%') AS synthetic_invoices
FROM customers, invoices;
```

### 3. Orphan & Foreign Key Integrity Query
```sql
SELECT 
    (SELECT COUNT(*) FROM invoices WHERE customer_id NOT IN (SELECT id FROM customers)) AS orphaned_invoices,
    (SELECT COUNT(*) FROM payments WHERE customer_id NOT IN (SELECT id FROM customers)) AS orphaned_payments,
    (SELECT COUNT(*) FROM payment_allocations WHERE invoice_id NOT IN (SELECT id FROM invoices)) AS orphaned_allocations,
    (SELECT COUNT(*) FROM promises WHERE invoice_id NOT IN (SELECT id FROM invoices)) AS orphaned_promises,
    (SELECT COUNT(*) FROM communications WHERE customer_id NOT IN (SELECT id FROM customers)) AS orphaned_communications,
    (SELECT COUNT(*) FROM reconciliation_exceptions WHERE invoice_id NOT IN (SELECT id FROM invoices) OR payment_id NOT IN (SELECT id FROM payments)) AS orphaned_exceptions;
```

### 4. Mathematical Ledger Consistency Query
```sql
-- Ensure paid_amount matches sum of allocations
SELECT inv.id, inv.invoice_number, inv.paid_amount, COALESCE(SUM(pa.allocated_amount), 0.00) AS calculated_allocations
FROM invoices inv
LEFT JOIN payment_allocations pa ON inv.id = pa.invoice_id
GROUP BY inv.id, inv.invoice_number, inv.paid_amount
HAVING inv.paid_amount <> COALESCE(SUM(pa.allocated_amount), 0.00);
```

### 5. Working View Integration Verification
```sql
-- Verify working view updates dynamically without errors
SELECT status, priority, COUNT(*) 
FROM invoice_working_view 
GROUP BY status, priority;
```

---

## Conclusion & Next Phase Readiness
This inspection report completes Phase 1. The exact table schemas, data types, primary/foreign keys, non-null fields, enum values, customer behavioral archetypes, explicit edge cases, distinguishable namespace strategy, target counts, insert order, and validation queries are fully documented. 

**No database records have been created or modified.** The system is 100% ready for safe SQL generation in Phase 2.
