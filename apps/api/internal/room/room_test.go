package room

import (
	"errors"
	"fmt"
	"reflect"
	"strings"
	"testing"
	"testing/synctest"
	"time"
)

const roomID = "room-1"

func newTestRoom() *Room {
	return newRoom(roomID, func() {})
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
		t.Fatalf("%s got nothing", member.client.Name)
		return Message{}
	}
}

func expect(t *testing.T, member *Member, want Message) {
	t.Helper()
	if got := receive(t, member); !reflect.DeepEqual(got, want) {
		t.Errorf("%s got %+v, want %+v", member.client.Name, got, want)
	}
}

func assertEmpty(t *testing.T, member *Member) {
	t.Helper()
	select {
	case message := <-member.client.Messages():
		t.Fatalf("%s got %+v, want nothing", member.client.Name, message)
	default:
	}
}

func assertConnected(t *testing.T, member *Member, want bool) {
	t.Helper()
	select {
	case <-member.client.Gone():
		if want {
			t.Errorf("%s was disconnected", member.client.Name)
		}
	default:
		if !want {
			t.Errorf("%s is still connected", member.client.Name)
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
	return Message{Type: "joined", Room: roomID, ID: who.client.ID, Name: who.client.Name, Members: people(members...)}
}

func left(who *Member, members ...*Member) Message {
	return Message{Type: "left", Room: roomID, ID: who.client.ID, Name: who.client.Name, Members: people(members...)}
}

func said(who *Member, text string) Message {
	return Message{Type: "message", Room: roomID, ID: who.client.ID, Name: who.client.Name, Text: text}
}

func typing(who *Member) Message {
	return Message{Type: "typing", Room: roomID, ID: who.client.ID, Name: who.client.Name}
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

	room.Send(juan, "hola")

	expect(t, juan, said(juan, "hola"))
	expect(t, ana, said(juan, "hola"))
}

func TestLateJoinerSeesNothingFromBefore(t *testing.T) {
	room := newTestRoom()
	juan := join(t, room, "Juan")
	room.Send(juan, "before")
	drain(juan)

	ana := join(t, room, "Ana")
	expect(t, ana, joined(ana, juan, ana))
	assertEmpty(t, ana)

	room.Send(juan, "after")
	if got := receive(t, ana); got.Text != "after" {
		t.Errorf("Ana got %q, want %q", got.Text, "after")
	}
}

func TestLeftMemberStopsReceiving(t *testing.T) {
	room := newTestRoom()
	juan, ana := join(t, room, "Juan"), join(t, room, "Ana")
	drain(ana)

	room.Leave(ana)
	room.Send(juan, "hola")

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
			room.Send(fast, "hola")
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

	room.Send(juan, "   ")
	assertEmpty(t, juan)
}

func TestMessagesOverTheMaxLengthAreIgnored(t *testing.T) {
	room := newTestRoom()
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
		room := newTestRoom()
		juan, ana := join(t, room, "Juan"), join(t, room, "Ana")
		drain(juan)
		drain(ana)

		for range MessagesPerSecond {
			room.Send(juan, "hola")
			receive(t, juan)
			receive(t, ana)
		}

		room.Send(juan, "one too many")
		expect(t, juan, Message{Type: "error", Room: roomID, Text: "Slow down: up to 5 messages per second."})
		assertEmpty(t, ana)

		time.Sleep(time.Second / MessagesPerSecond)
		room.Send(juan, "again")
		expect(t, ana, said(juan, "again"))
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
		for range MessagesPerSecond {
			room.Send(juan, "hola")
			expect(t, ana, said(juan, "hola"))
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
			room.Send(ana, "hola")
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
