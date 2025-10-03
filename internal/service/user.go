package service

import (
	"context"

	"github.com/google/uuid"
	"github.com/inidaname/cms_project/internal/domain/users"
	"github.com/inidaname/cms_project/internal/repository"
)

type UserService interface {
	Register(ctx context.Context, dto users.RegisterDTO) (users.UserResponse, error)
	GetProfile(ctx context.Context, id uuid.UUID) (users.UserResponse, error)
}

type userService struct {
	repo repository.UserRepository
}

func NewUserService(repo repository.UserRepository) UserService {
	return &userService{repo: repo}
}

func (s *userService) Register(ctx context.Context, dto users.RegisterDTO) (users.UserResponse, error) {
	user, err := s.repo.Create(ctx, dto.ToParams())
	if err != nil {
		return users.UserResponse{}, err
	}
	return users.ToResponse(user), nil
}

func (s *userService) GetProfile(ctx context.Context, id uuid.UUID) (users.UserResponse, error) {
	user, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return users.UserResponse{}, err
	}
	return users.ToResponse(user), nil
}
