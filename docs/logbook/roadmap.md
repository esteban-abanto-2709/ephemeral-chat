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

## [RM-009] Glass redesign (v0.2)
- **Goal:** a polished, striking interface: WhatsApp Web layout, liquid glass over an abstract background, light and dark themes.
- **Scope:** design base and `/demo`; liquid glass with WebGL and a frosted fallback; room layout and home; message bubbles; states and polish. Several chats at once is out (WL-009).
- **Done when:** home and room use the new design on desktop and mobile (Safari included), WCAG AA holds in both themes, and `/demo` is gone.
- **Date:** 2026-11-03 · **Status:** In progress (2026-11-03)

Each entry is one commit, or a few when it spans both apps; no commit breaks production.
