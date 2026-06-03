package geoip

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"
)

// Location is a coarse geolocation result.
type Location struct {
	Lat     float64 `json:"lat"`
	Lng     float64 `json:"lng"`
	City    string  `json:"city"`
	Country string  `json:"country"`
	Source  string  `json:"source"` // "ip-api" | "fallback" | "local"
}

// FallbackLocation is used when lookup fails or is skipped (e.g. for loopback).
var FallbackLocation = Location{Lat: 30, Lng: 0, City: "", Country: "", Source: "fallback"}

// Resolver looks up an IP via ip-api.com with a tiny in-memory cache.
//
// ip-api.com free tier: ~45 req/min from a single source. We cache results
// for 1h to stay well under the limit during dev. For production, swap to
// ip2location-lite or a paid API (see OPEN_ITEMS.md).
type Resolver struct {
	client *http.Client
	mu     sync.RWMutex
	cache  map[string]cachedLoc
	ttl    time.Duration
}

type cachedLoc struct {
	loc Location
	at  time.Time
}

func NewResolver() *Resolver {
	return &Resolver{
		client: &http.Client{Timeout: 3 * time.Second},
		cache:  make(map[string]cachedLoc),
		ttl:    time.Hour,
	}
}

// Lookup resolves the given IP. For loopback / private IPs it returns
// FallbackLocation directly (no external call).
func (r *Resolver) Lookup(ctx context.Context, ip string) Location {
	ip = strings.TrimSpace(ip)
	if ip == "" || isLocalOrPrivate(ip) {
		loc := FallbackLocation
		loc.Source = "local"
		return loc
	}

	r.mu.RLock()
	if c, ok := r.cache[ip]; ok && time.Since(c.at) < r.ttl {
		r.mu.RUnlock()
		return c.loc
	}
	r.mu.RUnlock()

	loc, err := r.fetch(ctx, ip)
	if err != nil {
		return FallbackLocation
	}
	r.mu.Lock()
	r.cache[ip] = cachedLoc{loc: loc, at: time.Now()}
	r.mu.Unlock()
	return loc
}

type ipApiResp struct {
	Status  string  `json:"status"`
	Country string  `json:"country"`
	City    string  `json:"city"`
	Lat     float64 `json:"lat"`
	Lon     float64 `json:"lon"`
	Message string  `json:"message"`
}

func (r *Resolver) fetch(ctx context.Context, ip string) (Location, error) {
	url := fmt.Sprintf("http://ip-api.com/json/%s?fields=status,message,country,city,lat,lon", ip)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return Location{}, err
	}
	resp, err := r.client.Do(req)
	if err != nil {
		return Location{}, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return Location{}, fmt.Errorf("ip-api status %d", resp.StatusCode)
	}
	var body ipApiResp
	if err := json.NewDecoder(resp.Body).Decode(&body); err != nil {
		return Location{}, err
	}
	if body.Status != "success" {
		return Location{}, fmt.Errorf("ip-api fail: %s", body.Message)
	}
	return Location{
		Lat:     body.Lat,
		Lng:     body.Lon,
		City:    body.City,
		Country: body.Country,
		Source:  "ip-api",
	}, nil
}

func isLocalOrPrivate(s string) bool {
	ip := net.ParseIP(s)
	if ip == nil {
		return true
	}
	if ip.IsLoopback() || ip.IsLinkLocalUnicast() || ip.IsPrivate() || ip.IsUnspecified() {
		return true
	}
	return false
}
