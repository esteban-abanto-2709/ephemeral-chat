package room

import (
	"crypto/rand"
	"encoding/base64"
	"sync"
)

type Registry struct {
	mu    sync.Mutex
	rooms map[string]struct{}
}

func NewRegistry() *Registry {
	return &Registry{rooms: make(map[string]struct{})}
}

func (r *Registry) Create() string {
	id := newID()

	r.mu.Lock()
	defer r.mu.Unlock()
	r.rooms[id] = struct{}{}
	return id
}

func newID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}
