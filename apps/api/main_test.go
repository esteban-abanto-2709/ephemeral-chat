package main

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"reflect"
	"runtime"
	"strconv"
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
	os.Mkdir(filepath.Join(dir, "backdrops"), 0o755)
	os.WriteFile(filepath.Join(dir, "backdrops", "dark.webp"), []byte("webp"), 0o644)
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
		{"GET", "/backdrops/", 200, "<app-root>"},
		{"GET", "/backdrops", 200, "<app-root>"},
		{"GET", "/backdrops/dark.webp", 200, "webp"},
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
	os.Mkdir(filepath.Join(dir, "backdrops"), 0o755)
	os.WriteFile(filepath.Join(dir, "backdrops", "dark.webp"), []byte("webp"), 0o644)
	mux := newMux(dir)

	for path, want := range map[string]string{"/": "no-cache", "/room/abc": "no-cache", "/main.js": "", "/backdrops/": "no-cache"} {
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

func TestAFullServerAnswers503(t *testing.T) {
	registry := room.NewRegistry()
	for range room.MaxRooms {
		if _, err := registry.Create("Trip"); err != nil {
			t.Fatal(err)
		}
	}
	rec := httptest.NewRecorder()
	createRoom(registry)(rec, httptest.NewRequest("POST", "/api/rooms", strings.NewReader(`{"name": "Trip"}`)))
	if rec.Code != http.StatusServiceUnavailable {
		t.Errorf("POST /api/rooms on a full server = %d, want 503", rec.Code)
	}

	for range room.MaxConnections {
		if _, err := registry.Connect("Juan"); err != nil {
			t.Fatal(err)
		}
	}
	rec = httptest.NewRecorder()
	connect(registry, newUploads(uploadSlots, uploadTimeout), pingInterval, downloadTimeout)(rec, httptest.NewRequest("GET", "/api/ws?name=Juan", nil))
	if rec.Code != http.StatusServiceUnavailable {
		t.Errorf("GET /api/ws on a full server = %d, want 503", rec.Code)
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
	readBinary := func(conn *websocket.Conn) (room.Message, []byte) {
		t.Helper()
		kind, frame, err := conn.Read(ctx)
		if err != nil {
			t.Fatal(err)
		}
		head, data, ok := decodeFrame(frame)
		if kind != websocket.MessageBinary || !ok {
			t.Fatalf("got frame kind %v (parsed %v), want a binary frame", kind, ok)
		}
		var got room.Message
		if err := json.Unmarshal(head, &got); err != nil {
			t.Fatal(err)
		}
		return got, data
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
	flooder.conn.Write(ctx, websocket.MessageBinary, make([]byte, frameMaxBytes+1))
	if _, _, err := flooder.conn.Read(ctx); websocket.CloseStatus(err) != websocket.StatusMessageTooBig {
		t.Errorf("sending a frame over %d bytes closed with %v, want %d", frameMaxBytes, err, websocket.StatusMessageTooBig)
	}
	expect(room.Message{Type: "left", Room: id, ID: flooder.person.ID, Name: "Flooder", Members: []room.Person{juan.person}}, juan)

	send(juan, map[string]any{"type": "message", "room": id, "text": "still here", "reply": 1})
	stillHere := said(juan, 2, "still here")
	stillHere.Reply = 1
	expect(stillHere, juan)

	luis := open("Luis")
	send(luis, map[string]string{"type": "join", "room": id})
	expect(joined(luis, juan, luis), juan, luis)
	sendBinary := func(from tab, header any, data []byte) {
		t.Helper()
		var frame bytes.Buffer
		if err := writeFrame(&frame, header, data); err != nil {
			t.Fatal(err)
		}
		if err := from.conn.Write(ctx, websocket.MessageBinary, frame.Bytes()); err != nil {
			t.Fatal(err)
		}
	}
	if err := juan.conn.Write(ctx, websocket.MessageBinary, []byte{0, 0, 0, 9, '{'}); err != nil {
		t.Fatal(err)
	}
	sendBinary(juan, map[string]string{"type": "message", "room": id, "text": "not a file"}, nil)
	send(juan, map[string]string{"type": "file", "room": id, "name": "notes.txt", "data": "aG9sYQ==", "text": "as json"})
	sendBinary(juan, map[string]string{"type": "file", "room": id, "name": "notes.txt", "text": "in binary"}, []byte("hola"))
	inBinary := room.Message{Type: "message", Room: id, ID: juan.person.ID, Name: "Juan", Text: "in binary", File: &room.File{Kind: "file", Name: "notes.txt", Size: 4}, Seq: 3}
	expect(inBinary, juan)
	header, data := readBinary(luis.conn)
	if !reflect.DeepEqual(header, inBinary) || string(data) != "hola" {
		t.Errorf("Luis got %+v with %q, want %+v with %q", header, data, inBinary, "hola")
	}

	send(luis, map[string]string{"type": "rename", "name": "Cráneo Negro"})
	expect(room.Message{Type: "renamed", ID: luis.person.ID, Name: "Cráneo Negro"}, luis)
	renamed := room.Message{Type: "renamed", Room: id, ID: luis.person.ID, Name: "Cráneo Negro"}
	expect(renamed, luis, juan)
}

func TestAFileIsHeldOnceForAGroup(t *testing.T) {
	server := httptest.NewServer(newMux(""))
	defer server.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	resp, err := http.Post(server.URL+"/api/rooms", "application/json", strings.NewReader(`{"name": "Crowd"}`))
	if err != nil {
		t.Fatal(err)
	}
	var created struct{ ID string }
	json.NewDecoder(resp.Body).Decode(&created)
	resp.Body.Close()

	conns := make([]*websocket.Conn, room.MaxMembers)
	for i := range conns {
		conn, _, err := websocket.Dial(ctx, server.URL+"/api/ws?name=Tab"+strconv.Itoa(i), nil)
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { conn.CloseNow() })
		if err := wsjson.Write(ctx, conn, map[string]string{"type": "join", "room": created.ID}); err != nil {
			t.Fatal(err)
		}
		conns[i] = conn
	}

	heap := func() uint64 {
		runtime.GC()
		var stats runtime.MemStats
		runtime.ReadMemStats(&stats)
		return stats.HeapAlloc
	}
	time.Sleep(time.Second)
	before := heap()

	for range 2 {
		var frame bytes.Buffer
		header := map[string]string{"type": "file", "room": created.ID, "name": "big.bin"}
		if err := writeFrame(&frame, header, make([]byte, room.FileMaxBytes)); err != nil {
			t.Fatal(err)
		}
		if err := conns[0].Write(ctx, websocket.MessageBinary, frame.Bytes()); err != nil {
			t.Fatal(err)
		}
		time.Sleep(time.Second)
	}

	growth := int64(heap()) - int64(before)
	t.Logf("heap grew by %d MiB", growth>>20)
	if growth > 64<<20 {
		t.Errorf("heap grew by %d MiB sending a file to %d slow readers, want at most 64", growth>>20, room.MaxMembers)
	}
}

func TestRoomChatRelaysRead(t *testing.T) {
	server := httptest.NewServer(newMux(""))
	defer server.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	read := func(conn *websocket.Conn) room.Message {
		t.Helper()
		var got room.Message
		if err := wsjson.Read(ctx, conn, &got); err != nil {
			t.Fatal(err)
		}
		return got
	}
	open := func(name string) (*websocket.Conn, string) {
		t.Helper()
		conn, _, err := websocket.Dial(ctx, server.URL+"/api/ws?name="+name, nil)
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { conn.CloseNow() })
		return conn, read(conn).ID
	}
	send := func(conn *websocket.Conn, frame any) {
		t.Helper()
		if err := wsjson.Write(ctx, conn, frame); err != nil {
			t.Fatal(err)
		}
	}

	a, aID := open("Ana")
	b, bID := open("Beto")

	send(a, map[string]string{"type": "message", "room": bID, "text": "hola"})
	if got := read(a); got.Type != "joined" || !got.Private {
		t.Fatalf("Ana got %+v, want the private chat", got)
	}
	if got := read(a); got.Type != "message" || got.Seq != 1 {
		t.Fatalf("Ana got %+v, want her message", got)
	}
	if got := read(b); got.Type != "joined" || got.Room != aID {
		t.Fatalf("Beto got %+v, want the private chat", got)
	}
	if got := read(b); got.Type != "message" || got.Seq != 1 {
		t.Fatalf("Beto got %+v, want the message", got)
	}

	send(b, map[string]any{"type": "read", "room": aID, "seq": 1})
	want := room.Message{Type: "read", Room: bID, ID: bID, Seq: 1}
	if got := read(a); !reflect.DeepEqual(got, want) {
		t.Errorf("Ana got %+v, want %+v", got, want)
	}
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
	server := httptest.NewServer(connect(room.NewRegistry(), newUploads(uploadSlots, uploadTimeout), ping, downloadTimeout))
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

type uploadTabs struct {
	t      *testing.T
	ctx    context.Context
	server *httptest.Server
}

func newUploadTabs(t *testing.T, slots int, timeout time.Duration) *uploadTabs {
	server := httptest.NewServer(connect(room.NewRegistry(), newUploads(slots, timeout), pingInterval, downloadTimeout))
	t.Cleanup(server.Close)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	t.Cleanup(cancel)
	return &uploadTabs{t, ctx, server}
}

func (u *uploadTabs) open(name string) (*websocket.Conn, string) {
	u.t.Helper()
	conn, _, err := websocket.Dial(u.ctx, "ws"+strings.TrimPrefix(u.server.URL, "http")+"?name="+name, nil)
	if err != nil {
		u.t.Fatal(err)
	}
	u.t.Cleanup(func() { conn.CloseNow() })
	var ready room.Message
	if err := wsjson.Read(u.ctx, conn, &ready); err != nil {
		u.t.Fatal(err)
	}
	return conn, ready.ID
}

func (u *uploadTabs) frames(conn *websocket.Conn) <-chan websocket.MessageType {
	got := make(chan websocket.MessageType, 16)
	go func() {
		for {
			kind, _, err := conn.Read(u.ctx)
			if err != nil {
				return
			}
			if kind == websocket.MessageBinary {
				got <- kind
			}
		}
	}()
	return got
}

func (u *uploadTabs) file(to string) []byte {
	var frame bytes.Buffer
	if err := writeFrame(&frame, map[string]string{"type": "file", "room": to, "name": "a.txt"}, []byte("hola")); err != nil {
		u.t.Fatal(err)
	}
	return frame.Bytes()
}

func (u *uploadTabs) startUpload(conn *websocket.Conn) io.WriteCloser {
	w, err := conn.Writer(u.ctx, websocket.MessageBinary)
	if err != nil {
		u.t.Fatal(err)
	}
	if _, err := w.Write(make([]byte, 64<<10)); err != nil {
		u.t.Fatal(err)
	}
	return w
}

func (u *uploadTabs) waitForBinary(got <-chan websocket.MessageType) {
	u.t.Helper()
	timeout := time.After(3 * time.Second)
	for {
		select {
		case kind := <-got:
			if kind == websocket.MessageBinary {
				return
			}
		case <-timeout:
			u.t.Fatal("the file never arrived")
		}
	}
}

func TestAnUploadWaitsForAFreeSlot(t *testing.T) {
	u := newUploadTabs(t, 1, 10*time.Second)
	a, _ := u.open("Ana")
	b, _ := u.open("Beto")
	c, cID := u.open("Carla")
	got := u.frames(c)

	slow := u.startUpload(a)
	if err := b.Write(u.ctx, websocket.MessageBinary, u.file(cID)); err != nil {
		t.Fatal(err)
	}
	select {
	case <-got:
		t.Fatal("a file arrived while the only slot was taken")
	case <-time.After(100 * time.Millisecond):
	}

	if err := slow.Close(); err != nil {
		t.Fatal(err)
	}
	u.waitForBinary(got)
}

func TestAStalledUploadIsCut(t *testing.T) {
	u := newUploadTabs(t, 1, 100*time.Millisecond)
	a, _ := u.open("Ana")
	b, _ := u.open("Beto")
	c, cID := u.open("Carla")
	got := u.frames(c)

	u.startUpload(a)
	if _, _, err := a.Read(u.ctx); err == nil {
		t.Fatal("a stalled upload was not cut")
	}

	if err := b.Write(u.ctx, websocket.MessageBinary, u.file(cID)); err != nil {
		t.Fatal(err)
	}
	u.waitForBinary(got)
}

func TestAStalledDownloadIsCut(t *testing.T) {
	server := httptest.NewServer(connect(room.NewRegistry(), newUploads(uploadSlots, uploadTimeout), pingInterval, 300*time.Millisecond))
	t.Cleanup(server.Close)
	u := &uploadTabs{t, nil, server}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	t.Cleanup(cancel)
	u.ctx = ctx

	_, readerID := u.open("Reader")
	var frame bytes.Buffer
	header := map[string]string{"type": "file", "room": readerID, "name": "big.bin"}
	if err := writeFrame(&frame, header, make([]byte, room.FileMaxBytes)); err != nil {
		t.Fatal(err)
	}
	left := make(chan struct{}, 2)
	for _, name := range []string{"Ana", "Beto"} {
		sender, _ := u.open(name)
		for range 2 {
			if err := sender.Write(ctx, websocket.MessageBinary, frame.Bytes()); err != nil {
				t.Fatal(err)
			}
		}
		go func() {
			for {
				var m room.Message
				if wsjson.Read(ctx, sender, &m) != nil {
					return
				}
				if m.Type == "left" && m.Room == readerID {
					left <- struct{}{}
					return
				}
			}
		}()
	}
	select {
	case <-left:
	case <-ctx.Done():
		t.Fatal("a reader that never reads was not cut")
	}
}

func TestATextFrameOverTheLimitClosesTheConnection(t *testing.T) {
	u := newUploadTabs(t, 1, 10*time.Second)
	a, _ := u.open("Ana")
	b, _ := u.open("Beto")
	c, cID := u.open("Carla")
	got := u.frames(c)

	if err := a.Write(u.ctx, websocket.MessageText, bytes.Repeat([]byte("x"), textFrameMaxBytes+1)); err != nil {
		t.Fatal(err)
	}
	if _, _, err := a.Read(u.ctx); err == nil {
		t.Fatal("a text frame over the limit left the connection open")
	}

	if err := b.Write(u.ctx, websocket.MessageBinary, u.file(cID)); err != nil {
		t.Fatal(err)
	}
	u.waitForBinary(got)
}
