package service

import (
	"context"
	"errors"
	"time"

	"golang.org/x/crypto/bcrypt"

	db "github.com/inidaname/cms_project/internal/database/model"
	"github.com/inidaname/cms_project/internal/domain/users"
	"github.com/inidaname/cms_project/internal/repository"
	token "github.com/inidaname/cms_project/internal/utils"
)

type AuthService struct {
	repo repository.UserRepository
}

func NewAuthService(repo repository.UserRepository) *AuthService {
	return &AuthService{repo: repo}
}

func (s *AuthService) Register(ctx context.Context, dto users.RegisterDTO) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(dto.Password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}

	u := db.CreateUserParams{
		TenantID:     dto.TenantID,
		Email:        dto.Email,
		PasswordHash: string(hash),
		Role:         dto.Role,
	}

	user, err := s.repo.Create(ctx, u)

	if err != nil {
		return "", err
	}

	// return JWT after register
	return token.GenerateToken(user.ID.String(), u.TenantID.String(), string(u.Role), time.Hour)
}

func (s *AuthService) Login(ctx context.Context, dto users.LoginDTO) (string, error) {
	u, err := s.repo.GetByEmail(ctx, db.GetUserByEmailParams{TenantID: dto.TenantID, Email: dto.Email})
	if err != nil {
		return "", errors.New("invalid email or password")
	}

	if bcrypt.CompareHashAndPassword([]byte(u.Password), []byte(dto.Password)) != nil {
		return "", errors.New("invalid email or password")
	}

	return token.GenerateToken(u.ID.String(), u.TenantID.String(), string(u.Role), time.Hour)
}
