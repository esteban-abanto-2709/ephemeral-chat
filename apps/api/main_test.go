package main

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
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

func TestEcho(t *testing.T) {
	server := httptest.NewServer(newMux(""))
	defer server.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	conn, _, err := websocket.Dial(ctx, server.URL+"/api/ws", nil)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.CloseNow()

	for _, text := range []string{"hola", "segundo mensaje"} {
		if err := conn.Write(ctx, websocket.MessageText, []byte(text)); err != nil {
			t.Fatal(err)
		}
		_, got, err := conn.Read(ctx)
		if err != nil {
			t.Fatal(err)
		}
		if string(got) != text {
			t.Errorf("echo = %q, want %q", got, text)
		}
	}
	conn.Close(websocket.StatusNormalClosure, "")
}

func TestAPIOnlyWithoutStaticDir(t *testing.T) {
	rec := httptest.NewRecorder()
	newMux("").ServeHTTP(rec, httptest.NewRequest("GET", "/", nil))
	if rec.Code != http.StatusNotFound {
		t.Errorf("GET / without STATIC_DIR = %d, want 404", rec.Code)
	}
}
