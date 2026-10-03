package handler

import (
	"strings"

	"earnminiapp/pkg/response"
	"github.com/gin-gonic/gin"
)

// BrowserAdminLink issues an admin JWT URL for opening /became-admin in an external browser.
// Requires user JWT; telegram_id must be listed in ADMIN_TELEGRAM_IDS.
func (h *AdminHandler) BrowserAdminLink(c *gin.Context) {
	uid, ok := c.Get("userID")
	if !ok {
		response.Unauthorized(c, "login required")
		return
	}
	userID, _ := uid.(int64)
	if userID == 0 {
		if f, ok2 := uid.(float64); ok2 {
			userID = int64(f)
		}
	}
	user, err := h.userRepo.GetByID(c.Request.Context(), userID)
	if err != nil || user == nil {
		response.Unauthorized(c, "user not found")
		return
	}
	if h.cfg == nil || !h.cfg.IsAdminTelegramID(user.TelegramID) {
		response.Forbidden(c, "not an admin")
		return
	}
	secret := ""
	if h.cfg != nil {
		secret = h.cfg.AdminSecretKey
	}
	authResp, err := h.adminService.AuthenticateAdmin(secret)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	base := ""
	if h.cfg != nil {
		base = h.cfg.ServerBaseURL
	}
	if base == "" {
		base = "https://earnminiapp-production.up.railway.app"
	}
	base = strings.TrimRight(base, "/")
	url := base + "/became-admin/?t=" + authResp.Token
	response.Success(c, gin.H{"url": url, "token": authResp.Token})
}
