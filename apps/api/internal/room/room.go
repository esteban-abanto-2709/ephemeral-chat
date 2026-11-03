package room

import (
	"slices"
	"strings"
	"sync"
	"unicode/utf8"
)

const (
	NameMaxLength = 24
	mailboxSize   = 16
)

type Message struct {
	Type    string   `json:"type"`
	Name    string   `json:"name"`
	Text    string   `json:"text,omitempty"`
	Members []string `json:"members,omitempty"`
}

type Member struct {
	Name    string
	mailbox chan Message
}

func (m *Member) Messages() <-chan Message {
	return m.mailbox
}

type Room struct {
	mu      sync.Mutex
	members []*Member
}

func newRoom() *Room {
	return &Room{}
}

func ValidName(name string) bool {
	return strings.TrimSpace(name) != "" && utf8.RuneCountInString(name) <= NameMaxLength
}

func (r *Room) Join(name string) *Member {
	member := &Member{Name: name, mailbox: make(chan Message, mailboxSize)}

	r.mu.Lock()
	defer r.mu.Unlock()
	r.members = append(r.members, member)
	r.broadcast(Message{Type: "joined", Name: name, Members: r.names()})
	return member
}

func (r *Room) Leave(member *Member) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.remove(member)
}

func (r *Room) Send(from *Member, text string) {
	if strings.TrimSpace(text) == "" {
		return
	}
	r.mu.Lock()
	defer r.mu.Unlock()
	r.broadcast(Message{Type: "message", Name: from.Name, Text: text})
}

func (r *Room) broadcast(message Message) {
	var slow []*Member
	for _, member := range r.members {
		select {
		case member.mailbox <- message:
		default:
			slow = append(slow, member)
		}
	}
	for _, member := range slow {
		r.remove(member)
	}
}

func (r *Room) remove(member *Member) {
	i := slices.Index(r.members, member)
	if i < 0 {
		return
	}
	r.members = slices.Delete(r.members, i, i+1)
	close(member.mailbox)
	r.broadcast(Message{Type: "left", Name: member.Name, Members: r.names()})
}

func (r *Room) names() []string {
	names := make([]string, len(r.members))
	for i, member := range r.members {
		names[i] = member.Name
	}
	return names
}
