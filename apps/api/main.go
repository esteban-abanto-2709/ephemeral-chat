package main

import (
	"io/fs"
	"log"
	"net/http"
	"os"
	"path"
	"strings"

	"github.com/coder/websocket"
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
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Write([]byte("ok"))
	})
	mux.HandleFunc("GET /api/ws", echo)
	mux.HandleFunc("GET /api/", http.NotFound)

	if staticDir != "" {
		mux.Handle("GET /", spa(os.DirFS(staticDir)))
	}
	return mux
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
