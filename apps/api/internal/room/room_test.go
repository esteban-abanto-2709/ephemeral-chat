package room

import (
	"strings"
	"testing"
)

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

func assertEmpty(t *testing.T, member *Member) {
	t.Helper()
	select {
	case message := <-member.Messages():
		t.Fatalf("%s got %+v, want nothing", member.Name, message)
	default:
	}
}

func TestSendReachesEveryMemberWithTheSenderName(t *testing.T) {
	room := newRoom()
	juan, ana := room.Join("Juan"), room.Join("Ana")

	room.Send(juan, "hola")

	want := Message{Name: "Juan", Text: "hola"}
	for _, member := range []*Member{juan, ana} {
		if got := receive(t, member); got != want {
			t.Errorf("%s got %+v, want %+v", member.Name, got, want)
		}
	}
}

func TestLateJoinerSeesNothingFromBefore(t *testing.T) {
	room := newRoom()
	juan := room.Join("Juan")
	room.Send(juan, "before")
	receive(t, juan)

	ana := room.Join("Ana")
	assertEmpty(t, ana)

	room.Send(juan, "after")
	if got := receive(t, ana); got.Text != "after" {
		t.Errorf("Ana got %q, want %q", got.Text, "after")
	}
}

func TestLeftMemberStopsReceiving(t *testing.T) {
	room := newRoom()
	juan, ana := room.Join("Juan"), room.Join("Ana")

	room.Leave(ana)
	room.Send(juan, "hola")

	if _, ok := <-ana.Messages(); ok {
		t.Error("Ana's mailbox should be closed after leaving")
	}
	receive(t, juan)
}

func TestSlowMemberIsDisconnected(t *testing.T) {
	room := newRoom()
	fast, slow := room.Join("Fast"), room.Join("Slow")

	for range mailboxSize + 1 {
		room.Send(fast, "hola")
		receive(t, fast)
	}

	for range mailboxSize {
		receive(t, slow)
	}
	if _, ok := <-slow.Messages(); ok {
		t.Error("the slow member's mailbox should be closed")
	}
	if len(room.members) != 1 {
		t.Errorf("room has %d members, want only the fast one", len(room.members))
	}
}

func TestBlankMessagesAreIgnored(t *testing.T) {
	room := newRoom()
	juan := room.Join("Juan")

	room.Send(juan, "   ")
	assertEmpty(t, juan)
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
