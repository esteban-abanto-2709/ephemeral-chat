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
| `/room/:id` | `room/room-page`      | The room: checks it exists ("Room not found" otherwise), asks for your name, then `room/room-chat`: a side panel (`room/room-panel`: who is in, theme) and the chat, with its header and composer floating over the messages; it opens with a card holding the link to share, and every `room/copy-link` button shows a "Link copied" notice; on phones the panel replaces the chat |

| `/design`   | `design/design-board` | Development only: the design board (see [Design board](#design-board)) |

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
warnings such as sending too fast, in order, each stamped with its arrival
time `at`: the server sends none), `members` (who is in the room, taken from the latest notice), and
`nameTaken` / `roomGone` / `roomFull` (the API closed with `4009`, `4004` or
`4029`: the room page reopens the name dialog, or shows "Room not found" or
"Room is full").

`room/message-list` draws them as bubbles (yours on the right, a run of
messages from one person grouped under one name) and follows new ones unless
you scrolled up to read; sending always brings you back down.

When the connection drops the room shows a Reconnect button: it looks the
room up again (the API answers a join to a missing room with a plain 404, not
`4004`) and joins with the same name, or shows "Room not found". "Room not
found" and "Room is full" share `room/room-notice`.

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

Each glass piece names its style: `appGlass="header"`, `appGlass="bubble"`
(plain `appGlass` is `panel`). The styles live in `glass/glass-styles.ts`, one
per piece, either `liquid` (tint, blur, refraction, edge thickness, edge light,
border) or `frosted` (fill, blur, saturation, border); tint, fill and border
have a value per theme. To restyle a piece, change its entry there.

Liquid glass: `liquid` pieces are lenses for `LiquidGlass`, one WebGL canvas
behind the page that draws the background and, under each lens (up to 8),
bends it at the edges, blurs it and lights the rim, each with its own values.
`frosted` pieces are plain CSS glass (`backdrop-filter`), so there can be any
number of them. It samples the background image itself, never the page, so it
works the same on Safari. It redraws only while something moves. Without
WebGL, with reduced transparency or if the context is lost, lenses stay
frosted CSS glass (`backdrop-filter`).

Icons come from `@lucide/angular`, the font is Inter (`@fontsource-variable/inter`).
Backgrounds in `public/backdrops`, free under the Unsplash License:
[dark](https://unsplash.com/photos/qmUKOInkOL8) by Andrew Kliatskyi,
[light](https://unsplash.com/photos/yKVBAM-gKJo) by Pawel Czerwinski.

## Design board

`/design` shows the app with sample data, no logic, in four frames at once:
desktop (1280 × 800, scaled to fit) and mobile (390 × 844), each in light and
dark, with a switch for the screen (home, room). Each frame is an `iframe` of
`/design/frame?screen=…&theme=…`, so it has its own theme, its own liquid glass
and a real viewport width. Visual changes are tried here first and moved into
the app once approved; screens reuse the app's components (the room is
`room/room-chat` fed with sample events), so the board never drifts from the app.

It exists only in development: the `DESIGN` build constant (`define` in
`angular.json`) is `true` in the development configuration and `false`
otherwise, and the route is dropped from the bundle when it is `false`. The
local Docker image turns it on with the `DESIGN` build argument
(`compose.override.yaml`); Render builds without it.

## In production

There is no web server of its own: the build in `dist/web/browser` is served
by the Go API from the single image in [`apps/docker`](../docker/README.md).
