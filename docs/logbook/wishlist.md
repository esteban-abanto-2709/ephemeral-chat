# Wishlist

Possible ideas and improvements, no commitment (maybe never). Code `WL-###` (never reused).
If an idea is promoted, it's deleted from here and a new `RM` is born.

**Format:** title + the idea in 1–2 lines, no fields.

---

## [WL-010] Liquid glass avatars
Avatars drawn as small glass lenses instead of flat tinted circles. The WebGL layer draws up to 8 lenses and a room holds 50 people, so it needs another approach (one lens for the list, or CSS glass).

## [WL-012] Installable app (PWA)
A manifest and icons so the app installs to the home screen and opens full screen, without a service worker. Dropped from v0.3: it pays off now that v0.4 keeps several chats in one page, since iOS opens shared links in Safari, not in the installed app.

## [WL-020] Swipe to reply
On a phone, dragging a message sideways starts a reply, as in WhatsApp. Today a tap shows the Reply button beside the bubble.

## [WL-023] Read receipts in groups
Extend WL-015's double check to groups of up to 50: decide what "read" means there (everyone present when it was sent, or "seen by 3 of 5") before building. The server would relay `read` in groups too; the sender's tab knows who was in from `joined`/`left` and counts the readers itself.

## [WL-024] Security headers
A Content-Security-Policy, `X-Content-Type-Options: nosniff` and a rule against being framed, sent by the Go server with the web build. Defense in depth: nothing is known to be exploitable without them.

## [WL-025] Names without invisible characters
Refuse or strip zero-width and control characters in nicknames and group names, so nobody enters with a name that looks blank or imitates another.

## [WL-026] Slow tabs keep chatting
Instead of dropping a tab that falls far behind on files, stop sending it files and keep the text, telling it a file wasn't delivered because of its connection. Kinder than RM-023's drop, but the server must tell slow from fast and the web must show what it missed.
