package hub

import (
	"encoding/json"

	"github.com/sayakawaii/echoearth/backend/internal/geoip"
	"github.com/sayakawaii/echoearth/backend/internal/store"
)

// Wire frame types. The client and server exchange JSON envelopes:
//
//	{ "type": "<name>", "payload": { ... } }
const (
	TypePublish = "publish"
	TypePing    = "ping"

	TypeHello  = "hello"
	TypeBubble = "bubble"
	TypeExpire = "expire"
	TypePong   = "pong"
	TypeError  = "error"
)

// Envelope wraps every WS frame.
type Envelope struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload,omitempty"`
}

// Upstream payloads.

type PublishPayload struct {
	Text string  `json:"text"`
	Lat  float64 `json:"lat"`
	Lng  float64 `json:"lng"`
}

// Downstream payloads.

type HelloPayload struct {
	ClientID       string           `json:"clientId"`
	IPLocation     geoip.Location   `json:"ipLocation"`
	ActiveBubbles  []*store.Bubble  `json:"activeBubbles"`
	BubbleTTLSecs  int              `json:"bubbleTtlSecs"`
	ServerTime     int64            `json:"serverTime"`
	RateLimitSecs  int              `json:"rateLimitSecs"`
	MaxTextChars   int              `json:"maxTextChars"`
}

type ExpirePayload struct {
	ID string `json:"id"`
}

type ErrorPayload struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// helper to build an Envelope with json-encoded payload.
func makeFrame(t string, payload any) ([]byte, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return json.Marshal(Envelope{Type: t, Payload: raw})
}
