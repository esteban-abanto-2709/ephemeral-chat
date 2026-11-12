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

## [RM-020] Locking the phone keeps your chats
- **Goal:** locking the screen or switching apps for a moment doesn't end your private chats (TD-010).
- **Scope:** depends on RM-018, which touches the same reconnection code.
- **Open questions:** whether a short grace period is allowed, since it bends "the id lives while the tab is open"; how long; what happens to messages sent meanwhile, which the server never stores. Decided when starting.
- **Done when:** a phone locked for less than the agreed time comes back to its chats, the product vision states the rule, and TD-010 is closed.
- **Date:** 2026-11-11 · **Status:** Open

## [RM-021] Load test with real numbers
- **Goal:** measure concurrent connections against RAM and latency (e.g. with `k6`) and publish the result in the README. Promoted from WL-007.
- **Scope:** decided: the test also measures how often a slow member is dropped from a busy group; until then that rule stays as it is, a documented limit. Depends on RM-017 and RM-023, so the published numbers are the corrected ones.
- **Done when:** the README shows connections, memory and latency on the production instance size.
- **Date:** 2026-11-11 · **Status:** Open

## [RM-022] Small fixes from the audit
- **Goal:** folders of the web build stop listing their files (TD-019) and a chat that is still joining stops looking like a group (TD-011).
- **Scope:** two unrelated small fixes, one commit each. Depends on nothing.
- **Done when:** TD-019 and TD-011 are closed.
- **Date:** 2026-11-11 · **Status:** In progress (2026-11-12)

## [RM-014] End-to-end encryption
- **Goal:** the server relays only ciphertext; the key travels in the link after `#`, which browsers never send, and Web Crypto encrypts in the browser.
- **Open questions:** how private chats agree on a key; binary attachments (photos, files, voice); metadata the server still sees (joins, leaves, renames, typing); groups joined by code without `#`.
- **Done when:** messages and attachments in groups and private chats reach the server encrypted and the product vision states what is and isn't protected.
- **Date:** 2026-11-11 · **Status:** Open
