package handler

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/inidaname/cms_project/internal/domain/users"
	"github.com/inidaname/cms_project/internal/service"
)

type AuthHandler struct {
	service service.AuthService
}

func (h *UserHandler) Routes() chi.Router {
	r := chi.NewRouter()

	r.Post("/user/register", h.registerUser)
	r.Post("/user/login", h.loginUser)
	r.Get("/", h.listUsers)

	return r
}

func (h *AuthHandler) loginUser(w http.ResponseWriter, r *http.Request) {
	var dto users.LoginDTO
	if err := json.NewDecoder(r.Body).Decode(&dto); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	resp, err := h.service.Login(context.Background(), dto)
	if err != nil {
		http.Error(w, err.Error(), http.StatusUnauthorized)
		return
	}

	writeJSON(w, resp, http.StatusOK)
}
