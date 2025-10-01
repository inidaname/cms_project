-- name: ListTenantProductsWithInvoices :many
SELECT p.id AS product_id,
       p.name AS product_name,
       p.price_cents,
       p.currency,
       i.id AS invoice_id,
       i.amount_cents AS invoice_amount,
       i.status AS invoice_status
FROM products p
LEFT JOIN invoices i ON p.tenant_id = i.tenant_id
WHERE p.tenant_id = $1
ORDER BY p.created_at DESC, i.issued_at DESC
LIMIT $2 OFFSET $3;
