package service

import (
	"context"
	"encoding/json"
	"fmt"
	"strconv"
	"strings"

	"earnminiapp/internal/config"
	"earnminiapp/internal/model"
	"earnminiapp/internal/repository"
	"earnminiapp/internal/telegram"
	"earnminiapp/pkg/jwt"
)

type AuthService struct {
	userRepo      *repository.UserRepository
	txRepo        *repository.TransactionRepository
	settingsRepo  *repository.SystemSettingsRepository
	authValidator *telegram.AuthValidator
	jwtManager    *jwt.JWTManager
	botClient     *telegram.BotClient
	cfg           *config.Config
}

func NewAuthService(
	userRepo *repository.UserRepository,
	txRepo *repository.TransactionRepository,
	settingsRepo *repository.SystemSettingsRepository,
	authValidator *telegram.AuthValidator,
	jwtManager *jwt.JWTManager,
	botClient *telegram.BotClient,
	cfg *config.Config,
) *AuthService {
	return &AuthService{
		userRepo:      userRepo,
		txRepo:        txRepo,
		settingsRepo:  settingsRepo,
		authValidator: authValidator,
		jwtManager:    jwtManager,
		botClient:     botClient,
		cfg:           cfg,
	}
}

func (s *AuthService) AuthenticateTelegram(ctx context.Context, initDataRaw, startParam string) (*model.AuthResponse, error) {
	authData, err := s.authValidator.ValidateInitDataStrict(initDataRaw, telegram.MaxInitDataAgeSeconds)
	if err != nil {
		return nil, fmt.Errorf("invalid telegram authentication: %w", err)
	}
	if authData.User == nil {
		return nil, fmt.Errorf("telegram user payload is missing")
	}

	var referrerTGID *int64
	param := authData.StartParam
	if param == "" {
		param = startParam
	}
	if param != "" {
		trimmed := strings.TrimPrefix(param, "ref_")
		if refID, err := strconv.ParseInt(trimmed, 10, 64); err == nil && refID > 0 {
			referrerTGID = &refID
		}
	}

	photoURL := authData.User.PhotoURL
	user, isNew, err := s.userRepo.UpsertFromTelegram(
		ctx, authData.User.ID, authData.User.Username, authData.User.FirstName,
		photoURL, authData.User.IsPremium, nil,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to sync user: %w", err)
	}

	if referrerTGID != nil && *referrerTGID > 0 && *referrerTGID != authData.User.ID {
		_ = s.userRepo.SetPendingReferrerTG(ctx, user.ID, *referrerTGID)
		_ = s.userRepo.ApplyPendingReferrerIfNoGate(ctx, user.ID)
		if refreshed, errR := s.userRepo.GetByID(ctx, user.ID); errR == nil && refreshed != nil {
			user = refreshed
		}
	}

	if isNew {
		refConfig := model.ReferralRewardSettings{
			InitialOrganicSpins: 12,
			ReferrerSpins:       1,
			ReferrerDiamonds:    100,
			ReferrerUSD:         0.05,
			WelcomeSpins:        3,
			WelcomeDiamonds:     200,
			WelcomeUSD:          0.00,
		}
		if s.settingsRepo != nil {
			raw, err := s.settingsRepo.Get(ctx, "referral_rewards_config")
			if err == nil && raw != "" {
				_ = json.Unmarshal([]byte(raw), &refConfig)
			}
		}

		if user.ReferrerID != nil {
			user, _ = s.userRepo.MutateBalances(ctx, user.ID, refConfig.WelcomeSpins, refConfig.WelcomeDiamonds, refConfig.WelcomeUSD, 0)
			_ = s.txRepo.Create(ctx, &model.Transaction{
				UserID: user.ID, Category: "team", Title: "Welcome Referral Gift",
				AmountUSD: refConfig.WelcomeUSD, AmountDiamonds: refConfig.WelcomeDiamonds, AmountSpins: refConfig.WelcomeSpins,
				Status: "completed", ReferenceID: fmt.Sprintf("WELCOME-%d", user.ID),
				Description: "Welcome gift for joining via invite",
			})
			_, _ = s.userRepo.MutateBalances(ctx, *user.ReferrerID, refConfig.ReferrerSpins, refConfig.ReferrerDiamonds, refConfig.ReferrerUSD, 0)
			_ = s.txRepo.Create(ctx, &model.Transaction{
				UserID: *user.ReferrerID, Category: "team", Title: fmt.Sprintf("New Referral (%s)", user.FirstName),
				AmountUSD: refConfig.ReferrerUSD, AmountDiamonds: refConfig.ReferrerDiamonds, AmountSpins: refConfig.ReferrerSpins,
				Status: "completed", ReferenceID: fmt.Sprintf("REF-%d-%d", *user.ReferrerID, user.ID),
				Description: "Reward for inviting a friend",
			})
			if s.botClient != nil {
				referrer, _ := s.userRepo.GetByID(ctx, *user.ReferrerID)
				if referrer != nil && referrer.TelegramID != 0 {
					_ = s.botClient.SendMessage(referrer.TelegramID,
						fmt.Sprintf("🎉 <b>New Referral Joined!</b>\n\n👤 <b>%s</b> joined via your invite link.", user.FirstName), nil)
				}
			}
		} else if refConfig.InitialOrganicSpins > 0 && refConfig.InitialOrganicSpins != 12 {
			delta := refConfig.InitialOrganicSpins - 12
			user, _ = s.userRepo.MutateBalances(ctx, user.ID, delta, 0, 0, 0)
		}
	}

	token, err := s.jwtManager.GenerateToken(user.ID, user.TelegramID, user.Username)
	if err != nil {
		return nil, fmt.Errorf("failed to generate session token: %w", err)
	}

	userResp := ToUserResponse(user)
	if s.cfg != nil && s.cfg.IsAdminTelegramID(user.TelegramID) {
		userResp.IsAdmin = true
	}

	return &model.AuthResponse{Token: token, User: userResp}, nil
}
