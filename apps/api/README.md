# Ephemeral Chat — API

Ephemeral Chat's server. Go with the standard library only: no framework, no
database. All state lives in memory.

## Stack

| Piece        | Version                                        |
| ------------ | ---------------------------------------------- |
| Language     | Go 1.27                                        |
| HTTP         | `net/http` (method + wildcard route patterns)  |
| Dependencies | none                                           |

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
| `GET`  | `/api/*`      | `404` for any other |

## Serving the web

With `STATIC_DIR` set, every path outside `/api/` is served from that folder,
and a path with no file behind it gets `index.html`, so Angular resolves its
own routes (`/room/abc`). Without it, the server is an API only: that's how it
runs in development, next to `ng serve`. In the Docker image it points to the
Angular build (see [`apps/docker`](../docker/README.md)).

## Tests

```bash
go test ./...   # routing: API, static files and the index.html fallback
```
