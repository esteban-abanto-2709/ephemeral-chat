package room

import (
	"errors"
	"net/http"
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
	FileMaxBytes      = 5 << 20
	FileNameMaxLength = 120
	FileInterval      = 2 * time.Second
	FileBurst         = 3
	VoiceMaxBytes     = 1 << 20
	VoiceMaxSeconds   = 60
	emptyLifetime     = time.Minute
)

var imageTypes = []string{"image/png", "image/jpeg", "image/gif", "image/webp"}

var voiceTypes = map[string]string{
	"video/webm":      "audio/webm",
	"video/mp4":       "audio/mp4",
	"application/ogg": "audio/ogg",
}

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
	Private bool     `json:"private,omitempty"`
	Members []Person `json:"members,omitempty"`
	File    *File    `json:"file,omitempty"`
	Seq     int      `json:"seq,omitempty"`
	Reply   int      `json:"reply,omitempty"`
}

type File struct {
	Kind    string `json:"kind"`
	Name    string `json:"name"`
	Mime    string `json:"mime,omitempty"`
	Size    int    `json:"size"`
	Seconds int    `json:"seconds,omitempty"`
	Data    []byte `json:"data,omitempty"`
}

func NewFile(name string, data []byte, seconds int) (*File, bool) {
	name = strings.TrimSpace(name)
	if name == "" || utf8.RuneCountInString(name) > FileNameMaxLength {
		return nil, false
	}
	if seconds < 0 || seconds > VoiceMaxSeconds {
		return nil, false
	}
	if len(data) == 0 || len(data) > FileMaxBytes {
		return nil, false
	}
	file := &File{Kind: "file", Name: name, Size: len(data), Data: data}
	mime := http.DetectContentType(data)
	if seconds > 0 {
		audio, ok := voiceTypes[mime]
		if !ok || len(data) > VoiceMaxBytes {
			return nil, false
		}
		file.Kind, file.Mime, file.Seconds = "voice", audio, seconds
	} else if slices.Contains(imageTypes, mime) {
		file.Kind, file.Mime = "image", mime
	}
	return file, true
}

type Member struct {
	client  *Client
	label   string
	limiter *rate.Limiter
	files   *rate.Limiter
	typing  *rate.Limiter
}

func newMember(client *Client, label string) *Member {
	return &Member{
		client:  client,
		label:   label,
		limiter: rate.NewLimiter(MessagesPerSecond, MessagesPerSecond),
		files:   rate.NewLimiter(rate.Every(FileInterval), FileBurst),
		typing:  rate.NewLimiter(rate.Every(TypingInterval), 1),
	}
}

type Room struct {
	ID      string
	Name    string
	mu      sync.Mutex
	members []*Member
	closed  bool
	private bool
	expiry  *time.Timer
	seq     int
}

func newRoom(id, name string, onExpire func()) *Room {
	return &Room{ID: id, Name: name, expiry: time.AfterFunc(emptyLifetime, onExpire)}
}

func ValidName(name string) bool {
	return strings.TrimSpace(name) != "" && utf8.RuneCountInString(name) <= NameMaxLength
}

func startPrivate(a, b *Client) {
	r := &Room{ID: newID(), private: true, expiry: time.AfterFunc(emptyLifetime, func() {})}
	ma, mb := newMember(a, b.ID), newMember(b, a.ID)
	r.members = []*Member{ma, mb}
	a.remember(b.ID, r, ma)
	b.remember(a.ID, r, mb)

	r.mu.Lock()
	defer r.mu.Unlock()
	people := r.people()
	for _, pair := range [][2]*Member{{ma, mb}, {mb, ma}} {
		to, other := pair[0], pair[1]
		r.deliver(to, Message{Type: "joined", ID: other.client.ID, Name: other.client.Name, Title: other.client.Name, Private: true, Members: people})
	}
}

func (r *Room) Join(client *Client) (*Member, error) {
	member := newMember(client, r.ID)

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

func validText(text string) bool {
	return strings.TrimSpace(text) != "" && utf8.RuneCountInString(text) <= MessageMaxLength
}

func (r *Room) Send(from *Member, text string, reply int) {
	if validText(text) {
		r.post(from, Message{Text: text, Reply: reply}, from.limiter, "slow-messages")
	}
}

func validCaption(caption string) bool {
	return caption == "" || validText(caption)
}

func (r *Room) SendFile(from *Member, file *File, caption string, reply int) {
	if validCaption(caption) {
		r.post(from, Message{Text: caption, File: file, Reply: reply}, from.files, "slow-files")
	}
}

func (r *Room) post(from *Member, message Message, limiter *rate.Limiter, slow string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if !slices.Contains(r.members, from) || message.Reply < 0 || message.Reply > r.seq {
		return
	}
	if !limiter.Allow() {
		r.deliver(from, Message{Type: "error", Code: slow})
		return
	}
	r.seq++
	message.Type, message.ID, message.Name, message.Seq = "message", from.client.ID, from.client.Name, r.seq
	if message.File == nil {
		r.broadcast(message)
		return
	}
	receipt := *message.File
	receipt.Data = nil
	r.each(func(member *Member) Message {
		if member == from {
			mine := message
			mine.File = &receipt
			return mine
		}
		return message
	})
}

func (r *Room) Typing(from *Member) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if !slices.Contains(r.members, from) || !from.typing.Allow() {
		return
	}
	message := Message{Type: "typing", ID: from.client.ID, Name: from.client.Name}
	for _, member := range r.members {
		if member != from {
			message.Room = member.label
			member.client.push(message)
		}
	}
}

func (r *Room) broadcast(message Message) {
	r.each(func(*Member) Message { return message })
}

func (r *Room) each(message func(*Member) Message) {
	var slow []*Member
	for _, member := range r.members {
		sent := message(member)
		sent.Room = member.label
		if !member.client.push(sent) {
			slow = append(slow, member)
		}
	}
	for _, member := range slow {
		r.drop(member)
	}
}

func (r *Room) deliver(member *Member, message Message) {
	message.Room = member.label
	if !member.client.push(message) {
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
	if r.private {
		for _, other := range r.members {
			other.client.forget(other.label)
		}
		r.members = nil
	}
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
