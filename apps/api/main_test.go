package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"

	"github.com/esteban-abanto-2709/ephemeral-chat/apps/api/internal/room"
)

func TestRouting(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "index.html"), []byte("<app-root>"), 0o644)
	os.WriteFile(filepath.Join(dir, "main.js"), []byte("console.log"), 0o644)
	mux := newMux(dir)

	cases := []struct {
		method, path string
		status       int
		body         string
	}{
		{"GET", "/api/health", 200, "ok"},
		{"GET", "/api/missing", 404, "404"},
		{"GET", "/api/rooms/unknown", 404, "404"},
		{"POST", "/api/rooms", 400, "name must be"},
		{"GET", "/api/rooms/unknown/ws?name=Juan", 404, "404"},
		{"GET", "/api/ws", 400, "name must be"},
		{"POST", "/api/health", 405, ""},
		{"GET", "/", 200, "<app-root>"},
		{"GET", "/main.js", 200, "console.log"},
		{"GET", "/room/abc", 200, "<app-root>"},
		{"GET", "/../main.js", 307, "/main.js"},
	}
	for _, c := range cases {
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, httptest.NewRequest(c.method, c.path, nil))
		if rec.Code != c.status || !strings.Contains(rec.Body.String(), c.body) {
			t.Errorf("%s %s = %d %q, want %d containing %q", c.method, c.path, rec.Code, rec.Body.String(), c.status, c.body)
		}
	}
}

func TestIndexIsNeverCached(t *testing.T) {
	dir := t.TempDir()
	os.WriteFile(filepath.Join(dir, "index.html"), []byte("<app-root>"), 0o644)
	os.WriteFile(filepath.Join(dir, "main.js"), []byte("console.log"), 0o644)
	mux := newMux(dir)

	for path, want := range map[string]string{"/": "no-cache", "/room/abc": "no-cache", "/main.js": ""} {
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, httptest.NewRequest("GET", path, nil))
		if got := rec.Header().Get("Cache-Control"); got != want {
			t.Errorf("GET %s Cache-Control = %q, want %q", path, got, want)
		}
	}
}

func TestCreateRoom(t *testing.T) {
	mux := newMux("")
	for body, status := range map[string]int{`{"name": " Trip "}`: 201, `{"name": "  "}`: 400, ``: 400, `{"name": "` + strings.Repeat("x", 25) + `"}`: 400} {
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, httptest.NewRequest("POST", "/api/rooms", strings.NewReader(body)))
		if rec.Code != status {
			t.Errorf("POST /api/rooms %s = %d, want %d", body, rec.Code, status)
		}
	}

	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest("POST", "/api/rooms", strings.NewReader(`{"name": "Trip"}`)))
	if got := rec.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", got)
	}
	var created struct{ ID string }
	if err := json.NewDecoder(rec.Body).Decode(&created); err != nil {
		t.Fatal(err)
	}
	if len(created.ID) != 22 {
		t.Errorf("id = %q, want 22 characters", created.ID)
	}
}

func TestChat(t *testing.T) {
	server := httptest.NewServer(newMux(""))
	defer server.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	create := func() string {
		resp, err := http.Post(server.URL+"/api/rooms", "application/json", strings.NewReader(`{"name": "Trip"}`))
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		var created struct{ ID string }
		json.NewDecoder(resp.Body).Decode(&created)
		return created.ID
	}
	read := func(conn *websocket.Conn) room.Message {
		t.Helper()
		var got room.Message
		if err := wsjson.Read(ctx, conn, &got); err != nil {
			t.Fatal(err)
		}
		return got
	}
	type tab struct {
		conn   *websocket.Conn
		person room.Person
	}
	open := func(name string) tab {
		t.Helper()
		conn, _, err := websocket.Dial(ctx, server.URL+"/api/ws?name="+name, nil)
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { conn.CloseNow() })
		ready := read(conn)
		if ready.Type != "ready" || ready.Name != name || len(ready.ID) != 22 {
			t.Fatalf("first frame = %+v, want ready with a 22-character id", ready)
		}
		return tab{conn, room.Person{ID: ready.ID, Name: name}}
	}
	send := func(from tab, frame any) {
		if err := wsjson.Write(ctx, from.conn, frame); err != nil {
			t.Fatal(err)
		}
	}
	expect := func(want room.Message, tabs ...tab) {
		t.Helper()
		for _, to := range tabs {
			if got := read(to.conn); !reflect.DeepEqual(got, want) {
				t.Errorf("%s got %+v, want %+v", to.person.Name, got, want)
			}
		}
	}

	id := create()
	joined := func(who tab, members ...tab) room.Message {
		people := make([]room.Person, len(members))
		for i, member := range members {
			people[i] = member.person
		}
		return room.Message{Type: "joined", Room: id, ID: who.person.ID, Name: who.person.Name, Title: "Trip", Members: people}
	}
	said := func(who tab, seq int, text string) room.Message {
		return room.Message{Type: "message", Room: id, ID: who.person.ID, Name: who.person.Name, Text: text, Seq: seq}
	}

	juan := open("Juan")
	send(juan, map[string]string{"type": "join", "room": id})
	expect(joined(juan, juan), juan)
	ana := open("Ana")
	send(ana, map[string]string{"type": "join", "room": id})
	expect(joined(ana, juan, ana), juan, ana)

	send(juan, map[string]string{"type": "message", "room": id, "text": "hola"})
	expect(said(juan, 1, "hola"), juan, ana)
	send(ana, map[string]string{"type": "typing", "room": id})
	expect(room.Message{Type: "typing", Room: id, ID: ana.person.ID, Name: "Ana"}, juan)

	otherJuan := open("Juan")
	send(otherJuan, map[string]string{"type": "join", "room": id})
	expect(joined(otherJuan, juan, ana, otherJuan), juan, ana, otherJuan)

	send(otherJuan, map[string]string{"type": "join", "room": "unknown"})
	expect(room.Message{Type: "error", Room: "unknown", Code: "gone"}, otherJuan)
	send(otherJuan, map[string]string{"type": "message", "room": "unknown", "text": "nobody hears this"})
	send(otherJuan, map[string]string{"type": "leave", "room": id})
	expect(room.Message{Type: "left", Room: id, ID: otherJuan.person.ID, Name: "Juan", Members: []room.Person{juan.person, ana.person}}, juan, ana)

	ana.conn.Close(websocket.StatusNormalClosure, "")
	expect(room.Message{Type: "left", Room: id, ID: ana.person.ID, Name: "Ana", Members: []room.Person{juan.person}}, juan)

	for range room.MaxChats - 1 {
		send(juan, map[string]string{"type": "join", "room": create()})
		if got := read(juan.conn); got.Type != "joined" {
			t.Fatalf("joining another room: got %+v", got)
		}
	}
	extra := create()
	send(juan, map[string]string{"type": "join", "room": extra})
	expect(room.Message{Type: "error", Room: extra, Code: "limit"}, juan)

	flooder := open("Flooder")
	send(flooder, map[string]string{"type": "join", "room": id})
	expect(joined(flooder, juan, flooder), juan, flooder)
	send(flooder, map[string]string{"text": strings.Repeat("x", frameMaxBytes)})
	if _, _, err := flooder.conn.Read(ctx); websocket.CloseStatus(err) != websocket.StatusMessageTooBig {
		t.Errorf("sending a frame over %d bytes closed with %v, want %d", frameMaxBytes, err, websocket.StatusMessageTooBig)
	}
	expect(room.Message{Type: "left", Room: id, ID: flooder.person.ID, Name: "Flooder", Members: []room.Person{juan.person}}, juan)

	send(juan, map[string]any{"type": "message", "room": id, "text": "still here", "reply": 1})
	stillHere := said(juan, 2, "still here")
	stillHere.Reply = 1
	expect(stillHere, juan)

	send(juan, map[string]string{"type": "file", "room": id, "name": "notes.txt", "data": "aG9sYQ==", "text": "for Saturday"})
	expect(room.Message{Type: "message", Room: id, ID: juan.person.ID, Name: "Juan", Text: "for Saturday", File: &room.File{Kind: "file", Name: "notes.txt", Size: 4}, Seq: 3}, juan)

	luis := open("Luis")
	send(luis, map[string]string{"type": "join", "room": id})
	expect(joined(luis, juan, luis), juan, luis)
	sendBinary := func(from tab, header any, data []byte) {
		t.Helper()
		frame, err := encodeFrame(header, data)
		if err != nil {
			t.Fatal(err)
		}
		if err := from.conn.Write(ctx, websocket.MessageBinary, frame); err != nil {
			t.Fatal(err)
		}
	}
	if err := juan.conn.Write(ctx, websocket.MessageBinary, []byte{0, 0, 0, 9, '{'}); err != nil {
		t.Fatal(err)
	}
	sendBinary(juan, map[string]string{"type": "message", "room": id, "text": "not a file"}, nil)
	sendBinary(juan, map[string]string{"type": "file", "room": id, "name": "notes.txt", "text": "in binary"}, []byte("hola"))
	inBinary := room.Message{Type: "message", Room: id, ID: juan.person.ID, Name: "Juan", Text: "in binary", File: &room.File{Kind: "file", Name: "notes.txt", Size: 4}, Seq: 4}
	expect(inBinary, juan)
	inBinary.File = &room.File{Kind: "file", Name: "notes.txt", Size: 4, Data: []byte("hola")}
	expect(inBinary, luis)
}

func TestAPIOnlyWithoutStaticDir(t *testing.T) {
	rec := httptest.NewRecorder()
	newMux("").ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))
	if rec.Code != http.StatusNotFound {
		t.Errorf("GET / without STATIC_DIR = %d, want 404", rec.Code)
	}
}

func TestKeepAlive(t *testing.T) {
	ping := 50 * time.Millisecond
	server := httptest.NewServer(connect(room.NewRegistry(), ping))
	defer server.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	dial := func() *websocket.Conn {
		conn, _, err := websocket.Dial(ctx, "ws"+strings.TrimPrefix(server.URL, "http")+"?name=Juan", nil)
		if err != nil {
			t.Fatal(err)
		}
		return conn
	}

	alive := dial()
	defer alive.CloseNow()
	var ready room.Message
	wsjson.Read(ctx, alive, &ready)
	replies := make(chan room.Message)
	go func() {
		var reply room.Message
		wsjson.Read(ctx, alive, &reply)
		replies <- reply
	}()
	time.Sleep(5 * ping)
	wsjson.Write(ctx, alive, map[string]string{"type": "join", "room": "unknown"})
	if got := <-replies; got.Code != "gone" {
		t.Errorf("a tab that answers pings got %+v after a quiet spell, want it still connected", got)
	}

	dead := dial()
	defer dead.CloseNow()
	time.Sleep(5 * ping)
	wsjson.Read(ctx, dead, &ready)
	if _, _, err := dead.Read(ctx); err == nil || ctx.Err() != nil {
		t.Errorf("a tab that never answers pings stayed connected: %v", err)
	}
}
