package room

import (
	"strings"
	"sync"
	"time"

	"golang.org/x/time/rate"
)

const (
	MaxChats       = 20
	mailboxSize    = 32
	RenameInterval = 10 * time.Second
)

type chat struct {
	room   *Room
	member *Member
}

type Client struct {
	ID      string
	name    string
	mailbox chan Message
	gone    chan struct{}
	once    sync.Once
	mu      sync.Mutex
	chats   map[string]chat
	renames *rate.Limiter
}

func NewClient(name string) *Client {
	return &Client{
		ID:      newID(),
		name:    name,
		mailbox: make(chan Message, mailboxSize),
		gone:    make(chan struct{}),
		chats:   make(map[string]chat),
		renames: rate.NewLimiter(rate.Every(RenameInterval), 1),
	}
}

func (c *Client) Name() string {
	c.mu.Lock()
	defer c.mu.Unlock()
	return c.name
}

func (c *Client) Rename(name string) {
	name = strings.TrimSpace(name)
	if !ValidName(name) || name == c.Name() {
		return
	}
	if !c.renames.Allow() {
		c.Notify(Message{Type: "error", Code: "slow-renames"})
		return
	}
	c.mu.Lock()
	c.name = name
	chats := make([]chat, 0, len(c.chats))
	for _, chat := range c.chats {
		chats = append(chats, chat)
	}
	c.mu.Unlock()
	c.Notify(Message{Type: "renamed", ID: c.ID, Name: name})
	for _, chat := range chats {
		chat.room.Renamed(chat.member)
	}
}

func (c *Client) Messages() <-chan Message {
	return c.mailbox
}

func (c *Client) Gone() <-chan struct{} {
	return c.gone
}

func (c *Client) Notify(message Message) {
	if !c.push(message) {
		c.disconnect()
	}
}

func (c *Client) Send(label, text string, reply int) {
	if chat, ok := c.chat(label); ok {
		chat.room.Send(chat.member, text, reply)
	}
}

func (c *Client) SendFile(label string, file *File, caption string, reply int) {
	if chat, ok := c.chat(label); ok {
		chat.room.SendFile(chat.member, file, caption, reply)
	}
}

func (c *Client) Typing(label string) {
	if chat, ok := c.chat(label); ok {
		chat.room.Typing(chat.member)
	}
}

func (c *Client) Read(label string, seq int) {
	if chat, ok := c.chat(label); ok {
		chat.room.Read(chat.member, seq)
	}
}

func (c *Client) Leave(label string) {
	if chat, ok := c.chat(label); ok {
		c.forget(label)
		chat.room.Leave(chat.member)
	}
}

func (c *Client) LeaveAll() {
	c.mu.Lock()
	labels := make([]string, 0, len(c.chats))
	for label := range c.chats {
		labels = append(labels, label)
	}
	c.mu.Unlock()
	for _, label := range labels {
		c.Leave(label)
	}
}

func (c *Client) chat(label string) (chat, bool) {
	c.mu.Lock()
	defer c.mu.Unlock()
	chat, ok := c.chats[label]
	return chat, ok
}

func (c *Client) count() int {
	c.mu.Lock()
	defer c.mu.Unlock()
	return len(c.chats)
}

func (c *Client) remember(label string, room *Room, member *Member) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.chats[label] = chat{room, member}
}

func (c *Client) forget(label string) {
	c.mu.Lock()
	defer c.mu.Unlock()
	delete(c.chats, label)
}

func (c *Client) person() Person {
	return Person{ID: c.ID, Name: c.Name()}
}

func (c *Client) push(message Message) bool {
	select {
	case c.mailbox <- message:
		return true
	default:
		return false
	}
}

func (c *Client) disconnect() {
	c.once.Do(func() { close(c.gone) })
}
