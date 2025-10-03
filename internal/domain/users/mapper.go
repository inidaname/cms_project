package users

import (
	model "github.com/inidaname/cms_project/internal/database/model"
)

// Convert DB model → Domain entity
func FromModel(m model.User) User {
	return User{
		ID:        m.ID,
		TenantID:  m.TenantID,
		Email:     m.Email,
		Role:      m.Role,
		Password:  m.PasswordHash,
		CreatedAt: m.CreatedAt,
	}
}

// Convert Domain entity → Response DTO
func ToResponse(u User) UserResponse {
	return UserResponse{
		ID:        u.ID,
		TenantID:  u.TenantID,
		Email:     u.Email,
		Role:      u.Role,
		Password:  u.Password,
		CreatedAt: u.CreatedAt,
	}
}

// Convert slice of DB models → slice of Domain entities
func ListFromModel(models []model.User) []User {
	users := make([]User, len(models))
	for i, m := range models {
		users[i] = FromModel(m)
	}
	return users
}

// Convert slice of Domain entities → slice of Response DTOs
func ListToResponse(users []User) []UserResponse {
	responses := make([]UserResponse, len(users))
	for i, u := range users {
		responses[i] = ToResponse(u)
	}
	return responses
}
