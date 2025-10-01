-- name: ListTenantUsersWithInvoices :many
SELECT u.id AS user_id,
       u.email,
       u.role,
       u.created_at AS user_created_at,
       i.id AS invoice_id,
       i.amount_cents,
       i.currency,
       i.status AS invoice_status,
       i.issued_at,
       i.due_at
FROM users u
LEFT JOIN invoices i ON u.id = i.user_id
WHERE u.tenant_id = $1
ORDER BY u.created_at DESC, i.issued_at DESC
LIMIT $2 OFFSET $3;
