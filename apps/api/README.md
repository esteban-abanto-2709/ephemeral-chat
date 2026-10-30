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
| `GET`  | `/api/ws`     | WebSocket: sends every message back as is (echo) |
| `GET`  | `/api/*`      | `404` for any other |

The WebSocket only accepts connections from its own origin (the library's
default), which holds both in production and behind the `ng serve` proxy.

## Serving the web

With `STATIC_DIR` set, every path outside `/api/` is served from that folder,
and a path with no file behind it gets `index.html`, so Angular resolves its
own routes (`/room/abc`). Without it, the server is an API only: that's how it
runs in development, next to `ng serve`. In the Docker image it points to the
Angular build (see [`apps/docker`](../docker/README.md)).

## Tests

```bash
go test ./...   # routing (API, static files, index.html fallback) and the echo
```
