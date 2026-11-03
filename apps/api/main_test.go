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
		{"GET", "/api/rooms/unknown/ws?name=Juan", 404, "404"},
		{"GET", "/api/ws", 404, "404"},
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

func TestCreateRoom(t *testing.T) {
	rec := httptest.NewRecorder()
	newMux("").ServeHTTP(rec, httptest.NewRequest("POST", "/api/rooms", nil))

	if rec.Code != http.StatusCreated {
		t.Fatalf("POST /api/rooms = %d, want 201", rec.Code)
	}
	if got := rec.Header().Get("Content-Type"); got != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", got)
	}
	var body struct{ ID string }
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatal(err)
	}
	if len(body.ID) != 22 {
		t.Errorf("id = %q, want 22 characters", body.ID)
	}
}

func TestFindRoom(t *testing.T) {
	mux := newMux("")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest("POST", "/api/rooms", nil))
	var created struct{ ID string }
	json.NewDecoder(rec.Body).Decode(&created)

	rec = httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest("GET", "/api/rooms/"+created.ID, nil))
	if rec.Code != http.StatusNoContent {
		t.Errorf("GET an existing room = %d, want 204", rec.Code)
	}
}

func TestRoomChat(t *testing.T) {
	server := httptest.NewServer(newMux(""))
	defer server.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	resp, err := http.Post(server.URL+"/api/rooms", "", nil)
	if err != nil {
		t.Fatal(err)
	}
	var created struct{ ID string }
	json.NewDecoder(resp.Body).Decode(&created)
	resp.Body.Close()

	join := func(name string) *websocket.Conn {
		conn, _, err := websocket.Dial(ctx, server.URL+"/api/rooms/"+created.ID+"/ws?name="+name, nil)
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { conn.CloseNow() })
		return conn
	}
	expect := func(want room.Message, conns ...*websocket.Conn) {
		t.Helper()
		for _, conn := range conns {
			var got room.Message
			if err := wsjson.Read(ctx, conn, &got); err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(got, want) {
				t.Errorf("got %+v, want %+v", got, want)
			}
		}
	}

	juan := join("Juan")
	expect(room.Message{Type: "joined", Name: "Juan", Members: []string{"Juan"}}, juan)
	ana := join("Ana")
	expect(room.Message{Type: "joined", Name: "Ana", Members: []string{"Juan", "Ana"}}, juan, ana)

	wsjson.Write(ctx, juan, map[string]string{"text": "hola"})
	expect(room.Message{Type: "message", Name: "Juan", Text: "hola"}, juan, ana)

	luis := join("Luis")
	expect(room.Message{Type: "joined", Name: "Luis", Members: []string{"Juan", "Ana", "Luis"}}, juan, ana, luis)
	wsjson.Write(ctx, ana, map[string]string{"text": "bienvenido"})
	expect(room.Message{Type: "message", Name: "Ana", Text: "bienvenido"}, juan, ana, luis)

	ana.Close(websocket.StatusNormalClosure, "")
	expect(room.Message{Type: "left", Name: "Ana", Members: []string{"Juan", "Luis"}}, juan, luis)

	flooder := join("Flooder")
	expect(room.Message{Type: "joined", Name: "Flooder", Members: []string{"Juan", "Luis", "Flooder"}}, juan, luis, flooder)
	wsjson.Write(ctx, flooder, map[string]string{"text": strings.Repeat("x", frameMaxBytes)})
	if _, _, err := flooder.Read(ctx); websocket.CloseStatus(err) != websocket.StatusMessageTooBig {
		t.Errorf("sending a frame over %d bytes closed with %v, want %d", frameMaxBytes, err, websocket.StatusMessageTooBig)
	}
	expect(room.Message{Type: "left", Name: "Flooder", Members: []string{"Juan", "Luis"}}, juan, luis)

	impostor := join("JUAN")
	if _, _, err := impostor.Read(ctx); websocket.CloseStatus(err) != statusNameTaken {
		t.Errorf("joining as JUAN closed with %v, want %d", err, statusNameTaken)
	}
	wsjson.Write(ctx, luis, map[string]string{"text": "solo nosotros"})
	expect(room.Message{Type: "message", Name: "Luis", Text: "solo nosotros"}, juan, luis)
}

func TestAPIOnlyWithoutStaticDir(t *testing.T) {
	rec := httptest.NewRecorder()
	newMux("").ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))
	if rec.Code != http.StatusNotFound {
		t.Errorf("GET / without STATIC_DIR = %d, want 404", rec.Code)
	}
}
