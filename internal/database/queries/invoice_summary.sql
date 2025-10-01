-- name: GetInvoiceSummary :one
SELECT i.id AS invoice_id,
       i.customer_email,
       i.amount_cents,
       i.currency,
       i.status AS invoice_status,
       COUNT(p.id) AS payments_count,
       COALESCE(SUM(p.amount_cents), 0) AS total_paid_cents
FROM invoices i
LEFT JOIN payments p ON i.id = p.invoice_id AND p.status = 'success'
WHERE i.id = $1
GROUP BY i.id, i.customer_email, i.amount_cents, i.currency, i.status;
