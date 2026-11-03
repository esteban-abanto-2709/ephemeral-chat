package room

import (
	"errors"
	"reflect"
	"strings"
	"testing"
	"testing/synctest"
	"time"
)

func join(t *testing.T, room *Room, name string) *Member {
	t.Helper()
	member, err := room.Join(name)
	if err != nil {
		t.Fatalf("Join(%q): %v", name, err)
	}
	return member
}

func receive(t *testing.T, member *Member) Message {
	t.Helper()
	select {
	case message, ok := <-member.Messages():
		if !ok {
			t.Fatalf("%s's mailbox is closed", member.Name)
		}
		return message
	default:
		t.Fatalf("%s got nothing", member.Name)
		return Message{}
	}
}

func expect(t *testing.T, member *Member, want Message) {
	t.Helper()
	if got := receive(t, member); !reflect.DeepEqual(got, want) {
		t.Errorf("%s got %+v, want %+v", member.Name, got, want)
	}
}

func assertEmpty(t *testing.T, member *Member) {
	t.Helper()
	select {
	case message := <-member.Messages():
		t.Fatalf("%s got %+v, want nothing", member.Name, message)
	default:
	}
}

func drain(member *Member) {
	for {
		select {
		case _, ok := <-member.Messages():
			if !ok {
				return
			}
		default:
			return
		}
	}
}

func TestJoinAnnouncesTheNewcomerToEveryone(t *testing.T) {
	room := newRoom(func() {})
	juan := join(t, room, "Juan")
	expect(t, juan, Message{Type: "joined", Name: "Juan", Members: []string{"Juan"}})

	ana := join(t, room, "Ana")
	want := Message{Type: "joined", Name: "Ana", Members: []string{"Juan", "Ana"}}
	expect(t, juan, want)
	expect(t, ana, want)
}

func TestLeaveAnnouncesWhoIsStillHere(t *testing.T) {
	room := newRoom(func() {})
	juan, ana, luis := join(t, room, "Juan"), join(t, room, "Ana"), join(t, room, "Luis")
	drain(juan)
	drain(luis)

	room.Leave(ana)

	want := Message{Type: "left", Name: "Ana", Members: []string{"Juan", "Luis"}}
	expect(t, juan, want)
	expect(t, luis, want)
}

func TestJoinRejectsANameAlreadyInTheRoom(t *testing.T) {
	room := newRoom(func() {})
	juan := join(t, room, "Juan")
	drain(juan)

	if _, err := room.Join("jUAN"); !errors.Is(err, ErrNameTaken) {
		t.Fatalf("Join(jUAN) error = %v, want ErrNameTaken", err)
	}
	assertEmpty(t, juan)

	room.Leave(juan)
	join(t, room, "Juan")
}

func TestSendReachesEveryMemberWithTheSenderName(t *testing.T) {
	room := newRoom(func() {})
	juan, ana := join(t, room, "Juan"), join(t, room, "Ana")
	drain(juan)
	drain(ana)

	room.Send(juan, "hola")

	want := Message{Type: "message", Name: "Juan", Text: "hola"}
	expect(t, juan, want)
	expect(t, ana, want)
}

func TestLateJoinerSeesNothingFromBefore(t *testing.T) {
	room := newRoom(func() {})
	juan := join(t, room, "Juan")
	room.Send(juan, "before")
	drain(juan)

	ana := join(t, room, "Ana")
	expect(t, ana, Message{Type: "joined", Name: "Ana", Members: []string{"Juan", "Ana"}})
	assertEmpty(t, ana)

	room.Send(juan, "after")
	if got := receive(t, ana); got.Text != "after" {
		t.Errorf("Ana got %q, want %q", got.Text, "after")
	}
}

func TestLeftMemberStopsReceiving(t *testing.T) {
	room := newRoom(func() {})
	juan, ana := join(t, room, "Juan"), join(t, room, "Ana")
	drain(ana)

	room.Leave(ana)
	room.Send(juan, "hola")

	if _, ok := <-ana.Messages(); ok {
		t.Error("Ana's mailbox should be closed after leaving")
	}
}

func TestSlowMemberIsDisconnectedAndAnnounced(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		room := newRoom(func() {})
		fast, slow := join(t, room, "Fast"), join(t, room, "Slow")
		drain(fast)
		drain(slow)

		for range mailboxSize + 1 {
			room.Send(fast, "hola")
			receive(t, fast)
			time.Sleep(time.Second / MessagesPerSecond)
		}
		expect(t, fast, Message{Type: "left", Name: "Slow", Members: []string{"Fast"}})

		for range mailboxSize {
			receive(t, slow)
		}
		if _, ok := <-slow.Messages(); ok {
			t.Error("the slow member's mailbox should be closed")
		}
	})
}

func TestBlankMessagesAreIgnored(t *testing.T) {
	room := newRoom(func() {})
	juan := join(t, room, "Juan")
	drain(juan)

	room.Send(juan, "   ")
	assertEmpty(t, juan)
}

func TestMessagesOverTheMaxLengthAreIgnored(t *testing.T) {
	room := newRoom(func() {})
	juan := join(t, room, "Juan")
	drain(juan)

	room.Send(juan, strings.Repeat("ñ", MessageMaxLength+1))
	assertEmpty(t, juan)

	room.Send(juan, strings.Repeat("ñ", MessageMaxLength))
	if got := receive(t, juan); len([]rune(got.Text)) != MessageMaxLength {
		t.Errorf("got %d characters, want %d", len([]rune(got.Text)), MessageMaxLength)
	}
}

func TestSendingTooFastIsRefusedToTheSenderOnly(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		room := newRoom(func() {})
		juan, ana := join(t, room, "Juan"), join(t, room, "Ana")
		drain(juan)
		drain(ana)

		for range MessagesPerSecond {
			room.Send(juan, "hola")
			receive(t, juan)
			receive(t, ana)
		}

		room.Send(juan, "one too many")
		expect(t, juan, Message{Type: "error", Text: "Slow down: up to 5 messages per second."})
		assertEmpty(t, ana)

		time.Sleep(time.Second / MessagesPerSecond)
		room.Send(juan, "again")
		expect(t, ana, Message{Type: "message", Name: "Juan", Text: "again"})
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
