-- name: CreateUser :one
INSERT INTO users (tenant_id, email, password_hash, role)
VALUES ($1, $2, $3, $4)
RETURNING *;

-- name: GetUserByID :one
SELECT * FROM users WHERE id = $1 LIMIT 1;

-- name: GetUserByEmail :one
SELECT * FROM users WHERE tenant_id = $1 AND email = $2 LIMIT 1;

-- name: ListUsersByTenant :many
SELECT * FROM users 
WHERE tenant_id = $1 
ORDER BY created_at DESC
LIMIT $2 OFFSET $3;

-- name: DeleteUser :exec
DELETE FROM users WHERE id = $1;

-- name: CountTenantUsers :one
SELECT COUNT(*) FROM users WHERE tenant_id = $1;

-- name: UpdateUserDetail :one
UPDATE users
SET password_hash = COALESCE(sqlc.narg('password_hash'), password_hash),
    role = COALESCE(sqlc.narg('role'), role)
WHERE id = sqlc.arg('id')
RETURNING *;