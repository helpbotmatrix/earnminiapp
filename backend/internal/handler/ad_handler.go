package handler

import (
	"earnminiapp/internal/middleware"
	"earnminiapp/internal/service"
	"earnminiapp/pkg/response"
	"github.com/gin-gonic/gin"
)

type AdHandler struct {
	adService *service.AdService
}

func NewAdHandler(adService *service.AdService) *AdHandler {
	return &AdHandler{adService: adService}
}

func (h *AdHandler) GetPublicConfig(c *gin.Context) {
	cfg := h.adService.GetConfig(c.Request.Context())
	response.Success(c, cfg.PublicMap())
}

func (h *AdHandler) CreateSession(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		response.Unauthorized(c, "Unauthorized")
		return
	}
	var req struct {
		Purpose string `json:"purpose"`
		Network string `json:"network"` // optional force network
	}
	_ = c.ShouldBindJSON(&req)
	if req.Purpose == "" {
		req.Purpose = "direct"
	}
	sid, network, extras, err := h.adService.CreateSession(c.Request.Context(), userID, req.Purpose)
	if err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	// optional client force network is ignored for security — server decides from admin config
	_ = req.Network
	data := gin.H{
		"session_id": sid,
		"network":    network,
		"purpose":    req.Purpose,
		"expires_in": 600,
	}
	for k, v := range extras {
		data[k] = v
	}
	response.Success(c, data)
}

func (h *AdHandler) CompleteSession(c *gin.Context) {
	userID := middleware.GetUserID(c)
	if userID == 0 {
		response.Unauthorized(c, "Unauthorized")
		return
	}
	var req struct {
		SessionID string `json:"session_id"`
		Purpose   string `json:"purpose"`
		Done      bool   `json:"done"`
		Network   string `json:"network"`
	}
	if err := c.ShouldBindJSON(&req); err != nil || req.SessionID == "" {
		response.BadRequest(c, "session_id required")
		return
	}
	if !req.Done {
		response.BadRequest(c, "ad not completed")
		return
	}
	if err := h.adService.MarkCompleted(c.Request.Context(), userID, req.SessionID, req.Purpose); err != nil {
		response.BadRequest(c, err.Error())
		return
	}
	response.SuccessWithMessage(c, "Ad completed", gin.H{
		"session_id": req.SessionID,
		"verified":   true,
		"network":    req.Network,
	})
}
