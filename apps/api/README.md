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
go run .            # http://localhost:8080
```

## Environment variables

| Variable | Required | Purpose                          |
| -------- | -------- | -------------------------------- |
| `PORT`   | No       | HTTP port (defaults to `8080`)   |

## Commands

```bash
go run .        # compile and run
go build ./...  # compile only
go vet ./...    # static checks
gofmt -l .      # lists unformatted files; must print nothing
```

## Endpoints

| Method | Path      | Response            |
| ------ | --------- | ------------------- |
| `GET`  | `/health` | `ok` (health check) |

## Docker

Two stages: `golang:1.27-alpine` compiles a static binary
(`CGO_ENABLED=0`, `-ldflags="-s -w"`), and `alpine` runs only that binary as a
non-root user, on port `4000`. Alpine instead of `scratch` so the healthcheck
has `wget`.
