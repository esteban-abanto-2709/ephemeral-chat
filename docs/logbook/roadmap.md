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

Everything below is **v0.1** (see [product vision](../product-vision.md)).
Each entry is one commit, or a few when it spans both apps; no commit breaks production.

## [RM-008] Limits against abuse
- **Goal:** the API protects itself: messages up to 1000 characters, 5 messages per second per person, 50 people per room.
- **Scope:** enforced in the API (the source of truth), reflected in the web (character counter, a clear message when a room is full or you're sending too fast). Each value lives in one place.
- **Done when:** exceeding any limit is rejected by the API with a clear message in the web, and normal use is never affected.
- **Date:** 2026-10-29 · **Status:** In progress (2026-11-03)
