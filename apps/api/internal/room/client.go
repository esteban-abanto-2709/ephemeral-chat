package room

import "sync"

const (
	MaxChats    = 20
	mailboxSize = 32
)

type Client struct {
	ID      string
	Name    string
	mailbox chan Message
	gone    chan struct{}
	once    sync.Once
}

func NewClient(name string) *Client {
	return &Client{
		ID:      newID(),
		Name:    name,
		mailbox: make(chan Message, mailboxSize),
		gone:    make(chan struct{}),
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

func (c *Client) person() Person {
	return Person{ID: c.ID, Name: c.Name}
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
