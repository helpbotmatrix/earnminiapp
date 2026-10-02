# ===============================================================
# EarnMiniApp — Railway Production Image (Frontend + Backend)
# ===============================================================

# ----- Frontend build -----
FROM node:22-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --omit=dev=false
COPY frontend/ ./
ARG VITE_API_BASE_URL=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ----- Backend build -----
# Base image 1.23 is widely cached on Railway; GOTOOLCHAIN=auto downloads
# Go 1.25+ when modules (gin v1.12, pgx v5.10) require it.
FROM golang:1.23-alpine AS backend-builder
WORKDIR /app
ENV GOTOOLCHAIN=auto
RUN apk add --no-cache git ca-certificates tzdata
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ ./
RUN go mod tidy
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -ldflags="-w -s" -o server ./cmd/server/main.go

# ----- Runtime -----
FROM alpine:3.19
WORKDIR /app
RUN apk --no-cache add ca-certificates tzdata wget
COPY --from=backend-builder /app/server .
COPY --from=backend-builder /app/internal/db/schema.sql ./internal/db/schema.sql
COPY --from=frontend-builder /frontend/dist ./static
RUN mkdir -p uploads
ENV PORT=8080
ENV APP_ENV=production
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-8080}/health || exit 1
CMD ["./server"]
