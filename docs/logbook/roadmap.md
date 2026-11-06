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

## [RM-012] Media (v0.5)
- **Goal:** send images, files, voice messages and stickers, relayed and never stored. The everyday case: scan a QR on your phone and drop a file on a borrowed computer without signing in.
- **Scope:** WL-002 images and files, WL-013 QR codes for links, WL-003 voice messages, WL-004 stickers. Keepalive ping (TD-005) first. Out: read receipts (WL-015).
- **Open questions:** size limit per file (proposed 5 MB on Render's 512 MB); a mailbox bounded by bytes, not only by count.
- **Done when:** the four kinds of media work in groups and private chats, within limits, and v0.5.0 is released.
- **Date:** 2026-11-06 · **Status:** In progress (2026-11-06)
