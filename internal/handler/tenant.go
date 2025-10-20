package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
)

func TenantRoutes() chi.Router {
	r := chi.NewRouter()

	r.Post("/", createTenant)
	r.Get("/", listTenants)

	return r
}

func createTenant(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("Create tenant"))
}

func listTenants(w http.ResponseWriter, r *http.Request) {
	w.Write([]byte("List tenants"))
}
