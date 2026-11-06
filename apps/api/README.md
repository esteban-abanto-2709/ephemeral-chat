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
| `POST` | `/api/rooms`  | Body `{"name": "…"}`: creates a group in memory, `201` with `{"id": "..."}`; `400` without a name of 1 to 24 characters |
| `GET`  | `/api/ws?name=…` | WebSocket: the tab's connection, for every chat it holds (see below) |
| `GET`  | `/api/*`      | `404` for any other |

A room id is 16 random bytes from `crypto/rand`, base64url-encoded: 22
characters, safe in a URL and not guessable. The link is the room's key.

WebSockets only accept connections from their own origin (the library's
default), which holds both in production and behind the `ng serve` proxy.

### Room chat

A browser tab opens one WebSocket, `GET /api/ws?name=…`, and every chat it
holds travels over it. The name must be 1 to 24 characters once trimmed (`400`
otherwise). The first frame gives the tab its id: 16 random bytes, like a room
id, that lives while the connection does and is never stored. Two people may
share a name; the id tells them apart. Then, as JSON text frames:

```
client → server:   {"type": "join",    "room": "…"}
                   {"type": "message", "room": "…", "text": "hola"}
                   {"type": "typing",  "room": "…"}
                   {"type": "file",    "room": "…", "name": "photo.jpg", "data": "<base64>", "text": "optional caption"}
                   {"type": "leave",   "room": "…"}
server → client:   {"type": "ready",   "id": "…", "name": "Juan"}
server → room:     {"type": "message", "room": "…", "id": "…", "name": "Juan", "text": "hola"}
                   {"type": "message", "room": "…", "id": "…", "name": "Juan", "text": "optional caption", "file": {"kind": "image", "name": "photo.jpg", "mime": "image/jpeg", "size": 48213, "data": "<base64>"}}
                   (the sender gets the same file event without "data")
                   {"type": "joined",  "room": "…", "id": "…", "name": "Ana", "title": "Weekend trip", "members": [{"id": "…", "name": "Juan"}, …]}
                   {"type": "left",    "room": "…", "id": "…", "name": "Ana", "members": […]}
server → others:   {"type": "typing",  "room": "…", "id": "…", "name": "Juan"}
server → sender:   {"type": "error",   "room": "…", "text": "Slow down: up to 5 messages per second."}
                   {"type": "error",   "room": "…", "code": "gone" | "full" | "limit" | "self" | "busy"}
```

A join that fails answers only that tab, with a `code`: `gone` for a code
that opens nothing (a room that doesn't exist or was just dropped, see below,
or a tab that closed), `full` for a room that already has 50 people
(`MaxMembers`), `limit` for a tab already in 20 chats (`MaxChats`). Frames for
a chat the tab isn't in are ignored.

While a chat is quiet the server pings the tab every 30 seconds. That keeps
proxies such as a Cloudflare tunnel from closing an idle WebSocket, and a tab
that doesn't answer within the next 30 seconds is disconnected. Browsers
answer pings on their own.

### Private chats

`join` also takes someone's id. That only looks them up: the tab that asked
gets a `joined` with `"private": true`, where `room`, `id`, `name` and
`title` are the other person, and the other tab hears nothing, not even
`typing`. The chat starts with the first `message` to that id: the server
creates it, the other tab gets its own `joined` (with no prompt on their
side) and then the message. If they left in between, the message fails with
`gone`. Each side calls the chat by the other's id, and every event of that
chat comes labeled that way. Nobody else can join it (its own id is never handed out), there are no
`joined` notices for its members, and it ends when either one leaves: the
other gets `left` and is taken out too, so the chat is over for both. Opening
an id you already have a chat with does nothing; your own id answers `self`,
and a tab already in 20 chats answers `busy`.

Every event goes to everyone connected to the room at that moment, sender and
newcomer included. `joined` also carries the group's name (`title`), fixed
when it was created. `joined` and `left` carry the full list of who is in, in
order of arrival, so a client never has to work it out. Nothing is stored:
whoever joins later sees only what comes after. Blank messages and messages
over 1000 characters (`MessageMaxLength`) are dropped; the web never sends
those. Any frame over 7 MiB closes the connection with `1009` before it is
even read, so no client can make the server buffer a huge message.

A `file` frame carries one file in base64, up to 5 MiB once decoded
(`FileMaxBytes`), with a name of 1 to 120 characters and an optional caption in
`text`, held to the same rules as a message; anything else is dropped.
The server decodes it to measure it and sniffs its first bytes
(`http.DetectContentType`): only PNG, JPEG, GIF and WebP become `"kind":
"image"` with their `mime`, which a client may show inline. Everything else is
`"kind": "file"`, to be downloaded and never opened in the page, so an SVG or
HTML file can't run script in the app's origin. A file goes to every member
like a message, as one value shared by every mailbox, so a group of 50 holds
it in memory once. The sender gets it back without `data`: a receipt in the
chat's order, so their tab shows its own copy and never downloads what it just
uploaded. Each member may send 3 files at once and then one every 2
seconds (`FileBurst`, `FileInterval`, a bucket apart from messages); over that
only the sender gets `"Slow down: one file every 2 seconds."` A file also
starts a private chat, like a first message.

Each member may send 5 messages per second (`MessagesPerSecond`), with bursts
of up to 5: a token bucket from `golang.org/x/time/rate`, one per member. A
message over the limit is dropped and only its sender gets an `error` event.

`typing` says someone is writing. It goes to everyone except the typist, at
most once every 2 seconds per member (`TypingInterval`, its own token bucket,
so typing never uses up the message limit); extra signals are dropped without
an error. There is no "stopped typing": a client shows it for a few seconds
after the last signal. It is never worth a disconnection: a tab whose
mailbox is full just misses it.

### Room lifecycle

A room lives while someone is in it. Once it is empty, including right after
it's created, it has one minute (`emptyLifetime`) before it is dropped from the
registry; anyone joining inside that minute keeps it, so reloading the page
while alone doesn't lose the room. A dropped room is gone for good: joining it
fails with `gone` like any unknown id.

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

- Each tab is a `room.Client` with one **mailbox**: a buffered channel of 32
  messages, shared by every room it is in.
- `Room.Send` drops a copy in every member's mailbox, without waiting. A
  mailbox that is full means a tab that can't keep up: it is removed from the
  room (and announced as `left`) and disconnected, so one slow connection
  never holds up a room. The mailbox is never closed, since other rooms may
  still be writing to it; the client's `Gone()` channel is closed instead.
- Each WebSocket runs two goroutines: the handler **reads** frames and hands
  them to the client, which keeps its chats in a map by the name the tab uses
  (a room id, or the other person's id), guarded by its own mutex since a
  private chat is added from the other tab's goroutine; a second one
  **writes** whatever lands in the mailbox, and closes the socket once the
  client is gone. When the socket closes, the registry forgets the tab and it
  leaves every chat.
- Locks are always taken room first, then client, never the other way.

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
