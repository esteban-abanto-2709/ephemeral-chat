# Wishlist

Possible ideas and improvements, no commitment (maybe never). Code `WL-###` (never reused).
If an idea is promoted, it's deleted from here and a new `RM` is born.

**Format:** title + the idea in 1–2 lines, no fields.

---

## [WL-005] End-to-end encryption
The key travels in the link after `#`, which browsers never send to the server; Web Crypto encrypts in the browser and the API only relays ciphertext. Candidate for a later version.

## [WL-007] Load test with real numbers
Measure concurrent connections against RAM and latency (e.g. with `k6`) and publish the result in the README.

## [WL-010] Liquid glass avatars
Avatars drawn as small glass lenses instead of flat tinted circles. The WebGL layer draws up to 8 lenses and a room holds 50 people, so it needs another approach (one lens for the list, or CSS glass).

## [WL-011] A logo that says "message"
The hourglass says ephemeral but not chat; a mark that reads as a message that fades. Tried on `/design` first.

## [WL-012] Installable app (PWA)
A manifest and icons so the app installs to the home screen and opens full screen, without a service worker. Dropped from v0.3: it pays off now that v0.4 keeps several chats in one page, since iOS opens shared links in Safari, not in the installed app.

## [WL-014] No "You:" in private chat previews
A private chat's preview still starts with "You:" when the last message is yours; WhatsApp shows only the text there (with its checks). Drop the prefix in private chats.

## [WL-015] Read receipts
Checks on your messages saying they arrived and were read, as in WhatsApp. Open product question: does "seen" fit an ephemeral chat, or is not knowing part of the point? Decide before building.

## [WL-020] Swipe to reply
On a phone, dragging a message sideways starts a reply, as in WhatsApp. Today a tap shows the Reply button beside the bubble.
