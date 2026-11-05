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

## [RM-011] Chats (v0.4)
- **Goal:** one page like WhatsApp Web: pick a name once, get an id for the tab, and keep several chats open at once, groups and private chats.
- **Scope:** the home becomes the chat list; a name gate locks it until you pick a name, then the tab connects and gets a random id that lives while the tab is open (never stored). Groups get a name when created, fixed for their whole life, and are joined by link or by pasting their code; private chats open by pasting someone's id, land straight in both lists without asking, hold two people, show no joins, and turn read-only when the other one leaves, with "Delete chat" to drop them from the list. Escape or picking another chat only closes the open chat. Events carry the member id beside the name, so renaming (WL-008) can come later; renaming itself is out.
- **Plan:** 1) design on `/design` · 2) API: the tab connection with its id, ids in room events · 3) web: chat list with several rooms, unread marks, join by code or link · 4) private chats by id · 5) release v0.4.
- **Done when:** one tab holds several groups and private chats, a shared link still joins at first click, and nothing is stored.
- **Date:** 2026-11-05 · **Status:** In progress (2026-11-05)
