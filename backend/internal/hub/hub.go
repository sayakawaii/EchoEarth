package hub

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"

	"github.com/sayakawaii/echoearth/backend/internal/geoip"
	"github.com/sayakawaii/echoearth/backend/internal/store"
	"github.com/sayakawaii/echoearth/backend/internal/util"
)

// Config tunables for the hub.
type Config struct {
	BubbleTTL       time.Duration
	RateLimitWindow time.Duration
	MaxTextChars    int
	CoordDecimals   int
	// MaxImageBytes is the cap on the raw bytes of the inline image data URL.
	// Frontend should compress below this; server-side it is a hard reject.
	MaxImageBytes int
	// BadWords is a tiny demo blocklist. Substring match, case-insensitive.
	BadWords []string
}

// DefaultConfig returns the MVP defaults.
func DefaultConfig() Config {
	return Config{
		BubbleTTL:       5 * time.Minute,
		RateLimitWindow: 10 * time.Second,
		MaxTextChars:    140,
		CoordDecimals:   2,
		MaxImageBytes:   200 * 1024, // 200 KiB
		BadWords:        []string{"badword1", "badword2"},
	}
}

// Hub coordinates connected WebSocket clients and broadcasts bubble events.
type Hub struct {
	cfg      Config
	store    *store.Store
	geoip    *geoip.Resolver
	upgrader websocket.Upgrader
	log      *slog.Logger

	mu      sync.RWMutex
	clients map[string]*Client

	registerCh chan *Client
}

// New creates a new hub. Call StartBackgroundLoops to start expire broadcasts.
func New(cfg Config, st *store.Store, gr *geoip.Resolver, log *slog.Logger) *Hub {
	h := &Hub{
		cfg:        cfg,
		store:      st,
		geoip:      gr,
		log:        log,
		clients:    make(map[string]*Client),
		registerCh: make(chan *Client, 16),
		upgrader: websocket.Upgrader{
			ReadBufferSize:  1024,
			WriteBufferSize: 1024,
			// Permissive in dev. Tighten before production.
			CheckOrigin: func(r *http.Request) bool { return true },
		},
	}
	st.OnExpire(func(id string) {
		h.broadcastExpire(id)
	})
	return h
}

// ServeWS upgrades an HTTP request to a WebSocket and starts the pumps.
func (h *Hub) ServeWS(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.log.Warn("ws upgrade failed", "err", err)
		return
	}
	clientID := uuid.NewString()
	c := &Client{
		id:       clientID,
		conn:     conn,
		send:     make(chan []byte, sendBuffer),
		hub:      h,
		log:      h.log.With("clientId", clientID),
		nickname: strings.TrimSpace(r.URL.Query().Get("nickname")),
	}
	h.register(c)

	// Send hello before starting reader.
	ip := util.ClientIP(r)
	loc := h.geoip.Lookup(r.Context(), ip)
	hello := HelloPayload{
		ClientID:      clientID,
		IPLocation:    loc,
		ActiveBubbles: h.store.Snapshot(),
		BubbleTTLSecs: int(h.cfg.BubbleTTL.Seconds()),
		ServerTime:    time.Now().UnixMilli(),
		RateLimitSecs: int(h.cfg.RateLimitWindow.Seconds()),
		MaxTextChars:  h.cfg.MaxTextChars,
		MaxImageBytes: h.cfg.MaxImageBytes,
	}
	if frame, err := makeFrame(TypeHello, hello); err == nil {
		c.trySend(frame)
	}

	go c.writePump()
	c.readPump()
}

func (h *Hub) register(c *Client) {
	h.mu.Lock()
	h.clients[c.id] = c
	count := len(h.clients)
	h.mu.Unlock()
	h.log.Info("client connected", "clientId", c.id, "online", count)
}

func (h *Hub) unregister(c *Client) {
	h.mu.Lock()
	if _, ok := h.clients[c.id]; ok {
		delete(h.clients, c.id)
		close(c.send)
	}
	count := len(h.clients)
	h.mu.Unlock()
	h.log.Info("client disconnected", "clientId", c.id, "online", count)
}

// Online returns current client count.
func (h *Hub) Online() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

func (h *Hub) broadcast(frame []byte) {
	h.mu.RLock()
	clients := make([]*Client, 0, len(h.clients))
	for _, c := range h.clients {
		clients = append(clients, c)
	}
	h.mu.RUnlock()
	for _, c := range clients {
		c.trySend(frame)
	}
}

func (h *Hub) broadcastExpire(id string) {
	frame, err := makeFrame(TypeExpire, ExpirePayload{ID: id})
	if err != nil {
		return
	}
	h.broadcast(frame)
}

// handleClientMessage dispatches an inbound frame.
func (h *Hub) handleClientMessage(c *Client, env Envelope) {
	switch env.Type {
	case TypePing:
		frame, err := makeFrame(TypePong, struct{}{})
		if err == nil {
			c.trySend(frame)
		}
	case TypePublish:
		var p PublishPayload
		if err := json.Unmarshal(env.Payload, &p); err != nil {
			c.sendError("bad_payload", "publish payload invalid")
			return
		}
		h.handlePublish(c, p)
	case TypeLike:
		var p LikePayload
		if err := json.Unmarshal(env.Payload, &p); err != nil {
			c.sendError("bad_payload", "like payload invalid")
			return
		}
		h.handleLike(c, p)
	default:
		c.sendError("unknown_type", "unknown frame type: "+env.Type)
	}
}

func (h *Hub) handlePublish(c *Client, p PublishPayload) {
	text := strings.TrimSpace(p.Text)
	if text == "" {
		c.sendError("empty_text", "text cannot be empty")
		return
	}
	if utf8.RuneCountInString(text) > h.cfg.MaxTextChars {
		c.sendError("too_long", "text exceeds max length")
		return
	}
	if containsAny(strings.ToLower(text), h.cfg.BadWords) {
		c.sendError("blocked", "text rejected by content filter")
		return
	}
	if !store.IsValidMood(p.Mood) {
		c.sendError("bad_payload", "unknown mood")
		return
	}
	if p.Image != "" {
		if !strings.HasPrefix(p.Image, "data:image/") {
			c.sendError("bad_image", "image must be a data:image/... URL")
			return
		}
		if len(p.Image) > h.cfg.MaxImageBytes {
			c.sendError("image_too_large", "image exceeds size limit")
			return
		}
	}
	// Rate limit per client.
	since := time.Now().Add(-h.cfg.RateLimitWindow)
	if h.store.CountByClientSince(c.id, since) > 0 {
		c.sendError("rate_limited", "please slow down")
		return
	}
	// Read nickname from query param at connect time (set by client via WS URL).
	nickname := c.nicknameOrDefault()

	mood := p.Mood
	if mood == "" {
		mood = store.MoodCalm
	}

	now := time.Now()
	b := &store.Bubble{
		ID:        uuid.NewString(),
		Text:      text,
		Lat:       util.TruncateCoord(util.ClampLat(p.Lat), h.cfg.CoordDecimals),
		Lng:       util.TruncateCoord(util.ClampLng(p.Lng), h.cfg.CoordDecimals),
		Nickname:  nickname,
		ClientID:  c.id,
		CreatedAt: now,
		ExpiresAt: now.Add(h.cfg.BubbleTTL),
		Mood:      mood,
		Image:     p.Image,
		Likes:     0,
	}
	h.store.Add(b)

	frame, err := makeFrame(TypeBubble, b)
	if err != nil {
		h.log.Error("encode bubble failed", "err", err)
		return
	}
	h.broadcast(frame)
}

func (h *Hub) handleLike(c *Client, p LikePayload) {
	if p.BubbleID == "" {
		c.sendError("bad_payload", "missing bubbleId")
		return
	}
	count, _, exists := h.store.ToggleLike(p.BubbleID, c.id)
	if !exists {
		c.sendError("not_found", "bubble expired or unknown")
		return
	}
	frame, err := makeFrame(TypeLikeUpdate, LikeUpdatePayload{
		BubbleID: p.BubbleID,
		Count:    count,
	})
	if err != nil {
		h.log.Error("encode like_update failed", "err", err)
		return
	}
	h.broadcast(frame)
}

// Nickname plumbing -----------------------------------------------------------

// SetNickname stores the nickname on the client. Called from ws.go after
// upgrading the connection but before publishing.
func (c *Client) SetNickname(n string) {
	c.hub.mu.Lock()
	defer c.hub.mu.Unlock()
	c.nickname = n
}

// nicknameOrDefault returns a sanitized nickname.
func (c *Client) nicknameOrDefault() string {
	c.hub.mu.RLock()
	n := strings.TrimSpace(c.nickname)
	c.hub.mu.RUnlock()
	if n == "" {
		return "Anon-" + c.id[:6]
	}
	if utf8.RuneCountInString(n) > 16 {
		runes := []rune(n)
		n = string(runes[:16])
	}
	return n
}

// StartBackgroundLoops starts the TTL sweeper. Returns immediately.
func (h *Hub) StartBackgroundLoops(ctx context.Context) {
	h.store.StartSweeper(ctx, 10*time.Second)
}

func containsAny(haystack string, needles []string) bool {
	for _, n := range needles {
		if n == "" {
			continue
		}
		if strings.Contains(haystack, strings.ToLower(n)) {
			return true
		}
	}
	return false
}
