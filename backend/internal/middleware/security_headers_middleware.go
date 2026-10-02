package middleware

import "github.com/gin-gonic/gin"

// SecurityHeadersMiddleware adds browser hardening headers for the Mini App surface.
func SecurityHeadersMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "SAMEORIGIN")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("X-XSS-Protection", "0")
		c.Header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		// Mini Apps run inside Telegram WebView; avoid overly strict CSP that breaks inline Telegram scripts
		c.Header("Content-Security-Policy", "frame-ancestors 'self' https://web.telegram.org https://*.telegram.org")
		c.Next()
	}
}
