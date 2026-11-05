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

const frameMaxBytes = 8 << 10

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
	mux.HandleFunc("GET /api/ws", connect(rooms))
	mux.HandleFunc("GET /api/", http.NotFound)

	if staticDir != "" {
		mux.Handle("GET /", spa(os.DirFS(staticDir)))
	}
	return mux
}

func createRoom(rooms *room.Registry) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Name string `json:"name"`
		}
		json.NewDecoder(http.MaxBytesReader(w, r.Body, frameMaxBytes)).Decode(&body)
		name := strings.TrimSpace(body.Name)
		if !room.ValidName(name) {
			http.Error(w, "name must be 1 to 24 characters", http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(struct {
			ID string `json:"id"`
		}{rooms.Create(name)})
	}
}

func connect(rooms *room.Registry) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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
		conn.SetReadLimit(frameMaxBytes)

		client := rooms.Connect(name)
		defer rooms.Disconnect(client)

		go func() {
			defer conn.CloseNow()
			if wsjson.Write(r.Context(), conn, room.Message{Type: "ready", ID: client.ID, Name: client.Name}) != nil {
				return
			}
			for {
				select {
				case message := <-client.Messages():
					if wsjson.Write(r.Context(), conn, message) != nil {
						return
					}
				case <-client.Gone():
					return
				case <-r.Context().Done():
					return
				}
			}
		}()

		for {
			var incoming struct {
				Type string `json:"type"`
				Room string `json:"room"`
				Text string `json:"text"`
			}
			if err := wsjson.Read(r.Context(), conn, &incoming); err != nil {
				return
			}
			switch incoming.Type {
			case "join":
				rooms.Open(client, incoming.Room)
			case "leave":
				client.Leave(incoming.Room)
			case "message":
				rooms.Send(client, incoming.Room, incoming.Text)
			case "typing":
				client.Typing(incoming.Room)
			}
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
		if _, err := fs.Stat(files, name); err != nil || name == "." {
			w.Header().Set("Cache-Control", "no-cache")
			http.ServeFileFS(w, r, files, "index.html")
			return
		}
		server.ServeHTTP(w, r)
	})
}
