package main

import (
	"encoding/json"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path"
	"strings"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"

	"github.com/esteban-abanto-2709/ephemeral-chat/apps/api/internal/room"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("api listening on :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, newMux(os.Getenv("STATIC_DIR"))))
}

func newMux(staticDir string) *http.ServeMux {
	rooms := room.NewRegistry()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})
	mux.HandleFunc("POST /api/rooms", createRoom(rooms))
	mux.HandleFunc("GET /api/rooms/{id}/ws", joinRoom(rooms))
	mux.HandleFunc("GET /api/ws", echo)
	mux.HandleFunc("GET /api/", http.NotFound)

	if staticDir != "" {
		mux.Handle("GET /", spa(os.DirFS(staticDir)))
	}
	return mux
}

func createRoom(rooms *room.Registry) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(struct {
			ID string `json:"id"`
		}{rooms.Create()})
	}
}

func joinRoom(rooms *room.Registry) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		chat, ok := rooms.Get(r.PathValue("id"))
		if !ok {
			http.NotFound(w, r)
			return
		}
		name := strings.TrimSpace(r.URL.Query().Get("name"))
		if !room.ValidName(name) {
			http.Error(w, "name must be 1 to 24 characters", http.StatusBadRequest)
			return
		}

		conn, err := websocket.Accept(w, r, nil)
		if err != nil {
			return
		}
		defer conn.CloseNow()

		member := chat.Join(name)
		defer chat.Leave(member)

		go func() {
			for message := range member.Messages() {
				if err := wsjson.Write(r.Context(), conn, message); err != nil {
					return
				}
			}
			conn.CloseNow()
		}()

		for {
			var incoming struct {
				Text string `json:"text"`
			}
			if err := wsjson.Read(r.Context(), conn, &incoming); err != nil {
				return
			}
			chat.Send(member, incoming.Text)
		}
	}
}

func echo(w http.ResponseWriter, r *http.Request) {
	conn, err := websocket.Accept(w, r, nil)
	if err != nil {
		return
	}
	defer conn.CloseNow()

	for {
		kind, msg, err := conn.Read(r.Context())
		if err != nil {
			return
		}
		if err := conn.Write(r.Context(), kind, msg); err != nil {
			return
		}
	}
}

func spa(files fs.FS) http.Handler {
	server := http.FileServerFS(files)
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimPrefix(path.Clean(r.URL.Path), "/")
		if name == "" {
			name = "."
		}
		if _, err := fs.Stat(files, name); err != nil {
			http.ServeFileFS(w, r, files, "index.html")
			return
		}
		server.ServeHTTP(w, r)
	})
}
