package main

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/inidaname/cms_project/internal/handler"
)

func main() {
	r := chi.NewRouter()

	// Middlewares
	r.Use(
	// chi middlewares
	)

	// Routes
	r.Mount("/api/v1/users", handler.UserRoutes())
	r.Mount("/api/v1/tenants", handler.TenantRoutes())

	log.Println("🚀 Server running on :8080")
	if err := http.ListenAndServe(":8080", r); err != nil {
		log.Fatal(err)
	}
}
