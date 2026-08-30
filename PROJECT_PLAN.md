# PROJECT PLAN: AI Revenue Recovery & Receivables Intelligence

## 1. Current Repository Structure
```
c:\Razorpay-Project (Empty directory)
```

## 2. What Already Exists
- Fresh workspace directory (`c:\Razorpay-Project`)
- Existing Supabase database instance (to be connected via environment variables)

## 3. What Is Missing
- **Frontend App**: Next.js + React + TypeScript with App Router (`frontend/`)
- **Backend API**: Node.js + Express + TypeScript (`backend/`)
- **Environment & Security**: `.env.example`, `.gitignore`, local environment setup
- **Database Layer**: Supabase Client wrapper in backend, DB health check endpoint (`GET /api/health/database`)
- **Data APIs**: Business, customer, invoice, payment, promise, communication, exception endpoints
- **Dashboard UI**: Top metrics & Receivables table using `invoice_working_view`
- **Invoice Detail View**: Complete lifecycle history (payments, promises, communications, exceptions)
- **Chatbot UI Shell**: Merchant interface with mock/placeholder endpoint (`POST /api/agent/query`)
- **Documentation**: Comprehensive docs in `docs/` (`SETUP.md`, `ARCHITECTURE.md`, `API.md`, `DATABASE.md`, `README.md`)

## 4. Technology Decisions
- **Frontend**: Next.js 14+ (App Router), React 18, TypeScript, Lucide React icons, Tailwind CSS / Vanilla CSS.
- **Backend**: Node.js, Express, TypeScript, ts-node-dev / tsc, dotenv, cors, `@supabase/supabase-js`.
- **Database**: Remote Supabase PostgreSQL (schema exists, zero schema modifications/recreations).
- **LLM Abstraction**: Placeholder model abstraction prepared for future LangGraph + Gemini/OpenAI integration.

## 5. Planned Phases

### Phase 0: Repository Inspection & Planning (Current)
- Inspect codebase (Empty root verified).
- Document existing state, missing components, technology stack, and project roadmap in `PROJECT_PLAN.md`.

### Phase 1: Project Foundation Setup
- Initialize `frontend/` (Next.js App Router, TypeScript).
- Initialize `backend/` (Node.js, Express, TypeScript).
- Root `.gitignore` and build scripts.

### Phase 2: Supabase Environment & Config
- Create safe `.env.example` placeholders for Frontend (`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_API_URL`) and Backend (`PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
- Create `docs/SETUP.md` with step-by-step connection instructions.

### Phase 3: Database Verification & Health Check
- Implement `GET /api/health/database` endpoint.
- Verify existing 13 tables & 1 view (`invoice_working_view`) and record table row counts.

### Phase 4: Backend Data APIs
- Implement repository & service pattern in backend.
- Build REST endpoints:
  - `GET /api/dashboard/summary`
  - `GET /api/businesses`
  - `GET /api/customers`
  - `GET /api/invoices`
  - `GET /api/invoices/:id`
  - `GET /api/invoices/:id/payments`
  - `GET /api/invoices/:id/promises`
  - `GET /api/invoices/:id/communications`
  - `GET /api/invoices/:id/exceptions`

### Phase 5: Dashboard Implementation
- Build dynamic overview dashboard displaying key metrics (Revenue at Risk, Outstanding Amount, Overdue Invoices, Active Promises, Open Exceptions, Customer Count).
- Display Top Receivables table sourced from `invoice_working_view`.

### Phase 6: Invoice Detail View
- Build interactive Invoice Detail page rendering complete history (Invoices, Customers, Payments, Promises, Communications, Reconciliation Exceptions).

### Phase 7: Chatbot UI Shell
- Build responsive AI Assistant chat interface shell in frontend.
- Implement stub endpoint `POST /api/agent/query` returning clearly marked non-fake placeholder status.

### Phase 8: Security & Guardrails
- Enforce service-role key isolation in backend only.
- Validate inputs & sanitize error outputs.

### Phase 9: System Documentation
- Finalize `README.md`, `docs/SETUP.md`, `docs/ARCHITECTURE.md`, `docs/API.md`, `docs/DATABASE.md`.

### Phase 10: System Testing & Verification
- Execute TypeScript compile checks, lint checks, build checks, and runtime endpoint verifications.

---

## 6. Future Agent Architecture (Phase 2+)

```
Frontend (Next.js / React)
        ↓
Backend (Node.js / Express API)
        ↓
LangGraph Orchestrator
        ↓
┌───────────────────────────┬───────────────────────────┬────────────────────────────┐
│ Receivables Intel Agent   │ Promise-to-Pay Agent      │ Reconciliation Agent       │
└───────────────────────────┴───────────────────────────┴────────────────────────────┘
        ↓
Deterministic Policy / Guardrails (TypeScript)
        ↓
Controlled Action
        ↓
Verification & Audit Logging
        ↓
Supabase PostgreSQL
```
