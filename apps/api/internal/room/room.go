package room

import (
	"errors"
	"slices"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"golang.org/x/time/rate"
)

const (
	NameMaxLength     = 24
	MessageMaxLength  = 1000
	MessagesPerSecond = 5
	MaxMembers        = 50
	TypingInterval    = 2 * time.Second
	emptyLifetime     = time.Minute
)

var (
	ErrRoomGone = errors.New("room no longer exists")
	ErrRoomFull = errors.New("room is full")
)

type Person struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type Message struct {
	Type    string   `json:"type"`
	Room    string   `json:"room,omitempty"`
	ID      string   `json:"id,omitempty"`
	Name    string   `json:"name,omitempty"`
	Title   string   `json:"title,omitempty"`
	Text    string   `json:"text,omitempty"`
	Code    string   `json:"code,omitempty"`
	Members []Person `json:"members,omitempty"`
}

type Member struct {
	client  *Client
	limiter *rate.Limiter
	typing  *rate.Limiter
}

type Room struct {
	ID      string
	Name    string
	mu      sync.Mutex
	members []*Member
	closed  bool
	expiry  *time.Timer
}

func newRoom(id, name string, onExpire func()) *Room {
	return &Room{ID: id, Name: name, expiry: time.AfterFunc(emptyLifetime, onExpire)}
}

func ValidName(name string) bool {
	return strings.TrimSpace(name) != "" && utf8.RuneCountInString(name) <= NameMaxLength
}

func (r *Room) Join(client *Client) (*Member, error) {
	member := &Member{
		client:  client,
		limiter: rate.NewLimiter(MessagesPerSecond, MessagesPerSecond),
		typing:  rate.NewLimiter(rate.Every(TypingInterval), 1),
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	if r.closed {
		return nil, ErrRoomGone
	}
	if len(r.members) >= MaxMembers {
		return nil, ErrRoomFull
	}
	r.members = append(r.members, member)
	r.broadcast(Message{Type: "joined", ID: client.ID, Name: client.Name, Title: r.Name, Members: r.people()})
	return member, nil
}

func (r *Room) Leave(member *Member) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.remove(member)
}

func (r *Room) Send(from *Member, text string) {
	if strings.TrimSpace(text) == "" || utf8.RuneCountInString(text) > MessageMaxLength {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	if !slices.Contains(r.members, from) {
		return
	}
	if !from.limiter.Allow() {
		if !from.client.push(Message{Type: "error", Room: r.ID, Text: "Slow down: up to 5 messages per second."}) {
			r.drop(from)
		}
		return
	}
	r.broadcast(Message{Type: "message", ID: from.client.ID, Name: from.client.Name, Text: text})
}

func (r *Room) Typing(from *Member) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if !slices.Contains(r.members, from) || !from.typing.Allow() {
		return
	}
	message := Message{Type: "typing", Room: r.ID, ID: from.client.ID, Name: from.client.Name}
	for _, member := range r.members {
		if member != from {
			member.client.push(message)
		}
	}
}

func (r *Room) broadcast(message Message) {
	message.Room = r.ID
	var slow []*Member
	for _, member := range r.members {
		if !member.client.push(message) {
			slow = append(slow, member)
		}
	}
	for _, member := range slow {
		r.drop(member)
	}
}

func (r *Room) drop(member *Member) {
	member.client.disconnect()
	r.remove(member)
}

func (r *Room) remove(member *Member) {
	i := slices.Index(r.members, member)
	if i < 0 {
		return
	}
	r.members = slices.Delete(r.members, i, i+1)
	if len(r.members) == 0 {
		r.expiry.Reset(emptyLifetime)
	}
	r.broadcast(Message{Type: "left", ID: member.client.ID, Name: member.client.Name, Members: r.people()})
}

func (r *Room) close() bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	if len(r.members) > 0 {
		return false
	}
	r.closed = true
	return true
}

func (r *Room) people() []Person {
	people := make([]Person, len(r.members))
	for i, member := range r.members {
		people[i] = member.client.person()
	}
	return people
}
