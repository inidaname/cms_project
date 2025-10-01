package database

import (
	"context"
	"database/sql"
	"fmt"
	"log"
	"time"

	"github.com/inidaname/cms_project/internal/config"
	model "github.com/inidaname/cms_project/internal/database/model" // sqlc generated code

	_ "github.com/jackc/pgx/v5/stdlib" // pgx as driver
)

type Database struct {
	Conn    *sql.DB
	Queries *model.Queries
}

func NewDatabase(cfg config.DBConfig) (*Database, error) {
	dsn := fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s?sslmode=%s",
		cfg.User,
		cfg.Password,
		cfg.Host,
		cfg.Port,
		cfg.Name,
		cfg.SSLMode,
	)

	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, fmt.Errorf("failed to open db: %w", err)
	}

	// Tune connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	db.SetConnMaxLifetime(5 * time.Minute)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := db.PingContext(ctx); err != nil {
		return nil, fmt.Errorf("failed to ping db: %w", err)
	}

	log.Println("✅ Connected to database")

	return &Database{
		Conn:    db,
		Queries: model.New(db),
	}, nil
}
