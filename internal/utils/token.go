package utils

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var secret = []byte("super-secret-key") // TODO: load from env

type Claims struct {
	UserID   string `json:"sub"`
	TenantID string `json:"tenant"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

func GenerateToken(userID, tenantID, role string, ttl time.Duration) (string, error) {
	claims := &Claims{
		UserID:   userID,
		TenantID: tenantID,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(ttl)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			Issuer:    "cms-app",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(secret)
}

func ParseToken(tokenStr string) (*Claims, error) {
	token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(t *jwt.Token) (interface{}, error) {
		return secret, nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*Claims)
	if !ok || !token.Valid {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return claims, nil
}
