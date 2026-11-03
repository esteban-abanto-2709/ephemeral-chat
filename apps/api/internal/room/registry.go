package room

import (
	"crypto/rand"
	"encoding/base64"
	"sync"
)

type Registry struct {
	mu    sync.Mutex
	rooms map[string]*Room
}

func NewRegistry() *Registry {
	return &Registry{rooms: make(map[string]*Room)}
}

func (r *Registry) Create() string {
	id := newID()

	r.mu.Lock()
	defer r.mu.Unlock()
	r.rooms[id] = newRoom(func() { r.drop(id) })
	return id
}

func (r *Registry) Get(id string) (*Room, bool) {
	r.mu.Lock()
	defer r.mu.Unlock()
	room, ok := r.rooms[id]
	return room, ok
}

func (r *Registry) drop(id string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if room, ok := r.rooms[id]; ok && room.close() {
		delete(r.rooms, id)
	}
}

func newID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}
