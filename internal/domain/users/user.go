package users

import (
	"errors"
	"time"

	"github.com/google/uuid"
)

// ===== Entity =====
type User struct {
	ID        uuid.UUID
	TenantID  uuid.UUID
	Email     string
	Role      string
	Password  string
	CreatedAt time.Time
}

// ===== Domain Errors =====
var (
	ErrUserNotFound      = errors.New("user not found")
	ErrInvalidUserEmail  = errors.New("invalid email format")
	ErrDuplicateUser     = errors.New("user with this email already exists")
	ErrInvalidCredential = errors.New("invalid credentials")
)

// ===== Factory =====
func NewUser(tenantID uuid.UUID, name, email, role, hashedPassword string) (*User, error) {
	if name == "" {
		return nil, errors.New("name is required")
	}
	if email == "" {
		return nil, ErrInvalidUserEmail
	}
	return &User{
		ID:        uuid.New(),
		TenantID:  tenantID,
		Email:     email,
		Password:  hashedPassword,
		Role:      role,
		CreatedAt: time.Now(),
	}, nil
}

// ===== Behavior (business logic) =====
// func (u *User) ChangeName(newName string) {
// 	u.Name = newName
// 	u.UpdatedAt = time.Now()
// }

func (u *User) ChangePassword(newHashedPassword string) {
	u.Password = newHashedPassword
}

func (u *User) ChangeRole(newRole string) {
	u.Role = newRole
}
