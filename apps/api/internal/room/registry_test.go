package room

import (
	"regexp"
	"sync"
	"testing"
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
