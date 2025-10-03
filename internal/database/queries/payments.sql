-- name: CreatePayment :one
INSERT INTO payments (tenant_id, invoice_id, amount_cents, currency, provider, status, transaction_ref)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: GetPaymentByID :one
SELECT * FROM payments WHERE id = $1 LIMIT 1;

-- name: ListPaymentsByInvoice :many
SELECT * FROM payments WHERE invoice_id = $1 ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdatePaymentStatus :one
UPDATE payments
SET status = $2
WHERE id = $1
RETURNING *;

-- name: DeletePayment :exec
DELETE FROM payments WHERE id = $1;

-- name: CountTenantPayments :one
SELECT COUNT(*) 
FROM payments p
JOIN invoices i ON p.invoice_id = i.id
WHERE p.tenant_id = $1;
