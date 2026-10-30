# Ephemeral Chat — API

Ephemeral Chat's server. Go with the standard library plus one WebSocket
library: no framework, no database. All state lives in memory.

## Stack

| Piece      | Version                                       |
| ---------- | --------------------------------------------- |
| Language   | Go 1.27                                       |
| HTTP       | `net/http` (method + wildcard route patterns) |
| WebSockets | `github.com/coder/websocket`                  |

`go.mod` lists the dependencies and `go.sum` their checksums; both are
committed.

## Getting started

```bash
go run .            # http://localhost:8080/api/health
```

## Environment variables

| Variable | Required | Purpose                          |
| -------- | -------- | -------------------------------- |
| `PORT`       | No       | HTTP port (defaults to `8080`)                 |
| `STATIC_DIR` | No       | Folder with the web build to serve (see below) |

## Commands

```bash
go run .        # compile and run
go build ./...  # compile only
go vet ./...    # static checks
gofmt -l .      # lists unformatted files; must print nothing
```

## Endpoints

Every API route lives under `/api/`, so it never collides with a web route.

| Method | Path          | Response            |
| ------ | ------------- | ------------------- |
| `GET`  | `/api/health` | `ok` (health check) |
| `POST` | `/api/rooms`  | `201` with `{"id": "..."}`: creates a room in memory |
| `GET`  | `/api/rooms/{id}/ws?name=…` | WebSocket: joins the room as `name` (see below) |
| `GET`  | `/api/*`      | `404` for any other |

A room id is 16 random bytes from `crypto/rand`, base64url-encoded: 22
characters, safe in a URL and not guessable. The link is the room's key.

WebSockets only accept connections from their own origin (the library's
default), which holds both in production and behind the `ng serve` proxy.

### Room chat

Joining needs an existing room (`404` otherwise) and a name of 1 to 24
characters once trimmed (`400` otherwise). Then, as JSON text frames:

```
client → server:   {"text": "hola"}
server → clients:  {"name": "Juan", "text": "hola"}
```

Every message goes to everyone connected to the room at that moment, sender
included. Nothing is stored: whoever joins later sees only what comes after.
Blank messages are dropped.

## Code layout

```
main.go            config, routes and HTTP handlers
internal/room/     the domain: rooms in memory, no HTTP inside
```

Business rules live in `internal/room` and know nothing about HTTP or
WebSockets, so they're tested without a server. `main.go` translates requests
into calls to it. The registry is shared by every request (each one runs in
its own goroutine), so its map is guarded by a mutex.

How a room relays messages:

- Each member has a **mailbox**: a buffered channel of 16 messages.
- `Room.Send` drops a copy in every member's mailbox, without waiting. A
  mailbox that is full means a client that can't keep up: that member is
  removed and its mailbox closed, so one slow connection never holds up the
  room.
- Each WebSocket runs two goroutines: the handler **reads** frames and calls
  `Send`; a second one **writes** whatever lands in the mailbox. When the
  mailbox closes (the member left or was too slow), the writer closes the
  socket.

## Serving the web

With `STATIC_DIR` set, every path outside `/api/` is served from that folder,
and a path with no file behind it gets `index.html`, so Angular resolves its
own routes (`/room/abc`). Without it, the server is an API only: that's how it
runs in development, next to `ng serve`. In the Docker image it points to the
Angular build (see [`apps/docker`](../docker/README.md)).

## Tests

```bash
go test ./...   # every package: routing, rooms, room chat and internal/room
```

State is shared between goroutines, so run the race detector after touching
`internal/room` or a handler. It needs cgo, which the Windows setup lacks; the
official Go image has it:

```bash
docker run --rm -v "$(pwd):/src" -w /src golang:1.27 go test -race ./...
```

(From Git Bash on Windows, prefix it with `MSYS_NO_PATHCONV=1` and use
`$(pwd -W)`.)
