package room

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"sync"
)

type Registry struct {
	mu      sync.Mutex
	rooms   map[string]*Room
	clients map[string]*Client
}

func NewRegistry() *Registry {
	return &Registry{rooms: make(map[string]*Room), clients: make(map[string]*Client)}
}

func (r *Registry) Connect(name string) *Client {
	client := NewClient(name)
	r.mu.Lock()
	defer r.mu.Unlock()
	r.clients[client.ID] = client
	return client
}

func (r *Registry) Disconnect(client *Client) {
	r.mu.Lock()
	delete(r.clients, client.ID)
	r.mu.Unlock()
	client.LeaveAll()
}

func (r *Registry) Open(client *Client, code string) {
	fail := func(reason string) {
		client.Notify(Message{Type: "error", Room: code, Code: reason})
	}
	if _, ok := client.chat(code); ok {
		return
	}
	if client.count() >= MaxChats {
		fail("limit")
		return
	}
	if room, ok := r.Get(code); ok {
		member, err := room.Join(client)
		switch {
		case errors.Is(err, ErrRoomFull):
			fail("full")
		case err != nil:
			fail("gone")
		default:
			client.remember(code, room, member)
		}
		return
	}
	r.mu.Lock()
	other, ok := r.clients[code]
	r.mu.Unlock()
	switch {
	case !ok:
		fail("gone")
	case other == client:
		fail("self")
	case other.count() >= MaxChats:
		fail("busy")
	default:
		startPrivate(client, other)
	}
}

func (r *Registry) Create(name string) string {
	id := newID()

	r.mu.Lock()
	defer r.mu.Unlock()
	r.rooms[id] = newRoom(id, name, func() { r.drop(id) })
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
