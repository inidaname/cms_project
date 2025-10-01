-- name: CreateTenant :one
INSERT INTO tenants (name, domain)
VALUES ($1, $2)
RETURNING *;

-- name: GetTenantByID :one
SELECT * FROM tenants WHERE id = $1 LIMIT 1;

-- name: GetTenantByDomain :one
SELECT * FROM tenants WHERE domain = $1 LIMIT 1;

-- name: ListTenants :many
SELECT * FROM tenants ORDER BY created_at DESC;

-- name: DeleteTenant :exec
DELETE FROM tenants WHERE id = $1;
