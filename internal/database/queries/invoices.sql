-- name: CreateInvoice :one
INSERT INTO invoices (tenant_id, user_id, customer_email, amount_cents, currency, due_at)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING *;

-- name: GetInvoiceByID :one
SELECT * FROM invoices WHERE id = $1 LIMIT 1;

-- name: ListInvoicesByTenant :many
SELECT * FROM invoices WHERE tenant_id = $1 ORDER BY issued_at DESC;

-- name: UpdateInvoiceStatus :one
UPDATE invoices
SET status = $2
WHERE id = $1
RETURNING *;

-- name: DeleteInvoice :exec
DELETE FROM invoices WHERE id = $1;

-- name: CountTenantInvoices :one
SELECT COUNT(*) FROM invoices WHERE tenant_id = $1;
