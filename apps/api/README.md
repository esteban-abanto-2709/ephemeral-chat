# Ephemeral Chat — API

Ephemeral Chat's server. Go with the standard library plus one WebSocket
library: no framework, no database. All state lives in memory.

## Stack

| Piece      | Version                                       |
| ---------- | --------------------------------------------- |
| Language   | Go 1.27                                       |
| HTTP       | `net/http` (method + wildcard route patterns) |
| WebSockets | `github.com/coder/websocket`                  |
| Rate limit | `golang.org/x/time/rate`                      |

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
| `GET`  | `/api/rooms/{id}` | `204` if the room exists, `404` if not |
| `GET`  | `/api/rooms/{id}/ws?name=…` | WebSocket: joins the room as `name` (see below) |
| `GET`  | `/api/*`      | `404` for any other |

A room id is 16 random bytes from `crypto/rand`, base64url-encoded: 22
characters, safe in a URL and not guessable. The link is the room's key.

WebSockets only accept connections from their own origin (the library's
default), which holds both in production and behind the `ng serve` proxy.

### Room chat

Joining needs an existing room (`404` otherwise) and a name of 1 to 24
characters once trimmed (`400` otherwise). A name already in the room
(ignoring case) is accepted as a WebSocket and closed right away with status
`4009`: a browser can't read the HTTP status of a failed handshake, but it can
read a close code. A room dropped between the lookup and the join (see below)
closes the same way with `4004`, and a room that already has 50 people
(`MaxMembers`) with `4029`. Then, as JSON text frames:

```
client → server:   {"text": "hola"}
                   {"type": "typing"}
server → clients:  {"type": "message", "name": "Juan", "text": "hola"}
                   {"type": "joined",  "name": "Ana",  "members": ["Juan", "Ana"]}
                   {"type": "left",    "name": "Ana",  "members": ["Juan"]}
server → sender:   {"type": "error",   "text": "Slow down: up to 5 messages per second."}
server → others:   {"type": "typing",  "name": "Juan"}
```

Every event goes to everyone connected to the room at that moment, sender and
newcomer included. `joined` and `left` carry the full list of who is in, in
order of arrival, so a client never has to work it out. Nothing is stored:
whoever joins later sees only what comes after. Blank messages and messages
over 1000 characters (`MessageMaxLength`) are dropped; the web never sends
those. Any frame over 8 KiB closes the connection with `1009` before it is
even read, so no client can make the server buffer a huge message.

Each member may send 5 messages per second (`MessagesPerSecond`), with bursts
of up to 5: a token bucket from `golang.org/x/time/rate`, one per member. A
message over the limit is dropped and only its sender gets an `error` event.

`typing` says someone is writing. It goes to everyone except the typist, at
most once every 2 seconds per member (`TypingInterval`, its own token bucket,
so typing never uses up the message limit); extra signals are dropped without
an error. There is no "stopped typing": a client shows it for a few seconds
after the last signal. It is never worth a disconnection: a member whose
mailbox is full just misses it.

### Room lifecycle

A room lives while someone is in it. Once it is empty, including right after
it's created, it has one minute (`emptyLifetime`) before it is dropped from the
registry; anyone joining inside that minute keeps it, so reloading the page
while alone doesn't lose the room. A dropped room is gone for good: its id
answers `404` like any unknown one.

Each room carries a `time.AfterFunc` timer, re-armed when the last member
leaves. When it fires, the registry drops the room only if it's still empty,
and marks it closed so a join racing with the drop is refused.

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
  removed and its mailbox closed (and announced as `left`), so one slow
  connection never holds up the room.
- Each WebSocket runs two goroutines: the handler **reads** frames and calls
  `Send`; a second one **writes** whatever lands in the mailbox. When the
  mailbox closes (the member left or was too slow), the writer closes the
  socket.

## Serving the web

With `STATIC_DIR` set, every path outside `/api/` is served from that folder,
and a path with no file behind it gets `index.html`, so Angular resolves its
own routes (`/room/abc`). `index.html` goes out with `Cache-Control: no-cache`,
so a new deploy's bundles load at once instead of a cached old build. Without
it, the server is an API only: that's how it runs in development, next to
`ng serve`. In the Docker image it points to the Angular build (see [`apps/docker`](../docker/README.md)).

## Tests

```bash
go test ./...   # every package: routing, rooms, room chat and internal/room
```

The lifecycle tests run inside `synctest.Test` (`testing/synctest`): a bubble
with a fake clock, where `time.Sleep(time.Minute)` returns at once and timers
fire in order, so a minute-long rule is tested in milliseconds.

State is shared between goroutines, so run the race detector after touching
`internal/room` or a handler. It needs cgo, which the Windows setup lacks; the
official Go image has it:

```bash
docker run --rm -v "$(pwd):/src" -w /src golang:1.27 go test -race ./...
```

(From Git Bash on Windows, prefix it with `MSYS_NO_PATHCONV=1` and use
`$(pwd -W)`.)
