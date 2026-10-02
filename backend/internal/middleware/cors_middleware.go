package middleware

import (
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware restricts origins when ALLOWED_ORIGINS is set (comma-separated).
// If unset, reflects request Origin only for Telegram / localhost (safer than * + credentials).
func CORSMiddleware() gin.HandlerFunc {
	allowedRaw := strings.TrimSpace(os.Getenv("ALLOWED_ORIGINS"))
	var allowed []string
	if allowedRaw != "" {
		for _, o := range strings.Split(allowedRaw, ",") {
			o = strings.TrimSpace(o)
			if o != "" {
				allowed = append(allowed, o)
			}
		}
	}

	return func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		allowOrigin := ""

		if origin != "" {
			if len(allowed) > 0 {
				for _, a := range allowed {
					if a == "*" || a == origin {
						allowOrigin = origin
						break
					}
				}
			} else if isTrustedOrigin(origin) {
				allowOrigin = origin
			}
		}

		if allowOrigin != "" {
			c.Writer.Header().Set("Access-Control-Allow-Origin", allowOrigin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
			c.Writer.Header().Set("Vary", "Origin")
		}

		c.Writer.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Telegram-Init-Data, X-Requested-With, X-Admin-Secret, X-Alchemy-Signature, Bypass-Tunnel-Reminder, bypass-tunnel-reminder")
		c.Writer.Header().Set("Access-Control-Expose-Headers", "Content-Length, Content-Type, Content-Disposition")
		c.Writer.Header().Set("Access-Control-Max-Age", "86400")

		if c.Request.Method == http.MethodOptions {
			if allowOrigin == "" && origin != "" {
				c.AbortWithStatus(http.StatusForbidden)
				return
			}
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

func isTrustedOrigin(origin string) bool {
	o := strings.ToLower(origin)
	if strings.HasPrefix(o, "https://web.telegram.org") {
		return true
	}
	if strings.Contains(o, ".telegram.org") {
		return true
	}
	if strings.HasPrefix(o, "http://localhost") || strings.HasPrefix(o, "http://127.0.0.1") {
		return true
	}
	if strings.HasPrefix(o, "https://") && (strings.Contains(o, "railway.app") || strings.Contains(o, "up.railway.app")) {
		return true
	}
	// Common dev tunnels
	if strings.Contains(o, "loca.lt") || strings.Contains(o, "ngrok") || strings.Contains(o, "duckdns.org") {
		return true
	}
	return false
}
