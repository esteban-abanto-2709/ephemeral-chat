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

## [RM-006] Presence: who joined, who left, who is here
- **Goal:** the room announces "X joined" and "X left" and shows the list of people connected.
- **Open questions:** two people with the same name in one room: allow it, reject it, or tell them apart (e.g. "Juan (2)")? Once the server knows the names it can enforce any of them.
- **Done when:** opening and closing a tab updates the list and the notices in every other browser in the room.
- **Date:** 2026-10-29 · **Status:** Open

## [RM-007] Room lifecycle
- **Goal:** a room disappears once it has been empty for one minute; a link to a room that no longer exists says so.
- **Scope:** the grace period is one value in the API, easy to change.
- **Done when:** a room left empty for over a minute is gone (its link shows "room not found"), and reloading while alone inside the minute keeps it.
- **Date:** 2026-10-29 · **Status:** Open

## [RM-008] Limits against abuse
- **Goal:** the API protects itself: messages up to 1000 characters, 5 messages per second per person, 50 people per room.
- **Scope:** enforced in the API (the source of truth), reflected in the web (character counter, a clear message when a room is full or you're sending too fast). Each value lives in one place.
- **Done when:** exceeding any limit is rejected by the API with a clear message in the web, and normal use is never affected.
- **Date:** 2026-10-29 · **Status:** Open
