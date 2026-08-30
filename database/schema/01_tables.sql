-- =============================================================================
-- AI Revenue Recovery & Receivables Intelligence — Core Schema DDL
-- 13 Tables Specification
-- =============================================================================

-- 1. Businesses
CREATE TABLE IF NOT EXISTS businesses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Customers
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    credit_limit NUMERIC(15, 2) DEFAULT 0.00,
    risk_score INTEGER DEFAULT 50, -- 0 (lowest risk) to 100 (highest risk)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    amount NUMERIC(15, 2) NOT NULL,
    paid_amount NUMERIC(15, 2) DEFAULT 0.00,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'unpaid', -- unpaid, partially_paid, paid, overdue
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    payment_method VARCHAR(100) DEFAULT 'Bank Transfer',
    reference_number VARCHAR(100),
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Payment Allocations
CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    allocated_amount NUMERIC(15, 2) NOT NULL,
    allocated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Communications
CREATE TABLE IF NOT EXISTS communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL, -- email, call, sms, portal
    direction VARCHAR(20) NOT NULL, -- inbound, outbound
    summary TEXT NOT NULL,
    sentiment VARCHAR(50),
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Promises to Pay
CREATE TABLE IF NOT EXISTS promises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    promised_amount NUMERIC(15, 2) NOT NULL,
    promised_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, fulfilled, broken
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. Reconciliation Exceptions
CREATE TABLE IF NOT EXISTS reconciliation_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    expected_amount NUMERIC(15, 2) NOT NULL,
    received_amount NUMERIC(15, 2) NOT NULL,
    discrepancy_amount NUMERIC(15, 2) NOT NULL,
    reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open', -- open, investigating, resolved
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. Agent Runs (Execution Audit)
CREATE TABLE IF NOT EXISTS agent_runs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name VARCHAR(100) NOT NULL,
    triggered_by VARCHAR(100) DEFAULT 'system_event',
    status VARCHAR(50) NOT NULL DEFAULT 'running', -- running, completed, failed
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 10. Agent Decisions
CREATE TABLE IF NOT EXISTS agent_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_run_id UUID NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    decision_type VARCHAR(100) NOT NULL,
    reasoning TEXT NOT NULL,
    confidence_score NUMERIC(5, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Actions
CREATE TABLE IF NOT EXISTS actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_decision_id UUID REFERENCES agent_decisions(id) ON DELETE CASCADE,
    action_type VARCHAR(100) NOT NULL,
    target_entity VARCHAR(100),
    target_id UUID,
    payload JSONB,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, executed, blocked
    executed_at TIMESTAMP WITH TIME ZONE
);

-- 12. Policy Decisions (Deterministic Guardrails)
CREATE TABLE IF NOT EXISTS policy_decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID REFERENCES actions(id) ON DELETE CASCADE,
    policy_name VARCHAR(150) NOT NULL,
    allowed BOOLEAN NOT NULL,
    violation_reason TEXT,
    evaluated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    performed_by VARCHAR(100) NOT NULL,
    details JSONB,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
