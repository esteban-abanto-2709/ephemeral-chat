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
| `/`         | `chats/chats-page`    | The app, as in WhatsApp Web: asks your name, then the chat list beside the open chat |
| `/room/:id` | `chats/chats-page`    | The same page, joining that group as soon as you pick a name: a shared link works at first click |
| `/design`   | `design/design-board` | Development only: the design board (see [Design board](#design-board)) |

Pages are lazy-loaded. The router binds `:id` straight to the page's `id`
input (`withComponentInputBinding`). The page never changes the URL, so moving
between chats never reloads it.

The page is built from:

- `chats/chat-list`: the side panel. The search box filters chats by name;
  when it holds a group code, or a link with one, it offers "Join with this
  code" (also on Enter). Filters show all chats, the unread ones or groups.
  Chats are sorted by their last event, with an unread count.
- `room/room-chat`: the open chat, with its header (group name, who is in or
  who is typing, copy link) and composer floating over the messages. On phones
  the list and the chat take turns, with a back arrow; `Esc` closes the chat.
- `chats/chats-welcome`: what the right side shows with no chat open: New
  group and Join with code.
- `room/name-dialog`: a native `<dialog>` (`showModal()`) with a Signal Forms
  form (`@angular/forms/signals`) for a non-blank name of up to 24 characters.
  It asks your name (`Esc` blocked) and, with `cancelable`, a new group's name.
- `notice.ts`: one short message at the top ("Link copied", "That group
  doesn't exist anymore."), shown by `room/copy-link` buttons and the client.

## Your name

The page shows nothing else until you pick a name. It lives only in memory,
for every chat in the tab, so reloading asks again. A group's name is picked
when it is created and never changes.

## Real-time connection

`chats/chat-client.ts` opens the tab's connection once you've picked a name:
one WebSocket to `/api/ws?name=<name>` on the page's own host (`ws://` or
`wss://` to match the page). The server answers with your id, and every chat
travels over that socket (see the [API](../api/README.md#room-chat)). People
are `{id, name}`: your messages are the ones carrying your id, so two people
may share a name.

Its state is exposed as read-only signals, written only inside the service:
`status` (`connecting`, `open`, `closed`), `name`, `me` (your id), `chats` and
`active` (the open chat). Each chat holds its `title`, `events` (messages,
notices and warnings such as sending too fast, in order, each stamped with its
arrival time `at`: the server sends none), `members` (from the latest notice),
who is `typing` and an `unread` count of messages that came in while it wasn't
open.

`join(code)` adds a chat and opens it; it is sent as soon as the connection is
ready. The code may be a group's or someone's id: a person's opens a private
chat (`kind: 'private'`). The other tab learns nothing until your first
message, which lands the chat in their list, unopened.
`create(title)` asks the API for a group (`POST /api/rooms`) and joins it. A
join the server refuses (`gone`, `full`, `limit`, `self`, `busy`) drops the
chat and shows why. A tab holds up to 20 chats, the API's limit.

A private chat shows "Online" in the header and no join notices. When the
other one leaves it is `ended`: the composer gives way to "Luis left. You can
still read this chat." and Delete chat (`remove(id)`), which drops it from
the list. Your name and ID sit at the bottom of the list, with a copy button;
Copy my ID is also on the welcome side.

`room/message-list` draws the events as bubbles (yours on the right, a run of
messages from one person grouped under one name) and follows new ones unless
you scrolled up to read; sending always brings you back down. It opens with a
card holding the group's name and code; a chat can pass its own card as
content instead.

On phones the page fits above the keyboard, as in WhatsApp: Android resizes
the page (`interactive-widget=resizes-content` in the viewport meta) and iOS,
which ignores that, gets the visible height from `visualViewport`
(`room/room-chat/visible-viewport.ts`). The last message stays in view when the
keyboard opens, dragging the messages hides the keyboard, and the send button
keeps it open.

While you write, `ChatClient.sendTyping()` tells the chat at most every 2
seconds; others see "Ana is typing…" in the header (up to "Ana and 2 more are
typing…") until Ana sends, leaves or stays quiet for 3 seconds.

When the connection drops the open chat shows a Reconnect button: it connects
again with the same name and a new id, and rejoins every group in the list.
Private chats were tied to the old id, so they end.

The message input stops at 1000 characters (`maxlength`, the API's limit) and
shows a counter from 900 on.

The client is provided by the page itself (`providers: [ChatClient]`), not at
the root, so leaving the page closes the connection (`ngOnDestroy`). Tests
replace it with `TestBed.overrideComponent`, since a component-level provider
wins over the test module's.

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
dark, with a switch for the screen (start, chats, new group, group, private,
left). Each
frame is an `iframe` of `/design/frame?screen=…&theme=…`, so it has its own
theme, its own liquid glass and a real viewport width. Visual changes are
tried here first and moved into the app once approved; screens are the app's
own components fed with sample chats (`design/design-chats.ts`), so the board
never drifts from the app.

It exists only in development: the `DESIGN` build constant (`define` in
`angular.json`) is `true` in the development configuration and `false`
otherwise, and the route is dropped from the bundle when it is `false`. The
local Docker image turns it on with the `DESIGN` build argument
(`compose.override.yaml`); Render builds without it.

## In production

There is no web server of its own: the build in `dist/web/browser` is served
by the Go API from the single image in [`apps/docker`](../docker/README.md).
