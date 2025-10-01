-- name: GetRevenueOverTime :many
SELECT DATE_TRUNC('month', p.created_at) AS month,
       COALESCE(SUM(p.amount_cents), 0) AS total_revenue_cents
FROM payments p
WHERE p.tenant_id = $1
  AND p.status = 'success'
GROUP BY month
ORDER BY month ASC;


-- name: GetInvoiceStatusSummary :many
SELECT status, COUNT(*) AS count
FROM invoices
WHERE tenant_id = $1
GROUP BY status;


-- name: GetPaymentProviderSummary :many
SELECT provider, COUNT(*) AS count, COALESCE(SUM(amount_cents), 0) AS total_cents
FROM payments
WHERE tenant_id = $1
GROUP BY provider;


-- name: GetTopCustomers :many
SELECT customer_email,
       COALESCE(SUM(p.amount_cents), 0) AS total_spent_cents
FROM invoices i
LEFT JOIN payments p ON i.id = p.invoice_id AND p.status = 'success'
WHERE i.tenant_id = $1
GROUP BY customer_email
ORDER BY total_spent_cents DESC
LIMIT $2 OFFSET $3;

-- name: GetOutstandingInvoices :many
SELECT i.id AS invoice_id,
       i.customer_email,
       i.amount_cents,
       i.currency,
       i.due_at,
       (i.amount_cents - COALESCE(SUM(p.amount_cents), 0)) AS outstanding_cents
FROM invoices i
LEFT JOIN payments p ON i.id = p.invoice_id AND p.status = 'success'
WHERE i.tenant_id = $1
  AND i.status = 'pending'
GROUP BY i.id, i.customer_email, i.amount_cents, i.currency, i.due_at
ORDER BY i.due_at ASC;
