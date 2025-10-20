package repository

import (
	"context"

	"github.com/google/uuid"
	model "github.com/inidaname/cms_project/internal/database/model"
	users "github.com/inidaname/cms_project/internal/domain/users"
)

type UserRepository interface {
	Create(ctx context.Context, arg model.CreateUserParams) (users.User, error)
	GetByID(ctx context.Context, id uuid.UUID) (users.User, error)
	GetByEmail(ctx context.Context, args model.GetUserByEmailParams) (users.User, error)
	List(ctx context.Context, arg model.ListUsersByTenantParams) ([]users.User, error)
	Update(ctx context.Context, arg model.UpdateUserDetailParams) (users.User, error)
}

type userRepository struct {
	q *model.Queries
}

func NewUserRepository(q *model.Queries) UserRepository {
	return &userRepository{q: q}
}

func (r *userRepository) Create(ctx context.Context, arg model.CreateUserParams) (users.User, error) {
	dbUser, err := r.q.CreateUser(ctx, arg)
	if err != nil {
		return users.User{}, err
	}
	return users.FromModel(dbUser), nil
}

func (r *userRepository) GetByID(ctx context.Context, id uuid.UUID) (users.User, error) {
	dbUser, err := r.q.GetUserByID(ctx, id)
	if err != nil {
		return users.User{}, err
	}
	return users.FromModel(dbUser), nil
}

// type UserRepository interface {
// 	Create(ctx context.Context, arg model.CreateUserParams) (model.User, error)
// 	GetByID(ctx context.Context, id uuid.UUID) (model.User, error)
// 	GetByEmail(ctx context.Context, tenant_id uuid.UUID, email string) (model.User, error)
// 	List(ctx context.Context, tenant_id uuid.UUID, limit, offset int32) ([]model.User, error)
// }

// type userRepository struct {
// 	q *model.Queries
// }

// func NewUserRepository(q *model.Queries) UserRepository {
// 	return &userRepository{q: q}
// }

// func (r *userRepository) Create(ctx context.Context, arg model.CreateUserParams) (model.User, error) {
// 	return r.q.CreateUser(ctx, arg)
// }

// func (r *userRepository) GetByID(ctx context.Context, id uuid.UUID) (model.User, error) {
// 	return r.q.GetUserByID(ctx, id)
// }

func (r *userRepository) GetByEmail(ctx context.Context, args model.GetUserByEmailParams) (users.User, error) {
	dbUser, err := r.q.GetUserByEmail(ctx, args)
	if err != nil {
		return users.User{}, err
	}

	return users.FromModel(dbUser), nil
}

func (r *userRepository) List(ctx context.Context, arg model.ListUsersByTenantParams) ([]users.User, error) {
	dbUsers, err := r.q.ListUsersByTenant(ctx, arg)

	if err != nil {
		return []users.User{}, err
	}

	return users.ListFromModel(dbUsers), nil
}

func (r *userRepository) Update(ctx context.Context, arg model.UpdateUserDetailParams) (users.User, error) {
	dbUser, err := r.q.UpdateUserDetail(ctx, arg)

	if err != nil {
		return users.User{}, err
	}

	return users.FromModel(dbUser), nil
}
