-- =============================================================================
-- Dynamic View: invoice_working_view
-- Computes real-time outstanding balances, days overdue, priority score,
-- and active promise / exception counts for operational receivables intelligence.
-- =============================================================================

CREATE OR REPLACE VIEW invoice_working_view AS
SELECT 
    inv.id,
    inv.business_id,
    inv.customer_id,
    cust.name AS customer_name,
    cust.email AS customer_email,
    cust.phone AS customer_phone,
    cust.risk_score AS customer_risk_score,
    inv.invoice_number,
    inv.amount,
    COALESCE(inv.paid_amount, 0.00) AS paid_amount,
    (inv.amount - COALESCE(inv.paid_amount, 0.00)) AS outstanding_amount,
    inv.due_date,
    GREATEST(0, (CURRENT_DATE - inv.due_date::date)) AS days_overdue,
    inv.status,
    CASE 
        WHEN (CURRENT_DATE - inv.due_date::date) > 30 OR (inv.amount - COALESCE(inv.paid_amount, 0.00)) >= 1000000 THEN 'HIGH'
        WHEN (CURRENT_DATE - inv.due_date::date) > 14 OR (inv.amount - COALESCE(inv.paid_amount, 0.00)) >= 300000 THEN 'MEDIUM'
        ELSE 'LOW'
    END AS priority,
    (
        SELECT COUNT(*)::int 
        FROM promises p 
        WHERE p.invoice_id = inv.id AND p.status = 'pending'
    ) AS active_promises_count,
    (
        SELECT COUNT(*)::int 
        FROM reconciliation_exceptions rx 
        WHERE rx.invoice_id = inv.id AND rx.status = 'open'
    ) AS open_exceptions_count,
    inv.created_at
FROM invoices inv
JOIN customers cust ON inv.customer_id = cust.id;
