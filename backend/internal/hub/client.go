package hub

import (
	"encoding/json"
	"log/slog"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait = 10 * time.Second
	readWait  = 60 * time.Second
	// maxMessageSize accommodates ~150 KiB compressed image (base64 + JSON
	// envelope overhead). The frontend caps payloads at 150 KiB before send.
	maxMessageSize = 256 << 10 // 256 KiB

	sendBuffer = 32
)

// Client represents a single WebSocket peer.
type Client struct {
	id       string
	conn     *websocket.Conn
	send     chan []byte
	hub      *Hub
	log      *slog.Logger
	nickname string // guarded by hub.mu
}

// readPump reads frames from the peer and feeds them to the hub.
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister(c)
		_ = c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	_ = c.conn.SetReadDeadline(time.Now().Add(readWait))
	c.conn.SetPongHandler(func(string) error {
		_ = c.conn.SetReadDeadline(time.Now().Add(readWait))
		return nil
	})

	for {
		_, raw, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err,
				websocket.CloseGoingAway, websocket.CloseNormalClosure) {
				c.log.Warn("ws read error", "err", err)
			}
			return
		}
		_ = c.conn.SetReadDeadline(time.Now().Add(readWait))

		var env Envelope
		if err := json.Unmarshal(raw, &env); err != nil {
			c.sendError("bad_frame", "invalid JSON envelope")
			continue
		}
		c.hub.handleClientMessage(c, env)
	}
}

// writePump pumps messages from the hub to the peer.
func (c *Client) writePump() {
	ticker := time.NewTicker(25 * time.Second)
	defer func() {
		ticker.Stop()
		_ = c.conn.Close()
	}()
	for {
		select {
		case msg, ok := <-c.send:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				_ = c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.conn.WriteMessage(websocket.TextMessage, msg); err != nil {
				return
			}
		case <-ticker.C:
			_ = c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// trySend pushes raw bytes to this client without blocking the hub. If the
// client's buffer is full we drop the frame and let the next read deadline
// disconnect them.
func (c *Client) trySend(raw []byte) {
	select {
	case c.send <- raw:
	default:
		c.log.Warn("client send buffer full, dropping frame", "clientId", c.id)
	}
}

func (c *Client) sendError(code, msg string) {
	frame, err := makeFrame(TypeError, ErrorPayload{Code: code, Message: msg})
	if err != nil {
		return
	}
	c.trySend(frame)
}
