# Wishlist

Possible ideas and improvements, no commitment (maybe never). Code `WL-###` (never reused).
If an idea is promoted, it's deleted from here and a new `RM` is born.

**Format:** title + the idea in 1–2 lines, no fields.

---

## [WL-002] Send images
Images relayed through the WebSocket like any message, never stored; needs a size limit. Candidate for v0.5.

## [WL-003] Voice messages
Record in the browser and relay the audio, never stored; needs a duration/size limit. Candidate for v0.5.

## [WL-004] Stickers
Accept `.webp` images, animated included, shown as stickers. WhatsApp's own stickers can't be imported (no API): whoever has the file sends it. Candidate for v0.5.

## [WL-005] End-to-end encryption
The key travels in the link after `#`, which browsers never send to the server; Web Crypto encrypts in the browser and the API only relays ciphertext. Candidate for v0.6.

## [WL-006] Single-use link
A link that only lets one person in, for the room's creator to hand out. Far future.

## [WL-007] Load test with real numbers
Measure concurrent connections against RAM and latency (e.g. with `k6`) and publish the result in the README.

## [WL-008] Identity by id, rename inside the room
Each person in a room gets a fixed id from the server and can change their name anytime; the chat shows "A is now B" and messages follow the id, so two people may share a name and still be told apart. Replaces rejecting duplicate names (RM-006). RM-011 lays the ground: a tab id and ids in room events.

## [WL-010] Liquid glass avatars
Avatars drawn as small glass lenses instead of flat tinted circles. The WebGL layer draws up to 8 lenses and a room holds 50 people, so it needs another approach (one lens for the list, or CSS glass).

## [WL-011] A logo that says "message"
The hourglass says ephemeral but not chat; a mark that reads as a message that fades. Tried on `/design` first.

## [WL-012] Installable app (PWA)
A manifest and icons so the app installs to the home screen and opens full screen, without a service worker. Dropped from v0.3: it pays off once RM-011 keeps several chats in one page, since iOS opens shared links in Safari, not in the installed app.
