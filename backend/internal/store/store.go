package store

import (
	"context"
	"sort"
	"sync"
	"time"
)

// Bubble is a published map message with a TTL.
type Bubble struct {
	ID        string    `json:"id"`
	Text      string    `json:"text"`
	Lat       float64   `json:"lat"`
	Lng       float64   `json:"lng"`
	Nickname  string    `json:"nickname"`
	ClientID  string    `json:"-"`
	CreatedAt time.Time `json:"createdAt"`
	ExpiresAt time.Time `json:"expiresAt"`
}

// Store is an in-memory bubble store with TTL eviction.
// It is safe for concurrent use.
type Store struct {
	mu       sync.RWMutex
	items    map[string]*Bubble
	maxItems int
	onExpire func(id string)
}

// New creates a new in-memory store. maxItems is the hard cap; oldest are
// evicted first when the cap is exceeded.
func New(maxItems int) *Store {
	if maxItems <= 0 {
		maxItems = 1000
	}
	return &Store{
		items:    make(map[string]*Bubble),
		maxItems: maxItems,
	}
}

// OnExpire registers a callback invoked when a bubble is removed (either due
// to TTL or capacity eviction). The callback runs synchronously on the
// goroutine performing the removal.
func (s *Store) OnExpire(fn func(id string)) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.onExpire = fn
}

// Add inserts a bubble. If the store is at capacity, the oldest is evicted.
func (s *Store) Add(b *Bubble) {
	s.mu.Lock()
	s.items[b.ID] = b
	// Evict oldest if over capacity.
	if len(s.items) > s.maxItems {
		var oldestID string
		var oldestT time.Time
		first := true
		for id, it := range s.items {
			if first || it.CreatedAt.Before(oldestT) {
				oldestID = id
				oldestT = it.CreatedAt
				first = false
			}
		}
		if oldestID != "" {
			delete(s.items, oldestID)
			fn := s.onExpire
			s.mu.Unlock()
			if fn != nil {
				fn(oldestID)
			}
			return
		}
	}
	s.mu.Unlock()
}

// Snapshot returns a sorted (oldest → newest) copy of currently active bubbles.
func (s *Store) Snapshot() []*Bubble {
	s.mu.RLock()
	defer s.mu.RUnlock()
	out := make([]*Bubble, 0, len(s.items))
	for _, b := range s.items {
		bb := *b
		out = append(out, &bb)
	}
	sort.Slice(out, func(i, j int) bool { return out[i].CreatedAt.Before(out[j].CreatedAt) })
	return out
}

// CountByClientSince returns how many bubbles a given client published since t.
func (s *Store) CountByClientSince(clientID string, since time.Time) int {
	s.mu.RLock()
	defer s.mu.RUnlock()
	n := 0
	for _, b := range s.items {
		if b.ClientID == clientID && !b.CreatedAt.Before(since) {
			n++
		}
	}
	return n
}

// StartSweeper runs a periodic TTL sweep until ctx is canceled.
func (s *Store) StartSweeper(ctx context.Context, every time.Duration) {
	go func() {
		ticker := time.NewTicker(every)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				s.sweep()
			}
		}
	}()
}

func (s *Store) sweep() {
	now := time.Now()
	var expired []string
	s.mu.Lock()
	for id, b := range s.items {
		if !now.Before(b.ExpiresAt) {
			expired = append(expired, id)
			delete(s.items, id)
		}
	}
	fn := s.onExpire
	s.mu.Unlock()
	if fn != nil {
		for _, id := range expired {
			fn(id)
		}
	}
}
