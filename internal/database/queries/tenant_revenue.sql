-- name: GetTenantRevenue :one
SELECT t.id AS tenant_id,
       t.name AS tenant_name,
       COALESCE(SUM(p.amount_cents), 0) AS total_revenue_cents
FROM tenants t
LEFT JOIN invoices i ON t.id = i.tenant_id
LEFT JOIN payments p ON i.id = p.invoice_id AND p.status = 'success'
WHERE t.id = $1
GROUP BY t.id, t.name;
