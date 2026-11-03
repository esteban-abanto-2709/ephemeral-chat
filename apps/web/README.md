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
| `/room/:id` | `room/room-page`      | The room: checks it exists ("Room not found" otherwise), asks for your name, then the room: a side panel (`room/room-panel`: link to copy, who is in, theme) and the chat; on phones the panel replaces the chat |

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
or `wss://` to match the page). It sends `{"text": …}` and receives the room's
events: messages from everyone (sender included) and who joined or left (see
the [API](../api/README.md#room-chat)).

Its state is exposed as read-only signals, written only inside the service:
`status` (`connecting`, `open`, `closed`), `events` (messages, notices and
warnings such as sending too fast, in order), `members` (who is in the room, taken from the latest notice), and
`nameTaken` / `roomGone` / `roomFull` (the API closed with `4009`, `4004` or
`4029`: the room page reopens the name dialog, or shows "Room not found" or
"Room is full").

The message input stops at 1000 characters (`maxlength`, the API's limit) and
shows a counter from 900 on.

Before asking for a name, the room page looks the room up with `httpResource`
(`GET /api/rooms/<id>`): a signal-based request that follows the `id` input
and exposes `status()` and `error()` to the template.

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

## Look and feel

Light and dark themes are CSS variables in `src/styles.css` (`data-theme` on
`<html>`, Tailwind's `dark:` variant follows it). An inline script in
`index.html` sets the theme before Angular boots, so there is no flash: the
system's choice until you pick one with the theme toggle, which is remembered
in the browser (a preference, never chat data). Panels use the `glass`
utility over a fixed abstract background; with reduced transparency they turn
solid.

Liquid glass: elements with the `appGlass` directive (`src/app/glass`) are
lenses for `LiquidGlass`, one WebGL canvas behind the page that draws the
background and, under each lens (up to 8), bends it at the edges, blurs it and
lights the rim. It samples the background image itself, never the page, so it
works the same on Safari. It redraws only while something moves. Without
WebGL, with reduced transparency or if the context is lost, lenses stay
frosted CSS glass (`backdrop-filter`). `/demo` shows the redesign with sample data while it is built.

Icons come from `@lucide/angular`, the font is Inter (`@fontsource-variable/inter`).
Backgrounds in `public/backdrops`, free under the Unsplash License:
[dark](https://unsplash.com/photos/qmUKOInkOL8) by Andrew Kliatskyi,
[light](https://unsplash.com/photos/yKVBAM-gKJo) by Pawel Czerwinski.

## In production

There is no web server of its own: the build in `dist/web/browser` is served
by the Go API from the single image in [`apps/docker`](../docker/README.md).
