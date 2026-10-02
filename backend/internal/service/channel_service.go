package service

import (
	"context"
	"errors"
	"fmt"
	"strconv"
	"strings"

	"earnminiapp/internal/model"
	"earnminiapp/internal/repository"
	"earnminiapp/internal/telegram"

	"github.com/jackc/pgx/v5/pgxpool"
)

type ChannelService struct {
	pool            *pgxpool.Pool
	userRepo        *repository.UserRepository
	settingsRepo    *repository.SystemSettingsRepository
	txRepo          *repository.TransactionRepository
	joinRequestRepo *repository.JoinRequestRepository
	botClient       *telegram.BotClient
}

func NewChannelService(
	pool *pgxpool.Pool,
	userRepo *repository.UserRepository,
	settingsRepo *repository.SystemSettingsRepository,
	txRepo *repository.TransactionRepository,
	joinRequestRepo *repository.JoinRequestRepository,
	botClient *telegram.BotClient,
) *ChannelService {
	return &ChannelService{
		pool:            pool,
		userRepo:        userRepo,
		settingsRepo:    settingsRepo,
		txRepo:          txRepo,
		joinRequestRepo: joinRequestRepo,
		botClient:       botClient,
	}
}

func (s *ChannelService) getOfficialChannelConfig(ctx context.Context) (username, link, channelID string, spins int, diamonds int64) {
	username = "@SpinCraftNews"
	link = "https://t.me/SpinCraftNews"
	channelID = ""
	spins = 3
	diamonds = 500

	if s.settingsRepo != nil {
		if val, err := s.settingsRepo.Get(ctx, "official_channel_username"); err == nil && val != "" {
			username = val
		}
		if val, err := s.settingsRepo.Get(ctx, "official_channel_link"); err == nil && val != "" {
			link = val
		}
		if val, err := s.settingsRepo.Get(ctx, "official_channel_id"); err == nil && val != "" {
			channelID = val
			if (link == "" || link == "https://t.me/SpinCraftNews") && s.botClient != nil {
				if exported, err := s.botClient.ExportChatInviteLink(channelID); err == nil && exported != "" {
					link = exported
				}
			}
		}
		if (link == "" || link == "https://t.me/SpinCraftNews") && username != "" && username != "@SpinCraftNews" {
			cleanUser := strings.TrimPrefix(username, "@")
			if cleanUser != "" {
				link = fmt.Sprintf("https://t.me/%s", cleanUser)
			}
		}
		if val, err := s.settingsRepo.Get(ctx, "official_channel_reward_spins"); err == nil && val != "" {
			if parsed, err := strconv.Atoi(val); err == nil && parsed > 0 {
				spins = parsed
			}
		}
		if val, err := s.settingsRepo.Get(ctx, "official_channel_reward_diamonds"); err == nil && val != "" {
			if parsed, err := strconv.ParseInt(val, 10, 64); err == nil && parsed > 0 {
				diamonds = parsed
			}
		}
	}

	return username, link, channelID, spins, diamonds
}

func (s *ChannelService) GetOfficialChannelStatus(ctx context.Context, userID int64) (*model.OfficialChannelStatusResponse, error) {
	if s.userRepo == nil {
		username, link, _, spins, diamonds := s.getOfficialChannelConfig(ctx)
		return &model.OfficialChannelStatusResponse{
			ChannelUsername:      username,
			ChannelUsernameCamel: username,
			ChannelLink:          link,
			ChannelLinkCamel:     link,
			RewardSpins:          spins,
			RewardSpinsCamel:     spins,
			RewardDiamonds:       diamonds,
			RewardDiamondsCamel:  diamonds,
			RewardGemsCamel:      diamonds,
			HasClaimed:           false,
			HasClaimedCamel:      false,
			HasClaimedReward:     false,
		}, nil
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user: %w", err)
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	username, link, _, spins, diamonds := s.getOfficialChannelConfig(ctx)

	return &model.OfficialChannelStatusResponse{
		ChannelUsername:      username,
		ChannelUsernameCamel: username,
		ChannelLink:          link,
		ChannelLinkCamel:     link,
		RewardSpins:          spins,
		RewardSpinsCamel:     spins,
		RewardDiamonds:       diamonds,
		RewardDiamondsCamel:  diamonds,
		RewardGemsCamel:      diamonds,
		HasClaimed:           user.HasClaimedChannelReward,
		HasClaimedCamel:      user.HasClaimedChannelReward,
		HasClaimedReward:     user.HasClaimedChannelReward,
	}, nil
}

func (s *ChannelService) VerifyOfficialChannelJoin(ctx context.Context, userID int64) (*model.OfficialChannelClaimResponse, error) {
	if s.userRepo == nil {
		return nil, errors.New("user repository unavailable")
	}

	user, err := s.userRepo.GetByID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch user: %w", err)
	}
	if user == nil {
		return nil, errors.New("user not found")
	}

	if user.HasClaimedChannelReward {
		return nil, errors.New("official channel reward has already been claimed")
	}

	username, _, channelID, spins, diamonds := s.getOfficialChannelConfig(ctx)

	targetChannel := channelID
	if targetChannel == "" {
		targetChannel = username
	}
	if targetChannel == "" {
		targetChannel = "@SpinCraftNews"
	}

	isMember := false
	if s.botClient != nil && targetChannel != "" {
		var err error
		isMember, err = s.botClient.IsUserInChannel(targetChannel, user.TelegramID)
		if err != nil || !isMember {
			if s.joinRequestRepo != nil {
				hasRequested, _ := s.joinRequestRepo.HasUserRequestedJoin(ctx, targetChannel, user.TelegramID)
				if hasRequested {
					isMember = true
				}
			}
		}
	}

	if !isMember {
		return nil, errors.New("please join the official Telegram channel or send a join request first before claiming your reward")
	}

	desc := fmt.Sprintf("+%d Spins, +%d 💎", spins, diamonds)
	updatedUser, err := s.userRepo.ClaimChannelRewardAtomic(ctx, userID, spins, diamonds, "Official Channel Join Reward", desc)
	if err != nil {
		return nil, err
	}

	userResp := ToUserResponse(updatedUser)
	return &model.OfficialChannelClaimResponse{
		Success:             true,
		Message:             "Official channel join verified and reward claimed! 🎉",
		RewardSpins:         spins,
		RewardSpinsCamel:    spins,
		RewardDiamonds:      diamonds,
		RewardDiamondsCamel: diamonds,
		User:                &userResp,
		UserBalance:         &userResp,
	}, nil
}

// ListRequiredOnboardingChannels returns channels admin marked required_on_entry.
// If none configured, gateEnabled=false and frontend must not show the list.
func (s *ChannelService) ListRequiredOnboardingChannels(ctx context.Context, userID int64) (map[string]interface{}, error) {
	out := map[string]interface{}{
		"gate_enabled": false,
		"all_joined":   true,
		"channels":     []map[string]interface{}{},
	}
	if s.pool == nil {
		return out, nil
	}

	rows, err := s.pool.Query(ctx, `
		SELECT id, chat_id, COALESCE(type,''), COALESCE(title,''), COALESCE(username,''), COALESCE(invite_link,'')
		FROM connected_chats
		WHERE COALESCE(required_on_entry, false) = true AND COALESCE(is_active, true) = true
		ORDER BY id ASC
	`)
	if err != nil {
		return out, nil // table/cols missing => no gate
	}
	defer rows.Close()

	var list []map[string]interface{}
	for rows.Next() {
		var id int64
		var chatID, typ, title, username, invite string
		if err := rows.Scan(&id, &chatID, &typ, &title, &username, &invite); err != nil {
			continue
		}
		link := invite
		if link == "" && username != "" {
			u := strings.TrimPrefix(username, "@")
			link = "https://t.me/" + u
		}
		joined := false
		if s.userRepo != nil && s.botClient != nil {
			user, _ := s.userRepo.GetByID(ctx, userID)
			if user != nil {
				target := chatID
				if target == "" {
					target = username
				}
				if target != "" {
					ok, _ := s.botClient.IsUserInChannel(target, user.TelegramID)
					if ok {
						joined = true
					} else if s.joinRequestRepo != nil {
						jr, _ := s.joinRequestRepo.HasUserRequestedJoin(ctx, target, user.TelegramID)
						joined = jr
					}
				}
			}
		}
		list = append(list, map[string]interface{}{
			"id":         id,
			"chat_id":    chatID,
			"type":       typ,
			"title":      title,
			"username":   username,
			"invite_link": link,
			"joined":     joined,
		})
	}

	if len(list) == 0 {
		return out, nil
	}

	allJoined := true
	for _, c := range list {
		if j, ok := c["joined"].(bool); !ok || !j {
			allJoined = false
			break
		}
	}

	// Persist gate if already all joined
	if allJoined && s.pool != nil && userID > 0 {
		_, _ = s.pool.Exec(ctx, `UPDATE users SET channels_gate_passed = true WHERE id = $1`, userID)
		_ = s.applyPendingReferral(ctx, userID)
	}

	out["gate_enabled"] = true
	out["all_joined"] = allJoined
	out["channels"] = list
	return out, nil
}

// VerifyRequiredOnboardingChannels checks membership for every required channel then unlocks referral.
func (s *ChannelService) VerifyRequiredOnboardingChannels(ctx context.Context, userID int64) (map[string]interface{}, error) {
	status, err := s.ListRequiredOnboardingChannels(ctx, userID)
	if err != nil {
		return nil, err
	}
	if enabled, _ := status["gate_enabled"].(bool); !enabled {
		return status, nil
	}
	if all, _ := status["all_joined"].(bool); !all {
		return nil, errors.New("please join all required channels first")
	}
	if s.pool != nil {
		_, _ = s.pool.Exec(ctx, `UPDATE users SET channels_gate_passed = true, has_claimed_channel_reward = true WHERE id = $1`, userID)
	}
	_ = s.applyPendingReferral(ctx, userID)
	status["all_joined"] = true
	status["referral_unlocked"] = true
	return status, nil
}

func (s *ChannelService) applyPendingReferral(ctx context.Context, userID int64) error {
	if s.pool == nil || s.userRepo == nil {
		return nil
	}
	var pending *int64
	var referrerID *int64
	var gate bool
	err := s.pool.QueryRow(ctx, `
		SELECT pending_referrer_tg, referrer_id, COALESCE(channels_gate_passed, false)
		FROM users WHERE id = $1
	`, userID).Scan(&pending, &referrerID, &gate)
	if err != nil || !gate {
		return err
	}
	if referrerID != nil || pending == nil || *pending == 0 {
		return nil
	}
	refUser, err := s.userRepo.GetByTelegramID(ctx, *pending)
	if err != nil || refUser == nil || refUser.ID == userID {
		return nil
	}
	_, _ = s.pool.Exec(ctx, `
		UPDATE users SET referrer_id = $1, pending_referrer_tg = NULL WHERE id = $2 AND referrer_id IS NULL
	`, refUser.ID, userID)
	// Minimal referrer reward (1 spin) — full welcome already deferred from auth
	_, _ = s.userRepo.MutateBalances(ctx, refUser.ID, 1, 50, 0, 0)
	if s.botClient != nil && refUser.TelegramID != 0 {
		_ = s.botClient.SendMessage(refUser.TelegramID, "🎉 Your referral joined all required channels! Rewards unlocked.", nil)
	}
	return nil
}

// CountRequiredChannels for auth decision
func (s *ChannelService) HasRequiredChannelGate(ctx context.Context) bool {
	if s.pool == nil {
		return false
	}
	var n int
	_ = s.pool.QueryRow(ctx, `
		SELECT COUNT(*) FROM connected_chats
		WHERE COALESCE(required_on_entry, false) = true AND COALESCE(is_active, true) = true
	`).Scan(&n)
	return n > 0
}
