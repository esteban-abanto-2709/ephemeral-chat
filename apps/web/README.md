# Ephemeral Chat — Web

Ephemeral Chat's interface. An Angular single-page app: it compiles to static
files that any web server can serve. It talks to the [API](../api/README.md).

## Stack

| Piece           | Version                                       |
| --------------- | --------------------------------------------- |
| Runtime         | Node.js 24 (build only)                       |
| Framework       | Angular 22 (standalone, zoneless, no SSR)     |
| UI              | Tailwind CSS 4                                |
| Tests           | Vitest on jsdom                               |
| Package manager | pnpm (pinned in `package.json`, via corepack) |

## Getting started

```bash
corepack enable
pnpm install
pnpm start          # http://localhost:4200
```

`ng serve` proxies `/api` to the API on `http://localhost:8080`
(`proxy.conf.json`, WebSockets included), so the web always calls its own
origin, as it does in production. Run the API with `go run .` in `apps/api`:
the page connects to it on load.

## Pages

| Route       | Page                  | What it does |
| ----------- | --------------------- | ------------ |
| `/`         | `home/home-page`      | **Create room**: asks the API for a room (`POST /api/rooms`) and goes to it |
| `/room/:id` | `room/room-page`      | The room: asks for your name, then a banner to copy its link, and the chat |

Both pages are lazy-loaded. The router binds `:id` straight to the page's
`id` input (`withComponentInputBinding`). Any id shows a room for now; a room
that doesn't exist will say so later in the roadmap.

## Your name

Entering a room opens `room/name-dialog`: a native `<dialog>` (`showModal()`,
`Esc` blocked) with a Signal Forms form (`@angular/forms/signals`) that
requires a non-blank name of up to 24 characters. It emits the name through
an `output()`, and the room page keeps it in a signal: it lives only in memory,
so reloading asks again. The room shows nothing else until there is a name.

## Real-time connection

`src/app/room/room-socket.ts` joins the room once you've picked a name: one
WebSocket to `/api/rooms/<id>/ws?name=<name>` on the page's own host (`ws://`
or `wss://` to match the page). It sends `{"text": …}` and receives
`{"name": …, "text": …}` from everyone in the room, sender included.

Its state is exposed as read-only signals (`status`: `connecting`, `open`,
`closed`; `messages`), written only inside the service.

It is provided by the room page itself (`providers: [RoomSocket]`), not at the
root: each room page gets its own socket, and leaving the page destroys the
service, which closes the connection (`ngOnDestroy`). Tests replace it with
`TestBed.overrideComponent`, since a component-level provider wins over the
test module's.

## Commands

```bash
pnpm start                 # dev server with reload
pnpm run build             # production build to dist/web/browser
pnpm test                  # Vitest in watch mode
pnpm test --watch=false    # single run
```

Tests run on jsdom, which lacks `<dialog>`'s `showModal()` and `close()`;
`src/test-setup.ts` (the test builder's `setupFiles`) fills them in.

## Conventions

Read [`docs/angular.md`](../../docs/angular.md) before writing any component, service or
template.

## Dependency build scripts

pnpm 11 blocks dependency install scripts unless they are listed in
`pnpm-workspace.yaml` (`allowBuilds`). In Docker an unlisted one fails the
install. When a new dependency needs one, decide it there: `true` to run it,
`false` if the package ships prebuilt binaries.

## In production

There is no web server of its own: the build in `dist/web/browser` is served
by the Go API from the single image in [`apps/docker`](../docker/README.md).
