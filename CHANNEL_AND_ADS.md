# Required channels + Ads on/off

## Required channel list (Admin)
1. Admin → Connected Chats → add chat with `required_on_entry: true`
2. If **no** such channels → app does **not** show forced channel list
3. If channels exist → user must join **all** → then `POST /user/required-channels/verify`
4. Referral (`referrer_id` / count) only after `channels_gate_passed` (pending referrer stored until then)

APIs:
- `GET /api/v1/user/required-channels`
- `POST /api/v1/user/required-channels/verify`

## Ads toggles (Admin system settings / ads config)
| Key | Effect |
|-----|--------|
| adsgram_enabled | Master on/off |
| ads_require_checkin | Daily check-in shows/requires ad |
| ads_require_spin | Spin gate (session proof) |
| ads_require_task | Task watch_ad |
| ads_require_withdraw | Withdraw gate |
| adsgram_block_id | AdsGram block id |

When `ads_require_checkin` is false, daily UI hides ad double-claim path.
