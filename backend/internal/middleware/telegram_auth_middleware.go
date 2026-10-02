package middleware

import (
	"strings"

	"earnminiapp/internal/repository"
	"earnminiapp/internal/telegram"
	"earnminiapp/pkg/jwt"
	"earnminiapp/pkg/response"
	"github.com/gin-gonic/gin"
)

const (
	HeaderTelegramInitData = "X-Telegram-Init-Data"
	CtxInitDataVerifiedKey = "initDataVerified"
)

// TelegramInitDataMiddleware requires a valid Telegram WebApp initData on every request.
// Header: X-Telegram-Init-Data (raw initData query string from Telegram.WebApp.initData)
//
// Security model:
//  1. HMAC-SHA256 signature verified with bot token (cannot be forged without bot token)
//  2. auth_date freshness enforced
//  3. User must already exist in DB (login via POST /auth/telegram first)
//  4. If Authorization Bearer JWT is also present, telegram_id MUST match initData (anti-token-swap)
func TelegramInitDataMiddleware(
	validator *telegram.AuthValidator,
	userRepo *repository.UserRepository,
	jwtManager *jwt.JWTManager,
	maxAgeSeconds int64,
) gin.HandlerFunc {
	return func(c *gin.Context) {
		raw := strings.TrimSpace(c.GetHeader(HeaderTelegramInitData))
		if raw == "" {
			// Fallback: some clients send as query (discouraged) — still verify if present
			raw = strings.TrimSpace(c.Query("init_data"))
		}
		if raw == "" {
			response.Unauthorized(c, "X-Telegram-Init-Data header required. Open the app from Telegram.")
			c.Abort()
			return
		}

		authData, err := validator.ValidateInitDataStrict(raw, maxAgeSeconds)
		if err != nil {
			response.Unauthorized(c, "Invalid Telegram session: "+err.Error())
			c.Abort()
			return
		}

		tgID := authData.User.ID
		user, err := userRepo.GetByTelegramID(c.Request.Context(), tgID)
		if err != nil || user == nil {
			response.Unauthorized(c, "User not registered. Please authenticate via /auth/telegram first.")
			c.Abort()
			return
		}

		if user.IsBanned {
			response.Forbidden(c, "Account suspended")
			c.Abort()
			return
		}

		// Optional JWT must match the same Telegram identity (blocks stolen/swapped tokens)
		authHeader := c.GetHeader("Authorization")
		if authHeader != "" {
			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
				claims, jwtErr := jwtManager.ValidateToken(parts[1])
				if jwtErr != nil {
					response.Unauthorized(c, "Invalid or expired session token")
					c.Abort()
					return
				}
				if claims.TelegramID != tgID {
					response.Unauthorized(c, "Session token does not match Telegram identity")
					c.Abort()
					return
				}
				if claims.UserID != 0 && claims.UserID != user.ID {
					response.Unauthorized(c, "Session token user mismatch")
					c.Abort()
					return
				}
			}
		}

		c.Set(CtxUserIDKey, user.ID)
		c.Set(CtxTelegramIDKey, tgID)
		c.Set(CtxUsernameKey, user.Username)
		c.Set(CtxInitDataVerifiedKey, true)

		c.Next()
	}
}

// RequireInitDataVerified aborts if previous middleware did not verify initData
func RequireInitDataVerified() gin.HandlerFunc {
	return func(c *gin.Context) {
		if v, ok := c.Get(CtxInitDataVerifiedKey); !ok || v != true {
			response.Unauthorized(c, "Telegram initData verification required")
			c.Abort()
			return
		}
		c.Next()
	}
}
