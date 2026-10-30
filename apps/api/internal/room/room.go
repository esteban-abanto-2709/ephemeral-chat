package room

import (
	"strings"
	"sync"
	"unicode/utf8"
)

const (
	NameMaxLength = 24
	mailboxSize   = 16
)

type Message struct {
	Name string `json:"name"`
	Text string `json:"text"`
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
	members map[*Member]struct{}
}

func newRoom() *Room {
	return &Room{members: make(map[*Member]struct{})}
}

func ValidName(name string) bool {
	return strings.TrimSpace(name) != "" && utf8.RuneCountInString(name) <= NameMaxLength
}

func (r *Room) Join(name string) *Member {
	member := &Member{Name: name, mailbox: make(chan Message, mailboxSize)}

	r.mu.Lock()
	defer r.mu.Unlock()
	r.members[member] = struct{}{}
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
	message := Message{Name: from.Name, Text: text}

	r.mu.Lock()
	defer r.mu.Unlock()
	for member := range r.members {
		select {
		case member.mailbox <- message:
		default:
			r.remove(member)
		}
	}
}

func (r *Room) remove(member *Member) {
	if _, ok := r.members[member]; ok {
		delete(r.members, member)
		close(member.mailbox)
	}
}
