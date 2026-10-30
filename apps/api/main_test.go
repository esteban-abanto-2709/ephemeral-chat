package main

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
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
	expect := func(conn *websocket.Conn, want room.Message) {
		t.Helper()
		var got room.Message
		if err := wsjson.Read(ctx, conn, &got); err != nil {
			t.Fatal(err)
		}
		if got != want {
			t.Errorf("got %+v, want %+v", got, want)
		}
	}

	juan, ana := join("Juan"), join("Ana")
	wsjson.Write(ctx, juan, map[string]string{"text": "hola"})
	expect(juan, room.Message{Name: "Juan", Text: "hola"})
	expect(ana, room.Message{Name: "Juan", Text: "hola"})

	luis := join("Luis")
	wsjson.Write(ctx, ana, map[string]string{"text": "bienvenido"})
	expect(luis, room.Message{Name: "Ana", Text: "bienvenido"})
}

func TestAPIOnlyWithoutStaticDir(t *testing.T) {
	rec := httptest.NewRecorder()
	newMux("").ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))
	if rec.Code != http.StatusNotFound {
		t.Errorf("GET / without STATIC_DIR = %d, want 404", rec.Code)
	}
}
