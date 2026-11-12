package room

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"sync"
)

const (
	MaxConnections = 2000
	MaxRooms       = 5000
)

var ErrServerFull = errors.New("server is full")

type Registry struct {
	mu      sync.Mutex
	rooms   map[string]*Room
	clients map[string]*Client
	transit transit
}

func NewRegistry() *Registry {
	return &Registry{rooms: make(map[string]*Room), clients: make(map[string]*Client)}
}

func (r *Registry) Connect(name string) (*Client, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.clients) >= MaxConnections {
		return nil, ErrServerFull
	}
	client := NewClient(name)
	r.clients[client.ID] = client
	return client, nil
}

func (r *Registry) Disconnect(client *Client) {
	r.mu.Lock()
	delete(r.clients, client.ID)
	r.mu.Unlock()
	client.LeaveAll()
	client.close()
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
	client.Notify(Message{Type: "joined", Room: other.ID, ID: other.ID, Name: other.Name(), Title: other.Name(), Private: true, Members: []Person{client.person(), other.person()}})
}

func (r *Registry) Send(client *Client, label, text string, reply int) {
	if validText(text) && r.reach(client, label) {
		client.Send(label, text, reply)
	}
}

func (r *Registry) SendFile(client *Client, label, name string, data []byte, seconds int, caption string, reply int) {
	file, ok := NewFile(name, data, seconds)
	if !ok || !validCaption(caption) || !r.reach(client, label) {
		return
	}
	if !r.transit.take(file.Size) {
		client.Notify(Message{Type: "error", Room: label, Code: "slow-server"})
		return
	}
	file.hold = &hold{budget: &r.transit, size: file.Size}
	file.hold.refs.Store(1)
	client.SendFile(label, file, caption, reply)
	file.release()
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

func (r *Registry) Create(name string) (string, error) {
	id := newID()

	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.rooms) >= MaxRooms {
		return "", ErrServerFull
	}
	r.rooms[id] = newRoom(id, name, func() { r.drop(id) })
	return id, nil
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
