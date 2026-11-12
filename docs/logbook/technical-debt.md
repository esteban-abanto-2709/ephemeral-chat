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
