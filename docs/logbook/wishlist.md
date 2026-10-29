# Wishlist

Possible ideas and improvements, no commitment (maybe never). Code `WL-###` (never reused).
If an idea is promoted, it's deleted from here and a new `RM` is born.

**Format:** title + the idea in 1–2 lines, no fields.

---

## [WL-001] Typing indicator
"X is typing…" in the room. Candidate for v0.2.

## [WL-002] Send images
Images relayed through the WebSocket like any message, never stored; needs a size limit. Candidate for v0.3.

## [WL-003] Voice messages
Record in the browser and relay the audio, never stored; needs a duration/size limit. Candidate for v0.3.

## [WL-004] Stickers
Accept `.webp` images, animated included, shown as stickers. WhatsApp's own stickers can't be imported (no API): whoever has the file sends it. Candidate for v0.3.

## [WL-005] End-to-end encryption
The key travels in the link after `#`, which browsers never send to the server; Web Crypto encrypts in the browser and the API only relays ciphertext. Candidate for v0.4.

## [WL-006] Single-use link
A link that only lets one person in, for the room's creator to hand out. Far future.

## [WL-007] Load test with real numbers
Measure concurrent connections against RAM and latency (e.g. with `k6`) and publish the result in the README.
