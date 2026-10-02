# Feature status (this build)

## Implemented / Hardened now
- **AdsGram only** SDK path (`sad.adsgram.ai`); client fake-success removed
- **Server ad sessions**: `POST /ads/session` → watch → `POST /ads/complete` (one-time Redis proof)
- **Admin ads gates**: spin / check-in / task / withdraw / direct toggles + block id
- **Spin goal curve**: `goal_usd`, `spins_to_goal_min/max` from system_settings (early big, late small)
- **Payout mode** already in wallet: manual / settings `payout_mode` + auto on-chain when configured
- **Security**: initData every request, JWT match, no unsigned Telegram auth
- **Railway**: single Dockerfile serves API + SPA

## Already in codebase (use Admin panel)
- Tasks type `watch_ad` (AdsGram)
- Contests, raffles, broadcast jobs, gift codes, sub-admins
- Wallet bind + USDT BEP-20 withdraw pipeline
- Daily rewards + optional double via ad (frontend)
- System settings / wheel weights / referral rewards

## Configure without code change (Admin / env)
| Key | Meaning |
|-----|---------|
| adsgram_enabled | Master ad switch |
| adsgram_block_id | AdsGram block id |
| ads_require_* | Force full ad before action |
| goal_usd | Target balance for early curve |
| spins_to_goal_min/max | Spins range to fill goal |
| payout_mode | manual / auto / approve |
| TELEGRAM_BOT_TOKEN, JWT_SECRET, ADMIN_SECRET_KEY | Env on Railway |

## Icons
Prefer existing animated/3D assets under `frontend/public/assets/` (coin_3d, diamond_animated, etc.). Replace any emoji-only UI via Admin task icon upload.

## Not fully automated in this pass
- Separate third ad network SDK (AdsGram-only as requested)
- Per-segment "display only 0% chance jackpot" UI labels (weights 0 already hide real payout via admin wheel weights)
- Mass live broadcast scale testing under 1M users (queue worker exists; scale Redis/Postgres on Railway)
