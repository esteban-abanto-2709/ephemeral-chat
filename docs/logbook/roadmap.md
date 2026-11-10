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

## [RM-013] Generated names you can change
- **Goal:** drop the name step. Each tab starts with a random nickname, like an anonymous forum or a masked ball where everyone plays a part ("Lobo Plateado", "Calavera Solitaria" in spirit), and you can change it anytime. It saves two steps when the chat only moves a file from your phone to a borrowed computer, and keeps the mystery of not knowing who is who.
- **Scope:**
  - The browser generates the name in the page's language and it travels as plain text: everyone sees it as its owner got it. No translation per viewer, nothing new on the server for generating.
  - A name is a noun and an adjective, nothing else: no connectors ("Lobo Plateado", never "Lobo de Plata").
  - Two lists per language (nouns, adjectives) in the i18n files. Nouns are not only animals and adjectives not only colors; every pair must sound epic, mysterious or intriguing.
  - Spanish: noun then adjective, everything masculine. The app never asks your gender: that would hand over something about you. Since the lists combine freely, Spanish nouns are masculine so any adjective agrees ("Calavera" needs "Solitaria", so it stays out).
  - English: its own lists, not a translation of the Spanish ones, adjective then noun ("Silver Wolf").
  - Tapping your name renames you while the tab is open; the API relays it and the chat shows "A is now B". Messages and members already follow the id. The name is not stored: a new tab gets a new name.
- **Out of scope:** asking for gender or any profile; translating someone else's name.
- **Done when:** a new tab enters the app with a generated name and no dialog, can rename itself from the page, and everyone in its chats sees the change.
- **Date:** 2026-11-10 · **Status:** In progress (2026-11-10)
