# Roadmap

Committed work: what will be done. Code `RM-###` (never reused).
Ordered by priority, top first. When a task is finished it moves to the
changelog and is deleted from here.

**Entry format:**
- **Goal:** what we want to achieve.
- **Scope:** (optional) what's in and what's out.
- **Open questions:** (optional) what must be decided when starting.
- **Done when:** clear completion criterion.
- **Date** and **Status** (Open / In progress).

---

Each entry is one commit, or a few when it spans both apps; no commit breaks production.

## [RM-016] Files without a copy per recipient
- **Goal:** a file sent to a group stays in memory once, however many members receive it (TD-014).
- **Scope:** the API's writer only; the protocol and the web don't change. Depends on nothing.
- **Done when:** a test with a group of 50 slow readers and a 5 MiB file holds memory near one copy, not 245 MiB, and TD-014 is closed.
- **Date:** 2026-11-11 · **Status:** Open

## [RM-017] Server ceilings
- **Goal:** no number of connections, rooms or slow requests can exhaust the instance, and a deploy closes sockets cleanly (TD-012, TD-013).
- **Scope:** decided: a global ceiling on connections and rooms that answers `503`; the limit per address is left for later, since it depends on trusting Render's forwarded address. Also `ReadHeaderTimeout` and shutdown on `SIGTERM`. Depends on RM-016, because the ceiling's number comes from the real cost per connection.
- **Open questions:** the two numbers (connections, rooms), picked from the measured cost when starting.
- **Done when:** tests show the ceilings refusing with `503` and a clean close on shutdown, and TD-012 and TD-013 are closed.
- **Date:** 2026-11-11 · **Status:** Open

## [RM-018] Private chats that never lie
- **Goal:** a private chat never starts with a tab that already left (TD-015), and one that is reopened starts clean, with no old read mark or message numbers (TD-016).
- **Scope:** `internal/room` in the API, then `chat-client.ts` in the web. Depends on nothing above.
- **Done when:** a stress test of a first message against a disconnect leaves no chat behind, a web test reopens an ended chat and shows one check on new messages, and TD-015 and TD-016 are closed.
- **Date:** 2026-11-11 · **Status:** Open

## [RM-019] Sending many files
- **Goal:** every file picked is sent, however many, and a chat that goes away leaves nothing in the tab's memory (TD-017, TD-018).
- **Scope:** decided: a queue in the web paced to the API's rhythm (three at once, then one every 2 seconds); the preview keeps taking any number and the API's limits don't change. Depends on nothing above.
- **Done when:** tests send five files and all arrive, a refused chat releases its files, and TD-017 and TD-018 are closed.
- **Date:** 2026-11-11 · **Status:** Open

## [RM-020] Locking the phone keeps your chats
- **Goal:** locking the screen or switching apps for a moment doesn't end your private chats (TD-010).
- **Scope:** depends on RM-018, which touches the same reconnection code.
- **Open questions:** whether a short grace period is allowed, since it bends "the id lives while the tab is open"; how long; what happens to messages sent meanwhile, which the server never stores. Decided when starting.
- **Done when:** a phone locked for less than the agreed time comes back to its chats, the product vision states the rule, and TD-010 is closed.
- **Date:** 2026-11-11 · **Status:** Open

## [RM-021] Load test with real numbers
- **Goal:** measure concurrent connections against RAM and latency (e.g. with `k6`) and publish the result in the README. Promoted from WL-007.
- **Scope:** decided: the test also measures how often a slow member is dropped from a busy group; until then that rule stays as it is, a documented limit. Depends on RM-016 and RM-017, so the published numbers are the corrected ones.
- **Done when:** the README shows connections, memory and latency on the production instance size.
- **Date:** 2026-11-11 · **Status:** Open

## [RM-022] Small fixes from the audit
- **Goal:** folders of the web build stop listing their files (TD-019) and a chat that is still joining stops looking like a group (TD-011).
- **Scope:** two unrelated small fixes, one commit each. Depends on nothing.
- **Done when:** TD-019 and TD-011 are closed.
- **Date:** 2026-11-11 · **Status:** Open

## [RM-014] End-to-end encryption
- **Goal:** the server relays only ciphertext; the key travels in the link after `#`, which browsers never send, and Web Crypto encrypts in the browser.
- **Open questions:** how private chats agree on a key; binary attachments (photos, files, voice); metadata the server still sees (joins, leaves, renames, typing); groups joined by code without `#`.
- **Done when:** messages and attachments in groups and private chats reach the server encrypted and the product vision states what is and isn't protected.
- **Date:** 2026-11-11 · **Status:** Open
