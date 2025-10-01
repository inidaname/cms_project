-- name: GetInvoiceWithPayments :many
SELECT i.id AS invoice_id,
       i.tenant_id,
       i.user_id,
       i.customer_email,
       i.amount_cents,
       i.currency,
       i.status AS invoice_status,
       i.issued_at,
       i.due_at,
       p.id AS payment_id,
       p.amount_cents AS payment_amount,
       p.currency AS payment_currency,
       p.provider,
       p.status AS payment_status,
       p.transaction_ref,
       p.created_at AS payment_created_at
FROM invoices i
LEFT JOIN payments p ON i.id = p.invoice_id
WHERE i.id = $1
ORDER BY p.created_at DESC
LIMIT $2 OFFSET $3;
