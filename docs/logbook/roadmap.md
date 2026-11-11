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

## [RM-014] End-to-end encryption
- **Goal:** the server relays only ciphertext; the key travels in the link after `#`, which browsers never send, and Web Crypto encrypts in the browser.
- **Open questions:** how private chats agree on a key; binary attachments (photos, files, voice); metadata the server still sees (joins, leaves, renames, typing); groups joined by code without `#`.
- **Done when:** messages and attachments in groups and private chats reach the server encrypted and the product vision states what is and isn't protected.
- **Date:** 2026-11-11 · **Status:** Open
