# Technical Debt

Shortcuts, pending decisions and future risks in this project.
Code `TD-###` (never reused). Once resolved, the entry moves to the changelog
and is deleted from here.

**Entry format:**
- **Location:** affected `file:line`.
- **Risk:** 1 to 10 (1-3 cosmetic · 4-6 slows down/moderate · 7-9 latent bug or security · 10 critical).
- **Problem:** what's wrong, condensed.
- **Future impact:** what it can cause if left alone.
- **Suggestion:** (optional) how to fix it, in one line. A hint for whoever picks it up, not a spec.
- **Date** and **Status** (Open / In progress).

---

## [TD-006] Too much text in the UI
- **Location:** `apps/web/src/app/i18n/en.json`, `apps/web/src/app/i18n/es.json` and every template in `apps/web/src/app`
- **Risk:** 3/10
- **Problem:** the page says more than people read. Some controls carry a label where a well-known icon is enough (the theme toggle shows "Light"/"Dark" beside the sun and moon, and had to grow for "Oscuro"), and some notes and hints are longer than they need to be. The goal is the least text possible, trusting the user to understand: short words that read at a glance.
- **Future impact:** cluttered controls that change width with each language, and text people skip.
- **Suggestion:** audit every visible string: drop the ones an icon already says (keeping a translated `aria-label`), shorten the rest, and agree on the list with the user on `/design` before changing anything.
- **Date:** 2026-11-09 · **Status:** Open

## [TD-008] Desktop scrollbar runs behind the header and the composer
- **Location:** `apps/web/src/app/room/message-list/message-list.html` (the `scroll-glass` scroller)
- **Risk:** 2/10
- **Problem:** on desktop the messages scroll under the floating chat header and composer, so the scrollbar runs the full height and crosses both. The padding keeps the messages clear, but not the scrollbar track.
- **Future impact:** cosmetic: the scrollbar looks like it belongs to the header and the composer too.
- **Suggestion:** keep the track between the two, e.g. a top and bottom margin on the scrollbar track in `scroll-glass`, without losing the messages sliding under the glass.
- **Date:** 2026-11-10 · **Status:** Open

## [TD-010] Locking the phone ends your chats
- **Location:** `apps/api/main.go` (`keepAlive`) and the browser's handling of a locked screen
- **Risk:** 5/10
- **Problem:** locking a phone (just the power button, same app open) shows the other side "left" shortly after: the mobile browser freezes the page, the WebSocket stops answering pings, and the server disconnects the tab, which ends its private chats.
- **Future impact:** private chats end whenever someone locks their phone, which feels like a bug; with read receipts it reads as "read, then left".
- **Suggestion:** evaluate first; any grace period clashes with "the id lives while the tab is open".
- **Date:** 2026-11-11 · **Status:** Open

## [TD-011] A chat that is still joining looks like a group
- **Location:** `apps/web/src/app/chats/chat-client.ts` (`newChat`, `join`, the `ready` branch of `receive`)
- **Risk:** 4/10
- **Problem:** `join(id)` adds a placeholder chat with `kind: 'group'` before the server says what the id is, so a private link (`/chat/:id`) shows a group avatar, header and intro until `joined` arrives with `private: true`, then flips. On a slow phone the flip is visible. The `ready` branch also re-sends `join` for every `group`, which is how a placeholder made before the socket is ready gets joined: it works only because the placeholder is mislabeled.
- **Future impact:** a visible flicker on every invite link opened on a slow connection; and anyone who "fixes" the placeholder's kind breaks joining before `ready` without a test noticing.
- **Suggestion:** an explicit joining state (e.g. a `joining` flag the views render neutrally, re-sent on `ready` by that flag instead of by `kind`); the route already knows `/chat/` from `/room/` if a hint is wanted.
- **Date:** 2026-11-11 · **Status:** Open

## [TD-020] No limit on the memory files hold while in transit
- **Location:** `apps/api/main.go` (`connect`, the read loop) and `apps/api/internal/room/room.go` (`post`, the mailboxes)
- **Risk:** 7/10
- **Problem:** a file stays in memory from the moment its frame is read until the slowest recipient's socket takes it, and nothing bounds the total: every connection may be reading a 6 MiB frame at once, and a mailbox may hold up to 32 files nobody reads. Measured: 20 connections in pairs, three 5 MiB files each to a peer that never reads, hold about 100 MiB within every existing limit. A ceiling on connections does not cover it.
- **Future impact:** about a hundred connections take the 512 MB instance down using only what the limits allow, even once connections and rooms are capped (TD-012).
- **Suggestion:** a global budget of file bytes in transit (count each file once, release it when the last mailbox lets go) that refuses new files with an error code while it is full, and a small pool of slots for reading binary frames.
- **Date:** 2026-11-11 · **Status:** Open

## [TD-015] A private chat can start with a tab that already left
- **Location:** `apps/api/internal/room/registry.go` (`reach`, `peer`, `Disconnect`)
- **Risk:** 5/10
- **Problem:** `peer` finds the other tab under one lock and `startPrivate` runs under a later one, so a `Disconnect` in between deletes the tab and takes its list of chats before the new chat is added to it. Nobody ever leaves that chat for the tab. A stress test hit it 54 times in 50,000.
- **Future impact:** the sender sees the other person online and messages with one check forever, until the dead mailbox fills at 33 messages and the chat ends; meanwhile the room keeps the closed tab and up to 32 messages (files included) in memory.
- **Suggestion:** look the other tab up again inside the lock that calls `startPrivate`, so `Disconnect` runs either before (the message fails with `gone`) or after (`LeaveAll` sees the chat).
- **Date:** 2026-11-11 · **Status:** Open

## [TD-016] A reopened private chat keeps its old read mark and numbers
- **Location:** `apps/web/src/app/chats/chat-client.ts` (the private `joined` branch of `receive`, `markRead`, `quote`)
- **Risk:** 5/10
- **Problem:** when someone writes again after a private chat ended, the server starts a new chat counting `seq` from 1, but the tab reuses the old one: `read`, `readSent` and the old events stay. New own messages up to the old `read` show two checks before being read, `markRead` sends nothing (or a `seq` the server drops) until the new numbers pass the old ones, and a reply can quote an old message with the same `seq`.
- **Future impact:** read receipts that lie, the one thing v0.8 added, and quotes of the wrong message.
- **Suggestion:** on a private `joined` for a chat that had ended, reset `read` and `readSent` and stop matching old events by `seq` (e.g. clear their `seq`).
- **Date:** 2026-11-11 · **Status:** Open

## [TD-017] Sending more than three files at once loses the rest
- **Location:** `apps/web/src/app/chats/chat-client.ts` (`sendFiles`, `sendFile`, `sentFiles`)
- **Risk:** 5/10
- **Problem:** the send preview takes any number of files and `sendFiles` sends them back to back, but the API allows three and then one every 2 seconds (`FileBurst`, `FileInterval`): the fourth on gets `slow-files` and is never sent again. Each refused file also stays in `sentFiles`, waiting for a receipt that never comes, until the chat is deleted; so does one sent while the socket was closed.
- **Future impact:** picking five photos sends three and a warning; the lost ones stay in the tab's memory.
- **Suggestion:** pace the queue in the client to the API's rhythm (or cap the preview at what the burst allows) and drop a file from `sentFiles` when its send is refused.
- **Date:** 2026-11-11 · **Status:** Open

## [TD-018] A chat removed by an error keeps its files in memory
- **Location:** `apps/web/src/app/chats/chat-client.ts` (the `error` branch of `receive`)
- **Risk:** 3/10
- **Problem:** when the server refuses a chat (`gone` after reconnecting to a group that was dropped, for example) the chat is filtered out of the list without `release`, so its `blob:` URLs are never revoked, and its `sentFiles`, `readSent` and picked files stay. `remove` does all of that; this path does none.
- **Future impact:** photos and files of a chat that no longer shows stay in the tab's memory until it reloads.
- **Suggestion:** one private method that drops a chat and cleans up after it, used by both `remove` and the error branch.
- **Date:** 2026-11-11 · **Status:** Open

## [TD-019] Folders of the web build list their files
- **Location:** `apps/api/main.go` (`spa`)
- **Risk:** 2/10
- **Problem:** `spa` sends to `index.html` only what has no file behind it; a folder exists, so `http.FileServerFS` answers `GET /backdrops/` with a listing of its files.
- **Future impact:** cosmetic: the files are public anyway, but a listing looks unfinished and shows whatever is ever added to the build.
- **Suggestion:** treat a directory like a missing file and serve `index.html`.
- **Date:** 2026-11-11 · **Status:** Open
