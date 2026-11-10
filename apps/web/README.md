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
| `/`         | `chats/chats-page`    | The app, as in WhatsApp Web: opens right away, the chat list beside the open chat |
| `/room/:id` | `chats/chats-page`    | The same page, joining that group as soon as it opens: a shared link works at first click |
| `/chat/:id` | `chats/chats-page`    | An invite: the same page, opening a private chat with that person right away |
| `/design`   | `design/design-board` | Development only: the design board (see [Design board](#design-board)) |

Pages are lazy-loaded. The router binds `:id` straight to the page's `id`
input (`withComponentInputBinding`). A link is only a way in: once you pick a
name and the chat opens, the address goes back to `/` (`Location.replaceState`,
no navigation), so reloading starts clean and copying the address never
shares someone's id. Moving between chats never changes the URL.

The page is built from:

- `chats/chat-list`: the side panel. Its field joins with whatever you paste
  and Enter: a group code, someone's id, or a group or invite link holding
  one; anything else says "That's not a code, link or ID." Filters show all
  chats, the unread ones, groups or private chats. Chats are sorted by their
  last event, with the time and an unread count in a column the preview never
  crosses; a private chat's preview leaves out the name.
- `room/room-chat`: the open chat, with its header (group name, who is in or
  who is typing, copy link) and composer floating over the messages. On phones
  the list and the chat take turns, with a back arrow; `Esc` closes the chat.
  The cursor lands in the composer when a chat opens on desktop, and after
  joining with a code or link anywhere; on phones, picking a chat from the
  list leaves the keyboard closed.
- `chats/chats-welcome`: what the right side shows with no chat open: New
  group, Invite with link (copies `/chat/<your id>`) and Copy my ID.
- `room/name-dialog`: a native `<dialog>` (`showModal()`) with a Signal Forms
  form (`@angular/forms/signals`) for a non-blank name of up to 24 characters.
  It renames yourself (`kind="name"`, prefilled, dismissable) and, with
  `kind="group"`, names a new group.
- `notice.ts`: one short message at the top ("Link copied", "That group
  doesn't exist anymore."), shown by `room/copy-link` buttons and the client.

## Your name

Each tab enters with a generated name: `chats/random-name.ts` picks a noun and
an adjective from the word lists under `names` in the i18n files, in the page's
language. Tapping your card at the bottom of the list opens `room/name-dialog`
to rename yourself (`ChatClient.rename`), at most once every 10 seconds. It
lives only in memory, for every chat in the tab, so reloading gives a new one.
A group's name is picked when it is created and never changes.

## Languages

The page speaks English and Spanish with [Transloco](https://jsverse.gitbook.io/transloco)
(`@jsverse/transloco`). Every word lives in `i18n/en.json` and `i18n/es.json`,
bundled with the app and loaded before it starts, so a key never shows; a test
checks both files have the same keys. Templates use the `transloco` pipe, and
code that builds text (previews, who is typing, notices) asks the `I18n`
service, whose `t()` reads the language as a signal, so everything on screen
changes at once, without reloading.

The language follows the browser (the first of its languages we speak,
English otherwise) until you pick one with the `ES`/`EN` button next to the
theme toggle, which is remembered in the browser (a preference, never chat
data). `<html lang>` follows it. What people write is never translated, and
the server sends no words: its errors are codes that the page writes in your
language.

## Real-time connection

`chats/chat-client.ts` opens the tab's connection as soon as the page loads,
with its generated name: one WebSocket to `/api/ws?name=<name>` on the page's own host (`ws://` or
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

To reply, hover a message (tap it on a phone) and press Reply: the quote sits
above the composer, with an X to drop it, and the message goes out with the
original's `seq`. `ChatClient` turns a received `reply` into a quote from its
own copy of that message (`quoteOf`), or "Earlier message" when the tab never
saw it. Tapping a quote in a bubble scrolls back to the original.

Two QR codes open `room/qr-dialog` (drawn by `uqr`, on a light plate in both
themes so phones can read it), and close only when you do: the X, Escape or a
click outside. **My QR**, on the welcome side and next to your name in the
list, holds your invite link. Whoever scans it gets a private chat with you,
each their own. The one in a group's header holds the group's link.

Web addresses in messages and captions are links (`room/linked-text`, found by
`linkifyjs`) that open in a new tab. Only `http` and `https` become links, and
a bare domain opens over `https`.

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

Photos and files go through the clip, a paste into the input or a drop on the
chat (a "Drop to send" overlay shows while dragging). Nothing leaves yet: they
wait in `ChatClient.picked`, tied to that chat, and `room/send-preview` covers
the chat to review them, as in WhatsApp: a large preview, a caption for each,
thumbnails to remove one, Add more, and an X or `Esc` that asks before
discarding. Send hands what is left to `ChatClient.sendFiles()`, one `file`
frame in base64 each, with its caption as `text`.
JPEG, PNG and WebP photos are first redrawn on an `OffscreenCanvas`
(`chats/compress-photo.ts`): 1600 px on the long side, JPEG at quality 0.8,
which takes a 5 MB phone photo to a few hundred KB and drops its metadata,
location included. Original quality skips this step. GIFs, other files and
anything the browser can't redraw go as they are. Whatever is still over 5 MB isn't sent ("Files up to 5 MB.").
Your own files come back from the server without their bytes, so the tab keeps
what it sent and shows it when that receipt arrives, matched by name and size.
Received files become `blob:` URLs, released when the chat is deleted: photos
keep their image type to show inline, everything else is a plain download.
Tapping a photo opens `room/photo-viewer` over the whole page, a native
`<dialog>` with who sent it, its caption and a download button; X, `Esc` or a
tap beside the photo closes it and leaves the chat open.

With the input empty, the mic records a voice message
(`room/room-chat/voice-recorder.ts`, the browser's `MediaRecorder`, mono
speech at 32 kbps, so a minute is about 240 KB). The browser asks for the
microphone the first time; a refusal says how to allow it. The bar counts up
to 1:00 and sends by itself there; the trash discards it, and changing chats
or leaving drops a recording in progress. `ChatClient.sendVoice()` sends it as
a `file` frame with its `seconds` (and the reply, if one is open).
`room/voice-note` plays it in the bubble with a progress bar; starting one
pauses any other. Chrome and Firefox record WebM/Opus and Safari MP4/AAC.

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
pnpm run format            # Prettier over src (.prettierrc); keep it clean
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
dark, with a switch for the language and one for the screen (start, chats,
group, media, photos, qr, left); photos has its own switch for the chat, the
send preview with a wide or a tall photo, and the photo viewer. Each
frame is an `iframe` of `/design/frame?screen=…&theme=…&lang=…`, so it has its own
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
