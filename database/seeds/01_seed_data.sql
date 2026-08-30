-- =============================================================================
-- Seed Data Reference Template
-- Reference structure for 5 businesses, 25 customers, 70 invoices, 22 payments,
-- 18 payment allocations, 70 communications, 29 promises, 6 reconciliation exceptions.
-- =============================================================================

-- Businesses Baseline
INSERT INTO businesses (id, name, email) VALUES
('b0000000-0000-0000-0000-000000000001', 'Razorpay Merchant Enterprise', 'finance@merchant-enterprise.com'),
('b0000000-0000-0000-0000-000000000002', 'Nexus Digital Commerce', 'accounts@nexusdigital.io'),
('b0000000-0000-0000-0000-000000000003', 'Apex Logistics Corp', 'ar@apexlogistics.com'),
('b0000000-0000-0000-0000-000000000004', 'CloudScale SaaS Solutions', 'billing@cloudscale.net'),
('b0000000-0000-0000-0000-000000000005', 'Vanguard Retail Systems', 'collections@vanguardretail.in')
ON CONFLICT (id) DO NOTHING;

-- Sample Seed Customers
INSERT INTO customers (id, business_id, name, email, phone, credit_limit, risk_score) VALUES
('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Acme India Enterprises', 'ap@acmeindia.com', '+91 98765 43210', 5000000.00, 75),
('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Bharat Tech Solutions', 'billing@bharattech.co.in', '+91 98123 45678', 3000000.00, 40),
('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Crestline Global Supplies', 'finance@crestlineglobal.com', '+91 99000 11223', 8000000.00, 85)
ON CONFLICT (id) DO NOTHING;
