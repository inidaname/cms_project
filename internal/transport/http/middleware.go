package http

import (
	"context"
	"net/http"
	"strings"

	token "github.com/inidaname/cms_project/internal/utils"
)

type ctxKey string

const userKey ctxKey = "user"

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			http.Error(w, "missing or invalid token", http.StatusUnauthorized)
			return
		}

		claims, err := token.ParseToken(strings.TrimPrefix(header, "Bearer "))
		if err != nil {
			http.Error(w, "invalid token", http.StatusUnauthorized)
			return
		}

		ctx := context.WithValue(r.Context(), userKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func GetUserClaims(r *http.Request) *token.Claims {
	claims, _ := r.Context().Value(userKey).(*token.Claims)
	return claims
}
