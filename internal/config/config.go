package config

import (
	"os"
	"strconv"
)

type DBConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	Name     string
	SSLMode  string
}

func LoadDBConfig() DBConfig {
	port, _ := strconv.Atoi(getEnv("DB_PORT", "5432"))
	return DBConfig{
		Host:     getEnv("POSTGRES_HOST", "localhost"),
		Port:     port,
		User:     getEnv("POSTGRES_USER", "postgres"),
		Password: getEnv("POSTGRES_PASSWORD", ""),
		Name:     getEnv("POSTGRES_DB", "possiblecms"),
		SSLMode:  getEnv("POSTGRES_SSLMODE", "disable"),
	}
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
