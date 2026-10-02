package service

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"

	"earnminiapp/internal/db"
	"earnminiapp/internal/repository"
)

// AdService issues short-lived one-time ad session tokens so rewards cannot be claimed
// without a completed ad play (server-side proof). Supports AdsGram, GigaPub, Monetag.
type AdService struct {
	settingsRepo *repository.SystemSettingsRepository
	redis        *db.RedisService
}

func NewAdService(settingsRepo *repository.SystemSettingsRepository, redis *db.RedisService) *AdService {
	return &AdService{settingsRepo: settingsRepo, redis: redis}
}

type AdGateConfig struct {
	Enabled           bool
	PrimaryNetwork    string // adsgram | gigapub | monetag
	AdsgramBlockID    string
	GigaPubProjectID  string
	MonetagZoneID     string
	MonetagSdkFn      string // e.g. show_1234567
	MonetagScriptURL  string // optional full script src from dashboard
	RequireOnSpin     bool
	RequireOnCheckIn  bool
	RequireOnTask     bool
	RequireOnWithdraw bool
	RequireOnDirect   bool
	// Optional per-placement network override (empty = primary)
	NetworkSpin     string
	NetworkCheckIn  string
	NetworkTask     string
	NetworkWithdraw string
	NetworkDirect   string
}

func (s *AdService) get(ctx context.Context, key string) string {
	if s.settingsRepo == nil {
		return ""
	}
	v, _ := s.settingsRepo.Get(ctx, key)
	return v
}

func (s *AdService) GetConfig(ctx context.Context) AdGateConfig {
	cfg := AdGateConfig{
		PrimaryNetwork: "adsgram",
	}
	if v := s.get(ctx, "adsgram_enabled"); v == "true" || v == "1" {
		cfg.Enabled = true
	}
	// Also enable if master ads_enabled
	if v := s.get(ctx, "ads_enabled"); v == "true" || v == "1" {
		cfg.Enabled = true
	}
	if v := s.get(ctx, "primary_ad_network"); v != "" {
		cfg.PrimaryNetwork = strings.ToLower(strings.TrimSpace(v))
	} else if v := s.get(ctx, "ad_network"); v != "" {
		cfg.PrimaryNetwork = strings.ToLower(strings.TrimSpace(v))
	}
	cfg.AdsgramBlockID = s.get(ctx, "adsgram_block_id")
	cfg.GigaPubProjectID = s.get(ctx, "gigapub_project_id")
	if cfg.GigaPubProjectID == "" {
		cfg.GigaPubProjectID = s.get(ctx, "gigapub_id")
	}
	cfg.MonetagZoneID = s.get(ctx, "monetag_zone_id")
	if cfg.MonetagZoneID == "" {
		cfg.MonetagZoneID = s.get(ctx, "monetag_zone")
	}
	cfg.MonetagSdkFn = s.get(ctx, "monetag_sdk_fn")
	if cfg.MonetagSdkFn == "" && cfg.MonetagZoneID != "" {
		cfg.MonetagSdkFn = "show_" + cfg.MonetagZoneID
	}
	cfg.MonetagScriptURL = s.get(ctx, "monetag_script_url")

	cfg.RequireOnSpin = s.get(ctx, "ads_require_spin") == "true"
	cfg.RequireOnCheckIn = s.get(ctx, "ads_require_checkin") == "true"
	cfg.RequireOnTask = s.get(ctx, "ads_require_task") == "true"
	cfg.RequireOnWithdraw = s.get(ctx, "ads_require_withdraw") == "true"
	cfg.RequireOnDirect = s.get(ctx, "ads_require_direct") == "true"

	cfg.NetworkSpin = s.get(ctx, "ads_network_spin")
	cfg.NetworkCheckIn = s.get(ctx, "ads_network_checkin")
	cfg.NetworkTask = s.get(ctx, "ads_network_task")
	cfg.NetworkWithdraw = s.get(ctx, "ads_network_withdraw")
	cfg.NetworkDirect = s.get(ctx, "ads_network_direct")

	return cfg
}

func (c AdGateConfig) NetworkFor(purpose string) string {
	var o string
	switch purpose {
	case "spin":
		o = c.NetworkSpin
	case "checkin":
		o = c.NetworkCheckIn
	case "task":
		o = c.NetworkTask
	case "withdraw":
		o = c.NetworkWithdraw
	case "direct":
		o = c.NetworkDirect
	}
	if o != "" {
		return strings.ToLower(o)
	}
	return c.PrimaryNetwork
}

func (c AdGateConfig) PublicMap() map[string]interface{} {
	return map[string]interface{}{
		"ads_enabled":            c.Enabled,
		"adsgram_enabled":        c.Enabled,
		"primary_ad_network":     c.PrimaryNetwork,
		"ad_network":             c.PrimaryNetwork,
		"adsgram_block_id":       c.AdsgramBlockID,
		"gigapub_project_id":     c.GigaPubProjectID,
		"monetag_zone_id":        c.MonetagZoneID,
		"monetag_sdk_fn":         c.MonetagSdkFn,
		"monetag_script_url":     c.MonetagScriptURL,
		"ads_require_spin":       c.RequireOnSpin,
		"ads_require_checkin":    c.RequireOnCheckIn,
		"ads_require_task":       c.RequireOnTask,
		"ads_require_withdraw":   c.RequireOnWithdraw,
		"ads_require_direct":     c.RequireOnDirect,
		"ads_network_spin":       c.NetworkSpin,
		"ads_network_checkin":    c.NetworkCheckIn,
		"ads_network_task":       c.NetworkTask,
		"ads_network_withdraw":   c.NetworkWithdraw,
		"ads_network_direct":     c.NetworkDirect,
		"networks":               []string{"adsgram", "gigapub", "monetag"},
	}
}

func (s *AdService) CreateSession(ctx context.Context, userID int64, purpose string) (sessionID string, network string, extras map[string]string, err error) {
	cfg := s.GetConfig(ctx)
	if !cfg.Enabled {
		return "", "", nil, errors.New("ads are disabled by admin")
	}
	if purpose == "" {
		purpose = "direct"
	}
	network = cfg.NetworkFor(purpose)
	extras = map[string]string{}

	switch network {
	case "gigapub":
		if cfg.GigaPubProjectID == "" {
			return "", "", nil, errors.New("gigapub project id not configured in admin panel")
		}
		extras["project_id"] = cfg.GigaPubProjectID
	case "monetag":
		if cfg.MonetagZoneID == "" {
			return "", "", nil, errors.New("monetag zone id not configured in admin panel")
		}
		extras["zone_id"] = cfg.MonetagZoneID
		extras["sdk_fn"] = cfg.MonetagSdkFn
		if cfg.MonetagScriptURL != "" {
			extras["script_url"] = cfg.MonetagScriptURL
		}
	default:
		network = "adsgram"
		if cfg.AdsgramBlockID == "" {
			return "", "", nil, errors.New("adsgram block id not configured in admin panel")
		}
		extras["block_id"] = cfg.AdsgramBlockID
	}

	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", "", nil, err
	}
	sessionID = hex.EncodeToString(b)
	key := fmt.Sprintf("ad:sess:%d:%s", userID, sessionID)
	payload := purpose + "|" + network + "|pending|" + strconv.FormatInt(time.Now().Unix(), 10)
	if s.redis != nil {
		_ = s.redis.Set(ctx, key, payload, 10*time.Minute)
	}
	return sessionID, network, extras, nil
}

func (s *AdService) MarkCompleted(ctx context.Context, userID int64, sessionID, purpose string) error {
	if sessionID == "" {
		return errors.New("ad session required")
	}
	key := fmt.Sprintf("ad:sess:%d:%s", userID, sessionID)
	if s.redis == nil {
		return errors.New("ad verification unavailable")
	}
	val, err := s.redis.Get(ctx, key)
	if err != nil || val == "" {
		return errors.New("invalid or expired ad session")
	}
	parts := strings.Split(val, "|")
	net := "adsgram"
	if len(parts) >= 2 {
		net = parts[1]
	}
	if purpose == "" && len(parts) > 0 {
		purpose = parts[0]
	}
	_ = s.redis.Set(ctx, key, purpose+"|"+net+"|completed|"+strconv.FormatInt(time.Now().Unix(), 10), 5*time.Minute)
	return nil
}

func (s *AdService) ConsumeProof(ctx context.Context, userID int64, sessionID, expectedPurpose string) error {
	cfg := s.GetConfig(ctx)
	need := false
	switch expectedPurpose {
	case "spin":
		need = cfg.RequireOnSpin
	case "checkin":
		need = cfg.RequireOnCheckIn
	case "task":
		need = cfg.RequireOnTask
	case "withdraw":
		need = cfg.RequireOnWithdraw
	case "direct":
		need = cfg.RequireOnDirect
	default:
		need = cfg.Enabled
	}
	if !cfg.Enabled || !need {
		return nil
	}
	if sessionID == "" {
		return errors.New("watch the full ad to continue")
	}
	if s.redis == nil {
		return errors.New("ad verification unavailable")
	}
	key := fmt.Sprintf("ad:sess:%d:%s", userID, sessionID)
	val, err := s.redis.Get(ctx, key)
	if err != nil || val == "" {
		return errors.New("ad proof missing or expired — watch the full ad")
	}
	if !strings.Contains(val, "|completed|") {
		return errors.New("ad was not completed — no reward")
	}
	if expectedPurpose != "" && !strings.HasPrefix(val, expectedPurpose+"|") {
		return errors.New("ad session purpose mismatch")
	}
	_ = s.redis.Del(ctx, key)
	return nil
}
