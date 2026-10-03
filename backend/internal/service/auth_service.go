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
		ctx,
		authData.User.ID,
		authData.User.Username,
		authData.User.FirstName,
		photoURL,
		authData.User.IsPremium,
		nil,
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
			_, _ = s.userRepo.MutateBalances(ctx, *user.ReferrerID, refConfig.ReferrerSpins, refConfig.ReferrerDiamonds, refConfig.ReferrerUSD, 0)
			if s.botClient != nil {
				referrer, _ := s.userRepo.GetByID(ctx, *user.ReferrerID)
				if referrer != nil && referrer.TelegramID != 0 {
					_ = s.botClient.SendMessage(referrer.TelegramID,
						fmt.Sprintf("🎉 <b>New Referral!</b>\n\n👤 <b>%s</b> joined via your link.", user.FirstName), nil)
				}
			}
		} else if user.ReferrerID == nil {
			user, _ = s.userRepo.MutateBalances(ctx, user.ID, refConfig.InitialOrganicSpins, 0, 0, 0)
		}
	}

	isAdmin := false
	if s.cfg != nil {
		isAdmin = s.cfg.IsAdminTelegramID(authData.User.ID)
	}

	token, err := s.jwtManager.GenerateToken(user.ID, user.TelegramID, user.Username)
	if err != nil {
		return nil, fmt.Errorf("failed to issue session: %w", err)
	}

	return &model.AuthResponse{
		Token:     token,
		User:      user,
		IsNewUser: isNew,
		IsAdmin:   isAdmin,
	}, nil
}
