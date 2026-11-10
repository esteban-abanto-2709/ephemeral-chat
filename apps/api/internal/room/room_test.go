package room

import (
	"bytes"
	"errors"
	"fmt"
	"reflect"
	"strings"
	"testing"
	"testing/synctest"
	"time"
)

const (
	roomID    = "room-1"
	roomTitle = "Weekend trip"
)

func newTestRoom() *Room {
	return newRoom(roomID, roomTitle, func() {})
}

func join(t *testing.T, room *Room, name string) *Member {
	t.Helper()
	member, err := room.Join(NewClient(name))
	if err != nil {
		t.Fatalf("Join(%q): %v", name, err)
	}
	return member
}

func receive(t *testing.T, member *Member) Message {
	t.Helper()
	select {
	case message := <-member.client.Messages():
		return message
	default:
		t.Fatalf("%s got nothing", member.client.Name())
		return Message{}
	}
}

func expect(t *testing.T, member *Member, want Message) {
	t.Helper()
	if got := receive(t, member); !reflect.DeepEqual(got, want) {
		t.Errorf("%s got %+v, want %+v", member.client.Name(), got, want)
	}
}

func assertEmpty(t *testing.T, member *Member) {
	t.Helper()
	select {
	case message := <-member.client.Messages():
		t.Fatalf("%s got %+v, want nothing", member.client.Name(), message)
	default:
	}
}

func assertConnected(t *testing.T, member *Member, want bool) {
	t.Helper()
	select {
	case <-member.client.Gone():
		if want {
			t.Errorf("%s was disconnected", member.client.Name())
		}
	default:
		if !want {
			t.Errorf("%s is still connected", member.client.Name())
		}
	}
}

func drain(member *Member) {
	for {
		select {
		case <-member.client.Messages():
		default:
			return
		}
	}
}

func people(members ...*Member) []Person {
	all := make([]Person, len(members))
	for i, member := range members {
		all[i] = member.client.person()
	}
	return all
}

func joined(who *Member, members ...*Member) Message {
	return Message{Type: "joined", Room: roomID, ID: who.client.ID, Name: who.client.Name(), Title: roomTitle, Members: people(members...)}
}

func left(who *Member, members ...*Member) Message {
	return Message{Type: "left", Room: roomID, ID: who.client.ID, Name: who.client.Name(), Members: people(members...)}
}

func said(who *Member, seq int, text string) Message {
	return Message{Type: "message", Room: roomID, ID: who.client.ID, Name: who.client.Name(), Text: text, Seq: seq}
}

func typing(who *Member) Message {
	return Message{Type: "typing", Room: roomID, ID: who.client.ID, Name: who.client.Name()}
}

func TestJoinAnnouncesTheNewcomerToEveryone(t *testing.T) {
	room := newTestRoom()
	juan := join(t, room, "Juan")
	expect(t, juan, joined(juan, juan))

	ana := join(t, room, "Ana")
	expect(t, juan, joined(ana, juan, ana))
	expect(t, ana, joined(ana, juan, ana))
}

func TestLeaveAnnouncesWhoIsStillHere(t *testing.T) {
	room := newTestRoom()
	juan, ana, luis := join(t, room, "Juan"), join(t, room, "Ana"), join(t, room, "Luis")
	drain(juan)
	drain(luis)

	room.Leave(ana)

	expect(t, juan, left(ana, juan, luis))
	expect(t, luis, left(ana, juan, luis))
}

func TestTwoPeopleMayShareAName(t *testing.T) {
	room := newTestRoom()
	first := join(t, room, "Juan")
	second := join(t, room, "Juan")

	if first.client.ID == second.client.ID {
		t.Fatal("both got the same id")
	}
	expect(t, second, joined(second, first, second))
}

func TestJoinRejectsOnceTheRoomIsFull(t *testing.T) {
	room := newTestRoom()
	members := make([]*Member, MaxMembers)
	for i := range members {
		members[i] = join(t, room, fmt.Sprint("Member ", i))
		for _, member := range members[:i+1] {
			drain(member)
		}
	}

	if _, err := room.Join(NewClient("Late")); !errors.Is(err, ErrRoomFull) {
		t.Fatalf("Join on a full room: error = %v, want ErrRoomFull", err)
	}

	room.Leave(members[0])
	join(t, room, "Late")
}

func TestSendReachesEveryMemberWithTheSenderName(t *testing.T) {
	room := newTestRoom()
	juan, ana := join(t, room, "Juan"), join(t, room, "Ana")
	drain(juan)
	drain(ana)

	room.Send(juan, "hola", 0)

	expect(t, juan, said(juan, 1, "hola"))
	expect(t, ana, said(juan, 1, "hola"))
}

func TestAReplyPointsAtAnEarlierMessage(t *testing.T) {
	room := newTestRoom()
	juan, ana := join(t, room, "Juan"), join(t, room, "Ana")
	drain(juan)
	drain(ana)

	room.Send(juan, "too soon", 1)
	room.Send(juan, "backwards", -1)
	assertEmpty(t, ana)

	room.Send(juan, "Saturday?", 0)
	expect(t, ana, said(juan, 1, "Saturday?"))
	drain(juan)
	room.Send(ana, "works for me", 1)
	want := said(ana, 2, "works for me")
	want.Reply = 1
	expect(t, juan, want)
}

func TestLateJoinerSeesNothingFromBefore(t *testing.T) {
	room := newTestRoom()
	juan := join(t, room, "Juan")
	room.Send(juan, "before", 0)
	drain(juan)

	ana := join(t, room, "Ana")
	expect(t, ana, joined(ana, juan, ana))
	assertEmpty(t, ana)

	room.Send(juan, "after", 0)
	if got := receive(t, ana); got.Text != "after" {
		t.Errorf("Ana got %q, want %q", got.Text, "after")
	}
}

func TestLeftMemberStopsReceiving(t *testing.T) {
	room := newTestRoom()
	juan, ana := join(t, room, "Juan"), join(t, room, "Ana")
	drain(ana)

	room.Leave(ana)
	room.Send(juan, "hola", 0)

	assertEmpty(t, ana)
	assertConnected(t, ana, true)
}

func TestSlowMemberIsDisconnectedAndAnnounced(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		room := newTestRoom()
		fast, slow := join(t, room, "Fast"), join(t, room, "Slow")
		drain(fast)
		drain(slow)

		for range mailboxSize + 1 {
			room.Send(fast, "hola", 0)
			receive(t, fast)
			time.Sleep(time.Second / MessagesPerSecond)
		}
		expect(t, fast, left(slow, fast))
		assertConnected(t, slow, false)
		assertConnected(t, fast, true)
	})
}

func TestBlankMessagesAreIgnored(t *testing.T) {
	room := newTestRoom()
	juan := join(t, room, "Juan")
	drain(juan)

	room.Send(juan, "   ", 0)
	assertEmpty(t, juan)
}

func TestMessagesOverTheMaxLengthAreIgnored(t *testing.T) {
	room := newTestRoom()
	juan := join(t, room, "Juan")
	drain(juan)

	room.Send(juan, strings.Repeat("ñ", MessageMaxLength+1), 0)
	assertEmpty(t, juan)

	room.Send(juan, strings.Repeat("ñ", MessageMaxLength), 0)
	if got := receive(t, juan); len([]rune(got.Text)) != MessageMaxLength {
		t.Errorf("got %d characters, want %d", len([]rune(got.Text)), MessageMaxLength)
	}
}

func TestSendingTooFastIsRefusedToTheSenderOnly(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		room := newTestRoom()
		juan, ana := join(t, room, "Juan"), join(t, room, "Ana")
		drain(juan)
		drain(ana)

		for range MessagesPerSecond {
			room.Send(juan, "hola", 0)
			receive(t, juan)
			receive(t, ana)
		}

		room.Send(juan, "one too many", 0)
		expect(t, juan, Message{Type: "error", Room: roomID, Code: "slow-messages"})
		assertEmpty(t, ana)

		time.Sleep(time.Second / MessagesPerSecond)
		room.Send(juan, "again", 0)
		expect(t, ana, said(juan, MessagesPerSecond+1, "again"))
	})
}

func TestTypingReachesEveryoneButTheTypist(t *testing.T) {
	room := newTestRoom()
	juan, ana, luis := join(t, room, "Juan"), join(t, room, "Ana"), join(t, room, "Luis")
	drain(juan)
	drain(ana)
	drain(luis)

	room.Typing(juan)

	expect(t, ana, typing(juan))
	expect(t, luis, typing(juan))
	assertEmpty(t, juan)
}

func TestTypingIsRelayedOncePerInterval(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		room := newTestRoom()
		juan, ana := join(t, room, "Juan"), join(t, room, "Ana")
		drain(juan)
		drain(ana)

		room.Typing(juan)
		receive(t, ana)
		room.Typing(juan)
		assertEmpty(t, ana)
		assertEmpty(t, juan)

		time.Sleep(TypingInterval)
		room.Typing(juan)
		expect(t, ana, typing(juan))
	})
}

func TestTypingLeavesTheMessageLimitAlone(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		room := newTestRoom()
		juan, ana := join(t, room, "Juan"), join(t, room, "Ana")
		drain(juan)
		drain(ana)

		room.Typing(juan)
		receive(t, ana)
		for i := range MessagesPerSecond {
			room.Send(juan, "hola", 0)
			expect(t, ana, said(juan, i+1, "hola"))
			receive(t, juan)
		}
	})
}

func TestTypingNeverDisconnectsASlowMember(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		room := newTestRoom()
		juan, ana := join(t, room, "Juan"), join(t, room, "Ana")
		drain(juan)
		for range mailboxSize - 1 {
			room.Send(ana, "hola", 0)
			time.Sleep(time.Second)
		}
		drain(ana)

		room.Typing(ana)
		time.Sleep(TypingInterval)
		room.Typing(ana)

		if got := room.people(); !reflect.DeepEqual(got, people(juan, ana)) {
			t.Errorf("members = %v, want Juan and Ana", got)
		}
		assertConnected(t, ana, true)
	})
}

func TestValidName(t *testing.T) {
	cases := map[string]bool{
		"Juan":                  true,
		"":                      false,
		"   ":                   false,
		strings.Repeat("x", 24): true,
		strings.Repeat("x", 25): false,
		strings.Repeat("ñ", 24): true,
	}
	for name, want := range cases {
		if got := ValidName(name); got != want {
			t.Errorf("ValidName(%q) = %v, want %v", name, got, want)
		}
	}
}

func TestNewFileChecksWhatItHolds(t *testing.T) {
	png := []byte("\x89PNG\r\n\x1a\nrest of the image")
	webm := []byte("\x1a\x45\xdf\xa3rest of the recording")
	cases := []struct {
		label, name string
		data        []byte
		seconds     int
		ok          bool
		kind, mime  string
	}{
		{"a voice message", "voice.webm", webm, 12, true, "voice", "audio/webm"},
		{"the longest voice message", "voice.webm", webm, VoiceMaxSeconds, true, "voice", "audio/webm"},
		{"a voice message too long", "voice.webm", webm, VoiceMaxSeconds + 1, false, "", ""},
		{"a voice message that isn't audio", "voice.webm", png, 12, false, "", ""},
		{"a voice message over its size", "voice.webm", append(webm, make([]byte, VoiceMaxBytes)...), 12, false, "", ""},
		{"a negative length", "voice.webm", webm, -1, false, "", ""},
		{"a png", " photo.png ", png, 0, true, "image", "image/png"},
		{"text", "notes.txt", []byte("hola"), 0, true, "file", ""},
		{"an svg, never shown inline", "logo.svg", []byte("<svg xmlns='http://www.w3.org/2000/svg'><script>x</script></svg>"), 0, true, "file", ""},
		{"the largest allowed", "big.bin", make([]byte, FileMaxBytes), 0, true, "file", ""},
		{"one byte too many", "big.bin", make([]byte, FileMaxBytes+1), 0, false, "", ""},
		{"no name", "  ", png, 0, false, "", ""},
		{"a name too long", strings.Repeat("ñ", FileNameMaxLength+1), png, 0, false, "", ""},
		{"no data", "empty.txt", nil, 0, false, "", ""},
	}
	for _, c := range cases {
		file, ok := NewFile(c.name, c.data, c.seconds)
		if ok != c.ok {
			t.Errorf("%s: ok = %v, want %v", c.label, ok, c.ok)
			continue
		}
		if ok && (file.Kind != c.kind || file.Mime != c.mime || file.Seconds != c.seconds || file.Name != strings.TrimSpace(c.name) || !bytes.Equal(file.Data, c.data)) {
			t.Errorf("%s: got %s %q %q, want %s %q", c.label, file.Kind, file.Mime, file.Name, c.kind, c.mime)
		}
	}
	if file, _ := NewFile("photo.png", png, 0); file.Size != len(png) {
		t.Errorf("Size = %d, want %d", file.Size, len(png))
	}
}

func TestFilesReachEveryoneWithinTheirOwnLimit(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		room := newTestRoom()
		juan, ana := join(t, room, "Juan"), join(t, room, "Ana")
		drain(juan)
		drain(ana)
		file, _ := NewFile("notes.txt", []byte("hola"), 0)
		sent := Message{Type: "message", Room: roomID, ID: juan.client.ID, Name: "Juan", File: file}
		receipt := sent
		receipt.File = &File{Kind: "file", Name: "notes.txt", Size: 4}

		for i := range FileBurst {
			sent.Seq, receipt.Seq = i+1, i+1
			room.SendFile(juan, file, "", 0)
			expect(t, juan, receipt)
			expect(t, ana, sent)
		}
		sent.Seq = FileBurst + 2
		room.SendFile(juan, file, "", 0)
		expect(t, juan, Message{Type: "error", Room: roomID, Code: "slow-files"})
		assertEmpty(t, ana)

		room.Send(juan, "text still flows", 0)
		expect(t, ana, said(juan, FileBurst+1, "text still flows"))

		time.Sleep(FileInterval)
		room.SendFile(juan, file, "", 0)
		expect(t, ana, sent)
	})
}

func TestACaptionTravelsWithItsFile(t *testing.T) {
	room := newTestRoom()
	juan, ana := join(t, room, "Juan"), join(t, room, "Ana")
	drain(juan)
	drain(ana)
	file, _ := NewFile("notes.txt", []byte("hola"), 0)

	room.SendFile(juan, file, "   ", 0)
	room.SendFile(juan, file, strings.Repeat("x", MessageMaxLength+1), 0)
	assertEmpty(t, ana)

	room.SendFile(juan, file, "for Saturday", 0)
	expect(t, ana, Message{Type: "message", Room: roomID, ID: juan.client.ID, Name: "Juan", Text: "for Saturday", File: file, Seq: 1})
	expect(t, juan, Message{Type: "message", Room: roomID, ID: juan.client.ID, Name: "Juan", Text: "for Saturday", File: &File{Kind: "file", Name: "notes.txt", Size: 4}, Seq: 1})
}

func renamed(who *Member, label, name string) Message {
	return Message{Type: "renamed", Room: label, ID: who.client.ID, Name: name}
}

func TestRenameTellsEveryChatTheTabIsIn(t *testing.T) {
	rooms := NewRegistry()
	room := newTestRoom()
	juan, ana := join(t, room, "Juan"), join(t, room, "Ana")
	luis := rooms.Connect("Luis")
	juan.client.remember(room.ID, room, juan)
	rooms.Open(juan.client, luis.ID)
	rooms.Send(juan.client, luis.ID, "hi", 0)
	drain(juan)
	drain(ana)
	for range 2 {
		next(t, luis)
	}

	juan.client.Rename(" Cráneo ")

	got := map[string]Message{}
	for range 3 {
		message := receive(t, juan)
		got[message.Room] = message
	}
	assertEmpty(t, juan)
	want := map[string]Message{
		"":      {Type: "renamed", ID: juan.client.ID, Name: "Cráneo"},
		roomID:  renamed(juan, roomID, "Cráneo"),
		luis.ID: renamed(juan, luis.ID, "Cráneo"),
	}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("Juan got %+v, want %+v", got, want)
	}
	expect(t, ana, renamed(juan, roomID, "Cráneo"))
	assertEmpty(t, ana)
	if got := next(t, luis); !reflect.DeepEqual(got, renamed(juan, juan.client.ID, "Cráneo")) {
		t.Errorf("Luis got %+v", got)
	}
	assertNothing(t, luis)

	room.Send(juan, "again", 0)
	expect(t, ana, said(juan, 1, "again"))
}

func TestRenameIsRateLimited(t *testing.T) {
	room := newTestRoom()
	juan, ana := join(t, room, "Juan"), join(t, room, "Ana")
	juan.client.remember(room.ID, room, juan)
	drain(juan)
	drain(ana)

	juan.client.Rename("One")
	drain(juan)
	drain(ana)
	juan.client.Rename("Two")

	expect(t, juan, Message{Type: "error", Code: "slow-renames"})
	assertEmpty(t, juan)
	assertEmpty(t, ana)
	if juan.client.Name() != "One" {
		t.Errorf("name = %q, want One", juan.client.Name())
	}
}

func TestInvalidRenamesAreSilentAndFree(t *testing.T) {
	room := newTestRoom()
	juan, ana := join(t, room, "Juan"), join(t, room, "Ana")
	juan.client.remember(room.ID, room, juan)
	drain(juan)
	drain(ana)

	for _, name := range []string{"", "   ", strings.Repeat("x", 25), "Juan"} {
		juan.client.Rename(name)
		assertEmpty(t, juan)
		assertEmpty(t, ana)
	}

	juan.client.Rename("Nuevo")
	expect(t, juan, Message{Type: "renamed", ID: juan.client.ID, Name: "Nuevo"})
	expect(t, juan, renamed(juan, roomID, "Nuevo"))
}
