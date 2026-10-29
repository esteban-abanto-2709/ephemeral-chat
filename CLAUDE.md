# CLAUDE.md

Guidance for Claude Code when working in this repository. Read this first; the
per-app READMEs hold the technical detail.

## What this is

Ephemeral Chat: real-time chat where **nothing is stored**. No database, no
accounts: everything lives in the server's memory and disappears with it.
Ephemerality is a design feature, not a limitation.

It is also a learning project: the owner's main stack is Next.js + NestJS, and
this one is built with **Angular and Go** to learn both properly. Explain the
Angular and Go concepts behind a change when they are new, and prefer the
idiomatic, standard way over clever shortcuts.

## Current state (2026-10)

- Both apps are freshly scaffolded: the Angular CLI default page and a Go
  server with `GET /health`. No chat logic yet; the product scope is still
  being defined.
- Docker images build and run locally. Deployment target is Render (free
  tier), not set up yet.

## Repository layout

| Path | What | Detail |
|---|---|---|
| `apps/web` | Angular 22 SPA (no SSR), Tailwind 4, Vitest | [`apps/web/README.md`](./apps/web/README.md) |
| `apps/api` | Go 1.27 HTTP API, standard library only | [`apps/api/README.md`](./apps/api/README.md) |
| `apps/docker` | `compose.yaml` for both images | [`apps/docker/README.md`](./apps/docker/README.md) |
| `docs/` | Project guides (Angular conventions) | |

The two apps are **independent**: each has its own dependencies and is run
from inside its own folder. No workspace.

## Commands

```bash
# apps/web  (Node 24, pnpm via corepack)
pnpm start                 # ng serve on :4200
pnpm run build
pnpm test --watch=false    # Vitest, single run

# apps/api  (Go 1.27)
go run .                   # API on :8080 (PORT overrides it)
go build ./...
go vet ./...
gofmt -l .                 # must print nothing

# apps/docker
docker compose up -d --build   # web on :3000, api on :4000
docker compose down
```

To verify a change, prefer commands that finish on their own: builds, tests,
`go vet`.

## Conventions

- **All code is English**: identifiers, log messages, test names.
- **Angular:** follow [`docs/angular.md`](./docs/angular.md) for every
  component, service and template.
- **Go:** standard library first (`net/http` routing with method patterns,
  `log`, `encoding/json`); add a dependency only when the standard library has
  no answer (e.g. WebSockets). Code is `gofmt`-formatted. Structure grows with
  the code: a single `main.go` until it asks for `cmd/` and `internal/`.
- **No persistence**, ever: no database, no files, no browser storage for chat
  data. If a feature needs to remember something, it lives in memory.
