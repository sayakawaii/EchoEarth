package util

import (
	"math"
	"net"
	"net/http"
	"strings"
)

// ClientIP extracts the best-effort client IP from a request.
// Honors X-Forwarded-For (first entry) and X-Real-IP, falling back to RemoteAddr.
func ClientIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		if ip := strings.TrimSpace(parts[0]); ip != "" {
			return ip
		}
	}
	if xri := strings.TrimSpace(r.Header.Get("X-Real-IP")); xri != "" {
		return xri
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

// TruncateCoord truncates a latitude/longitude value to the given number of
// decimal places. Two decimal places is roughly ~1.1km at the equator.
func TruncateCoord(v float64, decimals int) float64 {
	if decimals < 0 {
		decimals = 0
	}
	m := math.Pow(10, float64(decimals))
	return math.Trunc(v*m) / m
}

// ClampLat ensures latitude is within [-90, 90].
func ClampLat(v float64) float64 {
	if v > 90 {
		return 90
	}
	if v < -90 {
		return -90
	}
	return v
}

// ClampLng wraps longitude into [-180, 180].
func ClampLng(v float64) float64 {
	for v > 180 {
		v -= 360
	}
	for v < -180 {
		v += 360
	}
	return v
}
