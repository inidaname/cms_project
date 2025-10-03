-- name: CreateProduct :one
INSERT INTO products (tenant_id, name, description, price_cents, currency)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;

-- name: GetProductByID :one
SELECT * FROM products WHERE id = $1 LIMIT 1;

-- name: ListProductsByTenant :many
SELECT * FROM products WHERE tenant_id = $1 ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: UpdateProduct :one
UPDATE products
SET name = $2, description = $3, price_cents = $4, currency = $5
WHERE id = $1
RETURNING *;

-- name: DeleteProduct :exec
DELETE FROM products WHERE id = $1;

-- name: CountTenantProducts :one
SELECT COUNT(*) FROM products WHERE tenant_id = $1;
