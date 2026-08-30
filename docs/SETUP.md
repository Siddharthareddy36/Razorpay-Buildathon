# Setup & Local Quickstart Guide

This guide walks you through configuring environment variables and launching the AI Revenue Recovery & Receivables Intelligence system.

---

## 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Supabase Account & PostgreSQL Project**: Database schema with required 13 tables & 1 view (`invoice_working_view`).

---

## 2. Environment Configuration

> [!IMPORTANT]
> **Do NOT commit `.env` files to git.** Keep `.env` local and never expose the backend `SUPABASE_SERVICE_ROLE_KEY` to the browser or frontend app.

### Step 1: Configure Backend Environment
1. Copy `backend/.env.example` to `backend/.env`:
   ```bash
   cp backend/.env.example backend/.env
   ```
2. Open `backend/.env` and update with your Supabase project credentials:
   ```env
   PORT=5000
   SUPABASE_URL=https://<your-project-ref>.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=<your-backend-service-role-key>
   ```

### Step 2: Configure Frontend Environment
1. Copy `frontend/.env.example` to `frontend/.env.local`:
   ```bash
   cp frontend/.env.example frontend/.env.local
   ```
2. Open `frontend/.env.local` and set API URL:
   ```env
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NEXT_PUBLIC_API_URL=http://localhost:5000/api
   ```

> [!CAUTION]
> If credentials are missing or unknown, do **NOT** invent them. Ask your database administrator or fetch them from the Supabase Project Settings -> API page.

---

## 3. Installation & Local Development

### Step 1: Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Start Backend REST API Server
```bash
cd backend
npm run dev
```
The REST API will listen on `http://localhost:5000`.

### Step 3: Start Frontend Application
In a separate terminal window:
```bash
cd frontend
npm run dev
```
The Next.js web dashboard will run on `http://localhost:3000`.

---

## 4. Verifying Database Connection

Once backend is running, verify the health and table connectivity by navigating to:
```
http://localhost:5000/api/health/database
```
Or check the indicator in the top header of the web dashboard (`http://localhost:3000`).

Expected response:
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
