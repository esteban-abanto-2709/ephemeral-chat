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
	other, reason := r.peer(client, code)
	if other == nil {
		fail(reason)
		return
	}
	client.Notify(Message{Type: "joined", Room: other.ID, ID: other.ID, Name: other.Name, Title: other.Name, Private: true, Members: []Person{client.person(), other.person()}})
}

func (r *Registry) Send(client *Client, label, text string, reply int) {
	if validText(text) && r.reach(client, label) {
		client.Send(label, text, reply)
	}
}

func (r *Registry) SendFile(client *Client, label, name, data string, seconds int, caption string, reply int) {
	if file, ok := NewFile(name, data, seconds); ok && validCaption(caption) && r.reach(client, label) {
		client.SendFile(label, file, caption, reply)
	}
}

func (r *Registry) reach(client *Client, label string) bool {
	if _, ok := client.chat(label); ok {
		return true
	}
	other, reason := r.peer(client, label)
	if other == nil {
		client.Notify(Message{Type: "error", Room: label, Code: reason})
		return false
	}
	r.mu.Lock()
	if _, ok := client.chat(label); !ok {
		startPrivate(client, other)
	}
	r.mu.Unlock()
	return true
}

func (r *Registry) peer(client *Client, id string) (*Client, string) {
	r.mu.Lock()
	other, ok := r.clients[id]
	r.mu.Unlock()
	switch {
	case !ok:
		return nil, "gone"
	case other == client:
		return nil, "self"
	case client.count() >= MaxChats:
		return nil, "limit"
	case other.count() >= MaxChats:
		return nil, "busy"
	}
	return other, ""
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
