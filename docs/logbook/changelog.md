# Changelog

Permanent record of all finished work. Indexed by task code
(`TD-`, `RM-`, `WL-`). Reverse order: newest on top.

**Entry format:**

```
## [CODE] Title (YYYY-MM-DD HH:MM)
Summary in ≤2 lines of what was done.
```

---

## [TD-012] No cap on connections or rooms (2026-11-11 14:45)
The registry refuses a new tab past 2000 connections and a new group past 5000 with `503` (RM-017, step 1). Files in transit are a separate debt, TD-020.

## [RM-016] Files without a copy per recipient (2026-11-11 14:19)
Each tab's writer streams a file's header and shared bytes to its socket instead of building its own frame: a 5 MiB file to 50 slow readers holds about 5 MiB, not 245.

## [TD-014] A file is copied in memory once per recipient (2026-11-11 14:19)
Fixed by RM-016.

## [RM-015] Continuous integration (2026-11-11 14:06)
GitHub Actions checks the API (gofmt, vet, tests with the race detector), the web (format, tests, build) and the Docker image build on every push and pull request to `main`.

## [WL-014] No "You:" in private chat previews (2026-11-11 13:09)
A private chat's preview shows your last message with its sent or read check instead of "You:"; groups keep "You:".

## [WL-015] Read receipts (2026-11-11 12:56)
Your messages in a private chat show one check when sent and two once the other person has read them; the server relays the reader's last seq and stores nothing. Groups are WL-023.

## [WL-011] A logo that says "message" (2026-11-11 11:56)
A chat bubble whose outline dissolves into fading dots replaces the hourglass in the favicon, chat list and welcome card; the green accent becomes the ink, so people's avatars are the only color.

## [TD-007] Placeholders that invent an example (2026-11-11 11:30)
Dropped the name dialog placeholders, which repeated the label or made up "Weekend trip"; instruction placeholders stay.

## [TD-009] Sticker code left after dropping stickers (2026-11-11 11:19)
Removed the `sticker` attachment kind, its message-list branch, quote thumbnail case, translations and design-board samples.

## [RM-013] Generated names you can change (2026-11-10 16:24)
Each tab enters with a random noun-and-adjective nickname in its language and can rename itself from its card, at most once every 10 seconds. Every chat it is in sees "A changed their name to B", and nothing is stored.

## [WL-019] Files in binary frames (2026-11-10 15:26)
Files travel as binary WebSocket frames with a small JSON header of our own, without base64's 33% overhead. The web no longer uses FileReader or atob.

## [WL-022] Spanish and English (2026-11-09 21:29)
The whole page in both languages with Transloco, following the browser with an `ES`/`EN` switch that is remembered; the server sends error codes, never words.

## [WL-013] QR codes for links (2026-11-09 17:25)
My QR opens a private chat with you and each group has its own, shown on demand in a modal; a phone joins by scanning, with no typing.

## [WL-021] Clickable links in messages (2026-11-09 14:46)
Web addresses in messages and photo captions open in a new tab, found with `linkifyjs`; only `http` and `https` become links.

## [RM-012] Media (v0.5) (2026-11-07 09:26)
Photos, files, replies and voice messages up to a minute, relayed and never stored. Stickers (WL-004) and QR codes (WL-013) went back to the wishlist. Completes v0.5.

## [WL-016] Photo viewer in the page (2026-11-06 17:57)
Tapping a photo opens it full screen over the page, with sender, caption and download; X, Escape or a tap outside closes it, instead of a new tab.

## [WL-017] Review before sending a photo or file (2026-11-06 17:50)
Picked, pasted or dropped files open a preview to remove, caption or add more before sending; captions travel with the file and Original quality skips compression.

## [WL-018] Don't send your own file back to you (2026-11-06 10:34)
The sender gets a file receipt without its data, in the chat's order, and shows the copy it already has; one upload, no download.

## [TD-005] Idle connections get dropped (2026-11-06 09:07)
The server pings every tab every 30 seconds, so proxies keep quiet WebSockets open, and drops a tab that stops answering.

## [RM-011] Chats (v0.4) (2026-11-05 19:22)
One page like WhatsApp Web: a name and id per tab over one connection, several chats at once, named groups joined by link or code, private chats by id or invite link that start with the first message. Completes v0.4.

## [TD-004] Web code drifted from Prettier (2026-11-05 19:22)
One `prettier --write` pass over `apps/web/src` and a `pnpm run format` script to keep it clean.

## [RM-010] Comfort (v0.3) (2026-11-05 14:57)
Clear background with glass bubbles, floating header and composer and no green fill; the room stays above the phone keyboard; typing indicator. Completes v0.3.

## [WL-001] Typing indicator (2026-11-05 14:57)
The API relays `typing` to everyone but the typist, once every 2 seconds per member; the header shows who is typing until they send, leave or go quiet.

## [TD-003] index.html is served without a cache policy (2026-11-04 17:25)
The Go server sends `Cache-Control: no-cache` with `index.html`, so browsers revalidate it and pick up a new build's bundles right after a deploy.

## [RM-009] Glass redesign (v0.2) (2026-11-03 13:54)
WhatsApp Web layout with WebGL liquid glass over an abstract background, light and dark themes from tokens, grouped bubbles, invite card, reconnect and loading states; the page never scrolls. Completes v0.2.

## [TD-002] Unreadable when the browser uses a dark color scheme (2026-11-03 10:30)
Light and dark themes with `color-scheme`, an explicit background and theme colors; follows the system until picked by hand, remembered in the browser.

## [RM-008] Limits against abuse (2026-11-03 09:02)
Messages up to 1000 characters (frames over 8 KiB close the socket), 5 messages per second per person (`x/time/rate`, warning to the sender only), 50 people per room (`4029`, "Room is full"). Completes v0.1.

## [RM-007] Room lifecycle (2026-11-02 23:50)
A room is dropped after one minute empty (`time.AfterFunc`, tested with `testing/synctest`); joining within the minute keeps it. `GET /api/rooms/{id}` lets the room page show "Room not found" before asking for a name.

## [RM-006] Presence: who joined, who left, who is here (2026-11-02 23:38)
Server events now carry a `type`; `joined`/`left` notices bring the full member list, shown above the chat. A name already in the room (ignoring case) is rejected with close code `4009` and the name dialog asks again.

## [RM-005] Text messages in a room (2026-10-29 21:50)
The API relays each message to everyone in the room (per-member mailboxes, slow clients disconnected, nothing stored); the room page joins with your name and shows each message with its sender. The echo is gone.

## [TD-001] Socket signals are writable from outside the service (2026-10-29 21:50)
The new `RoomSocket` keeps its signals private and exposes them with `asReadonly()`; the old echo socket that had the problem was removed.

## [RM-004] Name modal on entering a room (2026-10-29 21:40)
Entering a room opens a native `<dialog>` with a Signal Forms form (non-blank, up to 24 characters); the room shows "You are <name>" and nothing else until there is one. The name lives only in memory.

## [RM-003] Create a room and share its link (2026-10-29 21:33)
`POST /api/rooms` creates a room in memory (`internal/room`, 22-character unguessable id); the web gets a router with a home page (**Create room**) and `/room/:id` with a banner to copy the link and the echo chat.

## [RM-002] Real-time connection between web and API (2026-10-29 19:39)
The API echoes WebSocket messages on `/api/ws` (`coder/websocket`, first dependency); the home page connects to its own origin, sends what you type and lists what comes back, with the connection status.

## [RM-001] Deploy to Render (2026-10-29 18:59)
One image from `apps/docker/Dockerfile`: Go serves the API under `/api/` and the Angular build for everything else, as a single free Render Web Service.
Render's free tier can't host a private API, so two services would sleep apart; one container wakes whole and keeps the web on the API's origin.
