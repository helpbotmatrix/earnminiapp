package handler

import (
	"strconv"
	"strings"
	"time"

	"earnminiapp/pkg/response"
	"github.com/gin-gonic/gin"
)

// ListUsers is the fixed users list handler (COALESCE + time.Time + repo path).
// Wired from main as GET /admin/users.
func (h *AdminHandler) ListUsers(c *gin.Context) {
	search := strings.TrimPrefix(strings.TrimSpace(c.Query("search")), "@")
	if search == "" {
		search = strings.TrimPrefix(strings.TrimSpace(c.Query("q")), "@")
	}
	if search == "" {
		search = strings.TrimPrefix(strings.TrimSpace(c.Query("query")), "@")
	}
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "50"))
	offset, _ := strconv.Atoi(c.DefaultQuery("offset", "0"))
	if limit <= 0 || limit > 200 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	ctx := c.Request.Context()
	var totalUsers int64
	users := make([]gin.H, 0)

	if search != "" {
		searchParam := "%" + search + "%"
		_ = h.pool.QueryRow(ctx,
			`SELECT COUNT(*) FROM users WHERE COALESCE(username,'') ILIKE $1 OR COALESCE(first_name,'') ILIKE $1 OR CAST(telegram_id AS TEXT) ILIKE $1`,
			searchParam,
		).Scan(&totalUsers)

		rows, err := h.pool.Query(ctx, `
			SELECT id, telegram_id, COALESCE(username,''), COALESCE(first_name,''), level, energy, spins, diamonds, balance_usd,
			       COALESCE(ton_wallet,''), COALESCE(is_premium,false), COALESCE(is_banned,false), created_at
			FROM users
			WHERE COALESCE(username,'') ILIKE $1 OR COALESCE(first_name,'') ILIKE $1 OR CAST(telegram_id AS TEXT) ILIKE $1
			ORDER BY id DESC
			LIMIT $2 OFFSET $3
		`, searchParam, limit, offset)
		if err != nil {
			response.InternalError(c, err.Error())
			return
		}
		defer rows.Close()
		for rows.Next() {
			var id, telegramID, diamonds int64
			var username, firstName, tonWallet string
			var level, energy, spins int
			var balanceUSD float64
			var isPremium, isBanned bool
			var createdAt time.Time
			if err := rows.Scan(&id, &telegramID, &username, &firstName, &level, &energy, &spins, &diamonds, &balanceUSD, &tonWallet, &isPremium, &isBanned, &createdAt); err != nil {
				continue
			}
			createdStr := createdAt.UTC().Format(time.RFC3339)
			users = append(users, gin.H{
				"id": id, "userId": id, "user_id": id,
				"telegramId": telegramID, "telegram_id": telegramID,
				"username": username, "firstName": firstName, "first_name": firstName, "name": firstName,
				"level": level, "energy": energy, "spins": spins, "diamonds": diamonds, "gems": diamonds,
				"balanceUsd": balanceUSD, "balance_usd": balanceUSD,
				"tonWallet": tonWallet, "ton_wallet": tonWallet,
				"isPremium": isPremium, "is_premium": isPremium,
				"isBanned": isBanned, "is_banned": isBanned,
				"createdAt": createdStr, "created_at": createdStr,
			})
		}
	} else {
		_ = h.pool.QueryRow(ctx, `SELECT COUNT(*) FROM users`).Scan(&totalUsers)
		rows, err := h.pool.Query(ctx, `
			SELECT id, telegram_id, COALESCE(username,''), COALESCE(first_name,''), level, energy, spins, diamonds, balance_usd,
			       COALESCE(ton_wallet,''), COALESCE(is_premium,false), COALESCE(is_banned,false), created_at
			FROM users ORDER BY id DESC LIMIT $1 OFFSET $2
		`, limit, offset)
		if err != nil {
			response.InternalError(c, err.Error())
			return
		}
		defer rows.Close()
		for rows.Next() {
			var id, telegramID, diamonds int64
			var username, firstName, tonWallet string
			var level, energy, spins int
			var balanceUSD float64
			var isPremium, isBanned bool
			var createdAt time.Time
			if err := rows.Scan(&id, &telegramID, &username, &firstName, &level, &energy, &spins, &diamonds, &balanceUSD, &tonWallet, &isPremium, &isBanned, &createdAt); err != nil {
				continue
			}
			createdStr := createdAt.UTC().Format(time.RFC3339)
			users = append(users, gin.H{
				"id": id, "userId": id, "user_id": id,
				"telegramId": telegramID, "telegram_id": telegramID,
				"username": username, "firstName": firstName, "first_name": firstName, "name": firstName,
				"level": level, "energy": energy, "spins": spins, "diamonds": diamonds, "gems": diamonds,
				"balanceUsd": balanceUSD, "balance_usd": balanceUSD,
				"tonWallet": tonWallet, "ton_wallet": tonWallet,
				"isPremium": isPremium, "is_premium": isPremium,
				"isBanned": isBanned, "is_banned": isBanned,
				"createdAt": createdStr, "created_at": createdStr,
			})
		}
	}

	response.Success(c, gin.H{
		"users": users, "list": users, "items": users, "data": users,
		"total": totalUsers, "limit": limit, "offset": offset,
	})
}
