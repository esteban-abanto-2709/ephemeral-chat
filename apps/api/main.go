package main

import (
	"encoding/json"
	"errors"
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

		client := room.NewClient(name)
		chats := make(map[string]chat)
		defer func() {
			for _, c := range chats {
				c.room.Leave(c.member)
			}
		}()

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
			c, in := chats[incoming.Room]
			switch {
			case incoming.Type == "join" && !in:
				if c, ok := join(rooms, client, incoming.Room, len(chats)); ok {
					chats[incoming.Room] = c
				}
			case incoming.Type == "leave" && in:
				c.room.Leave(c.member)
				delete(chats, incoming.Room)
			case incoming.Type == "message" && in:
				c.room.Send(c.member, incoming.Text)
			case incoming.Type == "typing" && in:
				c.room.Typing(c.member)
			}
		}
	}
}

type chat struct {
	room   *room.Room
	member *room.Member
}

func join(rooms *room.Registry, client *room.Client, id string, open int) (chat, bool) {
	fail := func(code string) (chat, bool) {
		client.Notify(room.Message{Type: "error", Room: id, Code: code})
		return chat{}, false
	}
	if open >= room.MaxChats {
		return fail("limit")
	}
	r, ok := rooms.Get(id)
	if !ok {
		return fail("gone")
	}
	member, err := r.Join(client)
	if errors.Is(err, room.ErrRoomFull) {
		return fail("full")
	}
	if err != nil {
		return fail("gone")
	}
	return chat{r, member}, true
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
