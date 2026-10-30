# CLAUDE.md

Guidance for Claude Code when working in this repository. Read this first; the
per-app READMEs hold the technical detail.

## What this is

Ephemeral Chat: real-time chat where **nothing is stored**. No database, no
accounts: everything lives in the server's memory and disappears with it.
Ephemerality is a design feature, not a limitation.

**Product certainties (judge every change against them):**

1. **No accounts, no database.** A name per room, nothing else.
2. **The server never stores messages**: it relays them to whoever is
   connected. Late joiners see nothing from before.
3. **The link is the key**: anyone with it gets in.
4. **Private by nature**: no global or public rooms.

The full reasoning, limits, versions and what was decided against are in
`docs/product-vision.md`.

It is also a learning project: the owner's main stack is Next.js + NestJS, and
this one is built with **Angular and Go** to learn both properly. Explain the
Angular and Go concepts behind a change when they are new, and prefer the
idiomatic, standard way over clever shortcuts.

## Current state (2026-10)

- Both apps are freshly scaffolded: the Angular CLI default page and a Go
  server with `GET /api/health`. No chat logic yet.
- Working toward **v0.1**: `docs/logbook/roadmap.md` is ordered by priority,
  one entry per commit.
- **Deployment:** one free Render Web Service built from
  `apps/docker/Dockerfile`; every push to `main` deploys. **No commit breaks
  production**: each one leaves the image building and the app working.

## Repository layout

| Path | What | Detail |
|---|---|---|
| `apps/web` | Angular 22 SPA (no SSR), Tailwind 4, Vitest | [`apps/web/README.md`](./apps/web/README.md) |
| `apps/api` | Go 1.27 HTTP API, standard library + `coder/websocket` | [`apps/api/README.md`](./apps/api/README.md) |
| `apps/docker` | The single production image (Dockerfile, its ignore file, compose) | [`apps/docker/README.md`](./apps/docker/README.md) |
| `docs/` | Product vision, Angular conventions | |
| `docs/logbook/` | Roadmap, wishlist, technical debt, changelog | |

The two apps are **independent**: each has its own dependencies and is run
from inside its own folder. No workspace. All Docker files live in
`apps/docker`, never at the repository root or inside an app.

## How it fits together

```
production:  browser ──▶ Go (one container) ──┬─ /api/*  → API
                                              └─ else    → Angular build (index.html fallback)
development: browser ──▶ ng serve :4200 ──/api──▶ go run . :8080
```

The browser only ever calls its own origin: no API URL in the web, no CORS.

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
go test ./...
gofmt -l .                 # must print nothing

# apps/docker
docker compose up -d --build   # production image on :3000
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

<!-- logbook:start — written by the logbook skill (init); replaced whole when it runs again -->
## Logbook (`docs/logbook/`)

Logbook language: English

Every project records its work in four git-versioned files under
`docs/logbook/`. `docs/` itself stays for conceptual material (vision,
definition); the operational record lives under `docs/logbook/`.

| File | Prefix | Holds |
|---|---|---|
| `technical-debt.md` | `TD-###` | Something **wrong now** in existing code. |
| `roadmap.md` | `RM-###` | **Committed** work that will be done. |
| `wishlist.md` | `WL-###` | Ideas, **maybe never**. |
| `changelog.md` | — | **Permanent** record of everything finished. |

**Passive rules (always on, no command):**

- **Language:** logbook entries are written in the logbook language above; the
  conversation stays in the user's language. Code, product text and quotes stay
  literal. If the existing files are in another language, keep theirs (never
  mix) and mention that `init` can translate them.
- **Technical debt:** if you notice it while working, record it in
  `technical-debt.md` (never as a code comment). Entry format:

  ```markdown
  ## [TD-001] Short title
  - **Location:** `path/to/file.ext:line`
  - **Risk:** N/10  (1-3 cosmetic · 4-6 slows down/moderate · 7-9 latent bug or security · 10 critical)
  - **Problem:** what's wrong, condensed.
  - **Future impact:** what it can cause if left alone.
  - **Date:** YYYY-MM-DD · **Status:** Open
  ```

- **Task lifecycle:** when **starting** a task (`RM`, `TD` or `WL`) mark it
  `In progress (YYYY-MM-DD)` in its file; when **finishing**, move it to
  `changelog.md` keeping its prefix and delete it from its file. Changelog
  format (reverse order): `## [CODE] Title (YYYY-MM-DD HH:MM)` + summary in ≤2
  lines. **The date/time is the local clock at finish; never query git for
  it.**
- **Codes:** one counter per prefix, starting at `001`; the next one = highest
  code with the **same prefix** +1, looking at its open file + changelog (other
  prefixes don't count). Never reused. Executing a task doesn't change its code: a `WL` is worked
  on directly and goes into the changelog as `WL`. Promoting `WL → RM` is only
  a priority decision the user asks for, never a prior step.
- **Files on demand:** don't create empty files; each one is born the first
  time there is something real to put in it.

**Heavy mechanics → `logbook` skill:** to set up or migrate the system
(`init`), recommend a task (`next`) or audit debt (`audit`), use the skill. It
holds the full formats, special cases (WL→RM promotion, wontfix) and
procedures.
<!-- logbook:end -->
