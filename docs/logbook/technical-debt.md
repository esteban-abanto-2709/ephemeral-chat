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

## [TD-021] A phone's first screen says nothing about the product
- **Location:** `apps/web/src/app/chats/chats-page.html` (where `chats/chats-welcome` is shown)
- **Risk:** 5/10
- **Problem:** at phone width with no chat open only the list shows, so a first visit gets an empty list: no "Talk, then let it go", no "Nothing is stored", and Invite with link and My QR only as two unlabeled icons beside the name. The welcome exists on desktop only.
- **Future impact:** someone arriving from a shared link on a phone never reads the promise or finds how to invite, which is the main use.
- **Suggestion:** show the welcome's promise and labeled actions in the empty list at phone width; try it on `/design` first.
- **Date:** 2026-11-12 · **Status:** Open

## [TD-022] No way to leave a group or end a private chat
- **Location:** `apps/web/src/app/room/room-chat/room-chat.html` (`deleted` is offered only when `ended()`) and `apps/web/src/app/chats/chat-client.ts` (`remove`)
- **Risk:** 5/10
- **Problem:** `ChatClient.remove` sends `leave`, but the only control wired to it is Delete chat on a private chat the other person already left. A live group or private chat can only be left by closing or reloading the tab, which drops every other chat too.
- **Future impact:** chats pile up toward the 20 per tab limit, and the product's own rule ("when everyone leaves, nothing is left") has no button to trigger it.
- **Suggestion:** a Leave action in the chat header for groups and live private chats, with the same confirmation tone as discarding files.
- **Date:** 2026-11-12 · **Status:** Open

## [TD-023] Some texts say what the app does not do
- **Location:** `apps/web/src/app/i18n/en.json`, `apps/web/src/app/i18n/es.json` (`room.private.note`, `room.group.note`, `room.disconnected`)
- **Risk:** 4/10
- **Problem:** the private card says "Messages vanish when one of you leaves" while the bar under it says "Luis left. You can still read this chat."; the group card says messages vanish when everyone leaves, yet each tab keeps its copy until it closes. After a server restart the page says "your network failed or was too slow", and Reconnect then drops every group with its history under "Nothing to open".
- **Future impact:** the product's one promise reads as false at the exact moment someone tests it.
- **Suggestion:** reword once the wording of the promise is decided; no code beyond the two i18n files.
- **Date:** 2026-11-12 · **Status:** Open

## [TD-024] The chat does not stay at the bottom when a photo loads or a reply is open
- **Location:** `apps/web/src/app/room/message-list/message-list.ts` (the `ResizeObserver` in the constructor) and `apps/web/src/app/room/message-list/message-list.html` (the `img` of a photo, the scroller's bottom padding)
- **Risk:** 5/10
- **Problem:** the list follows new messages by observing the scroller's own box, which does not change when its content grows, and a photo has no height until it loads; so a photo that loads after the list scrolled pushes the latest messages below the fold. The bottom padding is also fixed, so with a reply open the bar above the composer covers the last message. Seen on `/design` (`screen=group`): the four messages after the photo sit under the reply bar and the composer.
- **Future impact:** after a photo arrives, the newest messages are hidden until the reader scrolls; while replying, the message being answered may be the one covered.
- **Suggestion:** follow on the content's size (observe the inner content, or scroll on the image's `load`) and let the bottom padding grow with the reply bar.
- **Date:** 2026-11-12 · **Status:** Open
