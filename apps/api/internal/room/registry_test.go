package room

import (
	"errors"
	"regexp"
	"sync"
	"testing"
	"testing/synctest"
	"time"
)

var urlSafeID = regexp.MustCompile(`^[A-Za-z0-9_-]{22}$`)

func TestCreateGivesUniqueURLSafeIDs(t *testing.T) {
	rooms := NewRegistry()
	first, second := rooms.Create(), rooms.Create()

	for _, id := range []string{first, second} {
		if !urlSafeID.MatchString(id) {
			t.Errorf("id %q is not 22 URL-safe characters", id)
		}
	}
	if first == second {
		t.Errorf("two rooms got the same id %q", first)
	}
	if len(rooms.rooms) != 2 {
		t.Errorf("registry holds %d rooms, want 2", len(rooms.rooms))
	}
}

func TestCreateFromManyGoroutines(t *testing.T) {
	rooms := NewRegistry()
	const n = 1000

	var wg sync.WaitGroup
	for range n {
		wg.Go(func() { rooms.Create() })
	}
	wg.Wait()

	if len(rooms.rooms) != n {
		t.Errorf("registry holds %d rooms, want %d", len(rooms.rooms), n)
	}
}

func assertExists(t *testing.T, rooms *Registry, id string, want bool) {
	t.Helper()
	synctest.Wait()
	if _, ok := rooms.Get(id); ok != want {
		t.Fatalf("room exists = %v, want %v", ok, want)
	}
}

func TestEmptyRoomIsDroppedAfterAMinute(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		rooms := NewRegistry()
		id := rooms.Create()
		room, _ := rooms.Get(id)

		time.Sleep(emptyLifetime - time.Second)
		assertExists(t, rooms, id, true)

		juan := join(t, room, "Juan")
		time.Sleep(2 * emptyLifetime)
		assertExists(t, rooms, id, true)

		room.Leave(juan)
		time.Sleep(emptyLifetime - time.Second)
		assertExists(t, rooms, id, true)

		time.Sleep(time.Second)
		assertExists(t, rooms, id, false)
		if _, err := room.Join(NewClient("Ana")); !errors.Is(err, ErrRoomGone) {
			t.Errorf("joining a dropped room: error = %v, want ErrRoomGone", err)
		}
	})
}

func TestUnusedRoomIsDroppedAfterAMinute(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		rooms := NewRegistry()
		id := rooms.Create()

		time.Sleep(emptyLifetime)
		assertExists(t, rooms, id, false)
	})
}

func TestRejoiningWithinTheMinuteKeepsTheRoom(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		rooms := NewRegistry()
		id := rooms.Create()
		room, _ := rooms.Get(id)

		room.Leave(join(t, room, "Juan"))
		time.Sleep(emptyLifetime - time.Second)
		room.Leave(join(t, room, "Juan"))

		time.Sleep(emptyLifetime - time.Second)
		assertExists(t, rooms, id, true)
		time.Sleep(time.Second)
		assertExists(t, rooms, id, false)
	})
}
