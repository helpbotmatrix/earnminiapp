package handler

import (
	"strings"
	"time"

	"earnminiapp/pkg/response"
	"github.com/gin-gonic/gin"
)

// normalizeAssetPath turns ./assets/foo.png into /assets/foo.png so browser admin can load images.
func normalizeAssetPath(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return s
	}
	if strings.HasPrefix(s, "http://") || strings.HasPrefix(s, "https://") || strings.HasPrefix(s, "data:") {
		return s
	}
	s = strings.TrimPrefix(s, "./")
	s = strings.TrimPrefix(s, "../")
	if strings.HasPrefix(s, "assets/") {
		return "/" + s
	}
	if strings.HasPrefix(s, "/assets/") || strings.HasPrefix(s, "/uploads/") {
		return s
	}
	if strings.HasPrefix(s, "uploads/") {
		return "/" + s
	}
	return s
}

// ListTasks is GET /admin/tasks with normalized icon URLs (fixes raw ./assets text in admin UI).
func (h *AdminHandler) ListTasks(c *gin.Context) {
	rows, err := h.pool.Query(c.Request.Context(), `
		SELECT id, category, title, COALESCE(icon, ''), COALESCE(icon_url, ''),
		       is_icon_image, reward_gems, COALESCE(reward_spins, 0), secondary_reward_gems,
		       target_count, task_type, COALESCE(action_url, ''), COALESCE(channel_id, ''), is_active, created_at
		FROM tasks
		ORDER BY created_at DESC
	`)
	if err != nil {
		response.InternalError(c, err.Error())
		return
	}
	defer rows.Close()

	var list []gin.H
	for rows.Next() {
		var id string
		var category, title, icon, iconURL, actionURL, channelID, taskType string
		var rewardGems, rewardSpins, secondaryRewardGems, targetCount int
		var isIconImage, isActive bool
		var createdAt time.Time

		if err := rows.Scan(&id, &category, &title, &icon, &iconURL, &isIconImage, &rewardGems, &rewardSpins, &secondaryRewardGems, &targetCount, &taskType, &actionURL, &channelID, &isActive, &createdAt); err != nil {
			continue
		}
		icon = normalizeAssetPath(icon)
		iconURL = normalizeAssetPath(iconURL)
		if iconURL == "" {
			iconURL = icon
		}
		if icon == "" {
			icon = iconURL
		}
		list = append(list, gin.H{
			"id": id, "taskId": id, "task_id": id,
			"category": category, "title": title,
			"icon": icon, "iconUrl": iconURL, "icon_url": iconURL,
			"isIconImage": isIconImage || strings.Contains(icon, "/assets/") || strings.Contains(icon, "/uploads/"),
			"is_icon_image": isIconImage || strings.Contains(icon, "/assets/") || strings.Contains(icon, "/uploads/"),
			"rewardGems": rewardGems, "reward_gems": rewardGems,
			"rewardDiamonds": rewardGems, "reward_diamonds": rewardGems,
			"rewardSpins": rewardSpins, "reward_spins": rewardSpins,
			"secondaryRewardGems": secondaryRewardGems,
			"targetCount": targetCount, "target_count": targetCount,
			"taskType": taskType, "task_type": taskType,
			"actionUrl": actionURL, "action_url": actionURL,
			"channelId": channelID, "channel_id": channelID,
			"isActive": isActive, "is_active": isActive,
			"createdAt": createdAt.UTC().Format(time.RFC3339),
			"created_at": createdAt.UTC().Format(time.RFC3339),
		})
	}
	response.Success(c, list)
}
