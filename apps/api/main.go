package main

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path"
	"strings"
	"syscall"
	"time"

	"github.com/coder/websocket"
	"github.com/coder/websocket/wsjson"

	"github.com/esteban-abanto-2709/ephemeral-chat/apps/api/internal/room"
)

const (
	bodyMaxBytes      = 8 << 10
	frameMaxBytes     = 4 << 20
	textFrameMaxBytes = 64 << 10
)

const (
	uploadSlots       = 16
	uploadTimeout     = 60 * time.Second
	downloadTimeout   = 60 * time.Second
	pingInterval      = 30 * time.Second
	readHeaderTimeout = 10 * time.Second
	idleTimeout       = 2 * time.Minute
	shutdownGrace     = 10 * time.Second
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	server := &http.Server{
		Addr:              ":" + port,
		Handler:           newMux(os.Getenv("STATIC_DIR")),
		ReadHeaderTimeout: readHeaderTimeout,
		IdleTimeout:       idleTimeout,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM, os.Interrupt)
	defer stop()
	stopped := make(chan struct{})
	go func() {
		defer close(stopped)
		<-ctx.Done()
		grace, cancel := context.WithTimeout(context.Background(), shutdownGrace)
		defer cancel()
		server.Shutdown(grace)
	}()

	log.Printf("api listening on :%s", port)
	if err := server.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		log.Fatal(err)
	}
	<-stopped
	log.Print("api stopped")
}

func newMux(staticDir string) *http.ServeMux {
	rooms := room.NewRegistry()

	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})
	mux.HandleFunc("POST /api/rooms", createRoom(rooms))
	mux.HandleFunc("GET /api/ws", connect(rooms, newUploads(uploadSlots, uploadTimeout), pingInterval, downloadTimeout))
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
		json.NewDecoder(http.MaxBytesReader(w, r.Body, bodyMaxBytes)).Decode(&body)
		name := strings.TrimSpace(body.Name)
		if !room.ValidName(name) {
			http.Error(w, "name must be 1 to 24 characters", http.StatusBadRequest)
			return
		}
		id, err := rooms.Create(name)
		if err != nil {
			http.Error(w, "server is full", http.StatusServiceUnavailable)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(struct {
			ID string `json:"id"`
		}{id})
	}
}

type uploads struct {
	slots   chan struct{}
	timeout time.Duration
}

func newUploads(n int, timeout time.Duration) *uploads {
	return &uploads{slots: make(chan struct{}, n), timeout: timeout}
}

func (u *uploads) read(ctx context.Context, conn *websocket.Conn, r io.Reader) ([]byte, error) {
	select {
	case u.slots <- struct{}{}:
	case <-ctx.Done():
		return nil, ctx.Err()
	}
	defer func() { <-u.slots }()
	timer := time.AfterFunc(u.timeout, func() { conn.CloseNow() })
	defer timer.Stop()
	return io.ReadAll(r)
}

func sendFile(ctx context.Context, conn *websocket.Conn, message room.Message, timeout time.Duration) error {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	w, err := conn.Writer(ctx, websocket.MessageBinary)
	if err != nil {
		return err
	}
	if err := writeFrame(w, message, message.File.Data); err != nil {
		return err
	}
	return w.Close()
}

func connect(rooms *room.Registry, uploads *uploads, ping, download time.Duration) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		name := strings.TrimSpace(r.URL.Query().Get("name"))
		if !room.ValidName(name) {
			http.Error(w, "name must be 1 to 24 characters", http.StatusBadRequest)
			return
		}

		client, err := rooms.Connect(name)
		if err != nil {
			http.Error(w, "server is full", http.StatusServiceUnavailable)
			return
		}
		defer rooms.Disconnect(client)

		conn, err := websocket.Accept(w, r, nil)
		if err != nil {
			return
		}
		defer conn.CloseNow()
		conn.SetReadLimit(frameMaxBytes)

		go keepAlive(r.Context(), conn, ping)

		go func() {
			defer conn.CloseNow()
			if wsjson.Write(r.Context(), conn, room.Message{Type: "ready", ID: client.ID, Name: client.Name()}) != nil {
				return
			}
			for {
				select {
				case message := <-client.Messages():
					if message.File != nil && len(message.File.Data) > 0 {
						err := sendFile(r.Context(), conn, message, download)
						client.Done(message)
						if err != nil {
							return
						}
					} else if wsjson.Write(r.Context(), conn, message) != nil {
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
				Type    string `json:"type"`
				Room    string `json:"room"`
				Text    string `json:"text"`
				Name    string `json:"name"`
				Data    []byte `json:"-"`
				Reply   int    `json:"reply"`
				Seconds int    `json:"seconds"`
				Seq     int    `json:"seq"`
			}
			kind, reader, err := conn.Reader(r.Context())
			if err != nil {
				return
			}
			var payload []byte
			if kind == websocket.MessageBinary {
				payload, err = uploads.read(r.Context(), conn, reader)
			} else {
				payload, err = io.ReadAll(io.LimitReader(reader, textFrameMaxBytes+1))
				if len(payload) > textFrameMaxBytes {
					return
				}
			}
			if err != nil {
				return
			}
			if kind == websocket.MessageBinary {
				header, data, ok := decodeFrame(payload)
				if !ok || json.Unmarshal(header, &incoming) != nil || incoming.Type != "file" {
					continue
				}
				incoming.Data = data
			} else if json.Unmarshal(payload, &incoming) != nil || incoming.Type == "file" {
				continue
			}
			switch incoming.Type {
			case "join":
				rooms.Open(client, incoming.Room)
			case "leave":
				client.Leave(incoming.Room)
			case "message":
				rooms.Send(client, incoming.Room, incoming.Text, incoming.Reply)
			case "file":
				rooms.SendFile(client, incoming.Room, incoming.Name, incoming.Data, incoming.Seconds, incoming.Text, incoming.Reply)
			case "typing":
				client.Typing(incoming.Room)
			case "read":
				client.Read(incoming.Room, incoming.Seq)
			case "rename":
				client.Rename(incoming.Name)
			}
		}
	}
}

func keepAlive(ctx context.Context, conn *websocket.Conn, every time.Duration) {
	ticker := time.NewTicker(every)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			pong, cancel := context.WithTimeout(ctx, every)
			err := conn.Ping(pong)
			cancel()
			if err != nil {
				conn.CloseNow()
				return
			}
		case <-ctx.Done():
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
		if _, err := fs.Stat(files, name); err != nil || name == "." {
			w.Header().Set("Cache-Control", "no-cache")
			http.ServeFileFS(w, r, files, "index.html")
			return
		}
		server.ServeHTTP(w, r)
	})
}
