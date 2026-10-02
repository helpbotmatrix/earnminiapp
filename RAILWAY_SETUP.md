# EarnMiniApp — Railway Deploy (এক ক্লিক স্টাইল)

এই ZIP-এ **একটাই সার্ভিস**: Go backend + React frontend একসাথে।  
Mock বন্ধ (`useMockData: false`) — সব ডেটা backend/PostgreSQL থেকে আসে।

## ১) Railway এ প্রজেক্ট

1. https://railway.app → **New Project**
2. **Deploy from GitHub** (এই রিপো push করুন) অথবা **Empty Project** + CLI/`Dockerfile` upload
3. Root-এ `Dockerfile` + `railway.toml` আছে — Railway অটো detect করবে

## ২) Plugins যোগ করুন

একই project-এ:

- **PostgreSQL** → Variables এ `DATABASE_URL` অটো লিংক করুন
- **Redis** → Variables এ `REDIS_URL` অটো লিংক করুন

## ৩) Environment Variables

Service → **Variables** → `.env.example` অনুযায়ী সেট করুন। **আবশ্যক:**

| Variable | মান |
|----------|-----|
| `DATABASE_URL` | Postgres plugin থেকে |
| `REDIS_URL` | Redis plugin থেকে |
| `JWT_SECRET` | লম্বা র্যান্ডম স্ট্রিং |
| `TELEGRAM_BOT_TOKEN` | BotFather |
| `SERVER_BASE_URL` | `https://<your-app>.up.railway.app` |
| `ADMIN_SECRET_KEY` | Admin panel পাসফ্রেজ |
| `PORT` | Railway অটো দেয় (না দিলেও চলবে) |

## ৪) Deploy

Deploy শেষে:

- Health: `https://YOUR-APP.up.railway.app/health`
- API: `https://YOUR-APP.up.railway.app/api/v1/...`
- WebApp: একই URL (frontend SPA)

Telegram BotFather → Mini App URL = Railway public URL  
`SERVER_BASE_URL` সেট থাকলে webhook অটো রেজিস্টার হয়।

## ৫) Local test (ঐচ্ছিক)

```bash
# backend folder এ postgres+redis চালিয়ে
cd backend && cp ../.env.example .env
# .env এ DATABASE_URL / REDIS_URL ঠিক করুন
docker compose up -d postgres redis
go run ./cmd/server
```

Frontend আলাদা: `cd frontend && npm i && npm run dev`  
Production ZIP path: একই origin `/api/v1`।

## নোট

- Schema boot-এ auto-migrate হয় (`schema.sql`)
- Admin: app-এ secret key দিয়ে login
- BSC/USDT payout: Admin panel থেকে master vault generate/import
