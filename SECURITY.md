# Security Model (Telegram Mini App)

## User APIs
1. `POST /api/v1/auth/telegram` — validates `initData` HMAC with bot token, rejects stale `auth_date` (>24h), issues JWT.
2. **Every protected user API** requires header:
   - `X-Telegram-Init-Data: <Telegram.WebApp.initData>`
   - Server re-verifies HMAC + freshness on **each** request.
3. Optional `Authorization: Bearer <JWT>` must match the same `telegram_id` as initData (anti token-swap).
4. User must exist in DB and not be banned.

## What this blocks
- Forging requests with fake telegram_id (no bot token → cannot forge HMAC)
- Replaying very old initData sessions
- Using a stolen JWT with a different Telegram account’s initData
- Calling APIs from outside Telegram without valid signed initData

## Admin APIs
- Separate `POST /admin/auth` with `ADMIN_SECRET_KEY` (constant-time compare)
- Admin JWT / sub-admin RBAC
- Not granted via normal user login

## Ops checklist
- Set strong `TELEGRAM_BOT_TOKEN`, `JWT_SECRET`, `ADMIN_SECRET_KEY`
- Set `ALLOWED_ORIGINS` to your Railway HTTPS origin (optional extra lock)
- Never commit real secrets
