package users

import (
	"database/sql"
	"time"

	"github.com/google/uuid"
	model "github.com/inidaname/cms_project/internal/database/model"
)

// ===== Request DTO =====
type RegisterDTO struct {
	TenantID uuid.UUID `json:"tenant_id"`
	Email    string    `json:"email"`
	Password string    `json:"password"`
	Role     string    `json:"role"`
}

type UpdateDTO struct {
	UserID   uuid.UUID `json:"user_id"`
	Password string    `json:"password"`
	Role     string    `json:"role"`
}

type LoginDTO struct {
	Email    string    `json:"email"`
	Password string    `json:"password"`
	TenantID uuid.UUID `json:"tenant_id"`
}

// Converts DTO into sqlc params for repository
func (dto RegisterDTO) ToParams() model.CreateUserParams {
	return model.CreateUserParams{
		TenantID:     dto.TenantID,
		Email:        dto.Email,
		PasswordHash: dto.Password,
		Role:         dto.Role,
	}
}

func (dto UpdateDTO) ToParams() model.UpdateUserDetailParams {
	return model.UpdateUserDetailParams{
		PasswordHash: sql.NullString{String: dto.Password, Valid: dto.Password != ""},
		Role:         sql.NullString{String: dto.Role, Valid: dto.Role != ""},
		ID:           dto.UserID,
	}
}

// ===== Response DTO =====
type UserResponse struct {
	ID        uuid.UUID `json:"id"`
	TenantID  uuid.UUID `json:"tenant_id"`
	Role      string    `json:"role"`
	Password  string    `json:"password"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}
