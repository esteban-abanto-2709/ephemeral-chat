package room

import (
	"errors"
	"reflect"
	"regexp"
	"strings"
	"sync"
	"testing"
	"testing/synctest"
	"time"
)

var urlSafeID = regexp.MustCompile(`^[A-Za-z0-9_-]{22}$`)

func mustConnect(t *testing.T, rooms *Registry, name string) *Client {
	t.Helper()
	client, err := rooms.Connect(name)
	if err != nil {
		t.Fatal(err)
	}
	return client
}

func mustCreate(t *testing.T, rooms *Registry, name string) string {
	t.Helper()
	id, err := rooms.Create(name)
	if err != nil {
		t.Fatal(err)
	}
	return id
}

func TestCreateGivesUniqueURLSafeIDs(t *testing.T) {
	rooms := NewRegistry()
	first, second := mustCreate(t, rooms, "Trip"), mustCreate(t, rooms, "Trip")

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
		wg.Go(func() { rooms.Create("Trip") })
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
		id := mustCreate(t, rooms, "Trip")
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
		id := mustCreate(t, rooms, "Trip")

		time.Sleep(emptyLifetime)
		assertExists(t, rooms, id, false)
	})
}

func TestRejoiningWithinTheMinuteKeepsTheRoom(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		rooms := NewRegistry()
		id := mustCreate(t, rooms, "Trip")
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

func TestCreateRefusesOnceTheServerIsFull(t *testing.T) {
	synctest.Test(t, func(t *testing.T) {
		rooms := NewRegistry()
		for range MaxRooms {
			mustCreate(t, rooms, "Trip")
		}
		if _, err := rooms.Create("Trip"); !errors.Is(err, ErrServerFull) {
			t.Fatalf("creating past the ceiling: error = %v, want ErrServerFull", err)
		}

		time.Sleep(emptyLifetime)
		synctest.Wait()
		mustCreate(t, rooms, "Trip")
	})
}

func TestConnectRefusesOnceTheServerIsFull(t *testing.T) {
	rooms := NewRegistry()
	first := mustConnect(t, rooms, "Sam")
	for range MaxConnections - 1 {
		mustConnect(t, rooms, "Sam")
	}
	if _, err := rooms.Connect("Sam"); !errors.Is(err, ErrServerFull) {
		t.Fatalf("connecting past the ceiling: error = %v, want ErrServerFull", err)
	}

	rooms.Disconnect(first)
	mustConnect(t, rooms, "Sam")
}

func next(t *testing.T, client *Client) Message {
	t.Helper()
	select {
	case message := <-client.Messages():
		return message
	default:
		t.Fatalf("%s got nothing", client.Name())
		return Message{}
	}
}

func assertNothing(t *testing.T, client *Client) {
	t.Helper()
	select {
	case message := <-client.Messages():
		t.Errorf("%s got %+v, want nothing", client.Name(), message)
	default:
	}
}

func TestOpeningSomeonesIDTellsThemNothingUntilTheFirstMessage(t *testing.T) {
	rooms := NewRegistry()
	sam, luis := mustConnect(t, rooms, "Sam"), mustConnect(t, rooms, "Luis")
	both := []Person{sam.person(), luis.person()}

	rooms.Open(sam, luis.ID)
	want := Message{Type: "joined", Room: luis.ID, ID: luis.ID, Name: "Luis", Title: "Luis", Private: true, Members: both}
	if got := next(t, sam); !reflect.DeepEqual(got, want) {
		t.Errorf("Sam got %+v, want %+v", got, want)
	}
	sam.Typing(luis.ID)
	rooms.Send(sam, luis.ID, "   ", 0)
	assertNothing(t, luis)

	rooms.Send(sam, luis.ID, "hola", 0)
	if got, want := next(t, luis), (Message{Type: "joined", Room: sam.ID, ID: sam.ID, Name: "Sam", Title: "Sam", Private: true, Members: both}); !reflect.DeepEqual(got, want) {
		t.Errorf("Luis got %+v, want %+v", got, want)
	}
	if got := next(t, luis); got.Room != sam.ID || got.Text != "hola" {
		t.Errorf("Luis got %+v, want hola labeled with Sam's id", got)
	}
	next(t, sam)
	if got := next(t, sam); got.Room != luis.ID || got.Text != "hola" {
		t.Errorf("Sam got %+v, want hola labeled with Luis's id", got)
	}

	rooms.Send(luis, sam.ID, "qué tal", 0)
	if got := next(t, sam); got.Text != "qué tal" {
		t.Errorf("Sam got %+v, want Luis's reply", got)
	}
	next(t, luis)
	assertNothing(t, luis)
}

func TestFirstMessageToSomeoneGoneFails(t *testing.T) {
	rooms := NewRegistry()
	sam, luis := mustConnect(t, rooms, "Sam"), mustConnect(t, rooms, "Luis")
	rooms.Open(sam, luis.ID)
	next(t, sam)

	rooms.Disconnect(luis)
	rooms.Send(sam, luis.ID, "hola", 0)
	if got := next(t, sam); got.Type != "error" || got.Code != "gone" || got.Room != luis.ID {
		t.Errorf("Sam got %+v, want gone", got)
	}
}

func TestPrivateChatEndsWhenEitherLeaves(t *testing.T) {
	rooms := NewRegistry()
	sam, luis := mustConnect(t, rooms, "Sam"), mustConnect(t, rooms, "Luis")
	rooms.Send(sam, luis.ID, "hola", 0)
	drainClient(sam)
	drainClient(luis)

	rooms.Disconnect(luis)

	if got := next(t, sam); got.Type != "left" || got.Room != luis.ID || got.ID != luis.ID {
		t.Errorf("Sam got %+v, want Luis left", got)
	}
	if _, ok := sam.chat(luis.ID); ok {
		t.Error("Sam still holds the ended chat")
	}
	rooms.Open(sam, luis.ID)
	if got := next(t, sam); got.Code != "gone" {
		t.Errorf("opening a closed tab's id: got %+v, want gone", got)
	}
}

func drainClient(client *Client) {
	for {
		select {
		case <-client.Messages():
		default:
			return
		}
	}
}

func TestOpenRefusesWhatCannotBeOpened(t *testing.T) {
	rooms := NewRegistry()
	sam, luis := mustConnect(t, rooms, "Sam"), mustConnect(t, rooms, "Luis")
	for range MaxChats {
		rooms.Open(luis, mustCreate(t, rooms, "Group"))
		next(t, luis)
	}

	for code, want := range map[string]string{"unknown": "gone", sam.ID: "self", luis.ID: "busy"} {
		rooms.Open(sam, code)
		if got := next(t, sam); got.Type != "error" || got.Code != want || got.Room != code {
			t.Errorf("Open(%s): got %+v, want %s", code, got, want)
		}
	}
}

func TestAFileCanStartAPrivateChat(t *testing.T) {
	rooms := NewRegistry()
	sam, luis := mustConnect(t, rooms, "Sam"), mustConnect(t, rooms, "Luis")

	rooms.SendFile(sam, luis.ID, "x.txt", nil, 0, "", 0)
	assertNothing(t, luis)
	rooms.SendFile(sam, luis.ID, "notes.txt", []byte("hola"), 0, strings.Repeat("x", MessageMaxLength+1), 0)
	assertNothing(t, luis)

	rooms.SendFile(sam, luis.ID, "notes.txt", []byte("hola"), 0, "", 0)
	if got := next(t, luis); got.Type != "joined" || !got.Private {
		t.Errorf("Luis got %+v, want the private chat", got)
	}
	if got := next(t, luis); got.Room != sam.ID || got.File == nil || got.File.Name != "notes.txt" {
		t.Errorf("Luis got %+v, want notes.txt from Sam", got)
	}
}

const fullFiles = TransitMaxBytes / FileMaxBytes

func sendBlob(rooms *Registry, from *Client, label string) {
	rooms.SendFile(from, label, "blob.bin", make([]byte, FileMaxBytes), 0, "", 0)
}

func fillTransit(t *testing.T, rooms *Registry, files int) []*Client {
	t.Helper()
	readers := make([]*Client, files)
	for i := range files {
		sender := mustConnect(t, rooms, "Sender")
		readers[i] = mustConnect(t, rooms, "Reader")
		sendBlob(rooms, sender, readers[i].ID)
	}
	return readers
}

func taken(client *Client) []Message {
	var messages []Message
	for {
		select {
		case message := <-client.Messages():
			messages = append(messages, message)
		default:
			return messages
		}
	}
}

func finish(readers []*Client) {
	for _, reader := range readers {
		for _, message := range taken(reader) {
			reader.Done(message)
		}
	}
}

func assertUsed(t *testing.T, rooms *Registry, want int) {
	t.Helper()
	if got := rooms.transit.used; got != want {
		t.Errorf("transit used = %d, want %d", got, want)
	}
}

func TestAFileCountsOnceForAGroup(t *testing.T) {
	rooms := NewRegistry()
	id := mustCreate(t, rooms, "Group")
	sender := mustConnect(t, rooms, "Sender")
	clients := []*Client{sender}
	for range 4 {
		clients = append(clients, mustConnect(t, rooms, "Reader"))
	}
	for _, client := range clients {
		rooms.Open(client, id)
	}
	for _, client := range clients {
		drainClient(client)
	}

	sendBlob(rooms, sender, id)
	assertUsed(t, rooms, FileMaxBytes)

	finish(clients)
	assertUsed(t, rooms, 0)
}

func TestAFullBudgetRefusesFilesWithSlowServer(t *testing.T) {
	rooms := NewRegistry()
	fillTransit(t, rooms, fullFiles)
	assertUsed(t, rooms, fullFiles*FileMaxBytes)

	sender, reader := mustConnect(t, rooms, "Sender"), mustConnect(t, rooms, "Reader")
	sendBlob(rooms, sender, reader.ID)

	next(t, sender)
	want := Message{Type: "error", Room: reader.ID, Code: "slow-server"}
	if got := next(t, sender); !reflect.DeepEqual(got, want) {
		t.Errorf("sender got %+v, want %+v", got, want)
	}
	for _, message := range taken(reader) {
		if message.File != nil {
			t.Errorf("reader got a file past the budget: %+v", message)
		}
	}
	select {
	case <-sender.Gone():
		t.Error("sender was disconnected")
	default:
	}
	if _, ok := sender.chat(reader.ID); !ok {
		t.Error("sender lost the chat")
	}
	assertUsed(t, rooms, fullFiles*FileMaxBytes)
}

func TestBudgetComesBackWhenReadersCatchUp(t *testing.T) {
	rooms := NewRegistry()
	readers := fillTransit(t, rooms, fullFiles)

	finish(readers)
	assertUsed(t, rooms, 0)

	sender, reader := mustConnect(t, rooms, "Sender"), mustConnect(t, rooms, "Reader")
	sendBlob(rooms, sender, reader.ID)
	assertUsed(t, rooms, FileMaxBytes)
}

func TestBudgetComesBackWhenAReaderLeaves(t *testing.T) {
	rooms := NewRegistry()
	readers := fillTransit(t, rooms, 2)
	assertUsed(t, rooms, 2*FileMaxBytes)

	rooms.Disconnect(readers[0])
	rooms.Disconnect(readers[1])
	assertUsed(t, rooms, 0)
}

func TestAClosedClientTakesNoMessages(t *testing.T) {
	client := NewClient("Sam")
	client.close()

	if client.push(Message{Type: "typing"}) {
		t.Error("push to a closed client succeeded")
	}
	assertNothing(t, client)
}

func TestASenderAloneGivesTheBudgetBack(t *testing.T) {
	rooms := NewRegistry()
	id := mustCreate(t, rooms, "Group")
	sender := mustConnect(t, rooms, "Sender")
	rooms.Open(sender, id)

	sendBlob(rooms, sender, id)
	assertUsed(t, rooms, 0)
}

func TestAPrivateChatNeverStartsWithATabThatLeft(t *testing.T) {
	for i := range 10000 {
		rooms := NewRegistry()
		sam, luis := mustConnect(t, rooms, "Sam"), mustConnect(t, rooms, "Luis")
		var wg sync.WaitGroup
		wg.Add(2)
		go func() {
			defer wg.Done()
			rooms.Send(sam, luis.ID, "hola", 0)
		}()
		go func() {
			defer wg.Done()
			rooms.Disconnect(luis)
		}()
		wg.Wait()
		if luis.count() != 0 {
			t.Fatalf("iteration %d: the tab that left still has %d chats", i, luis.count())
		}
		if _, ok := sam.chat(luis.ID); ok {
			t.Fatalf("iteration %d: a private chat survived with the tab that left", i)
		}
	}
}
