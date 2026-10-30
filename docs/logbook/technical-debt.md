# Technical Debt

Shortcuts, pending decisions and future risks in this project.
Code `TD-###` (never reused). Once resolved, the entry moves to the changelog
and is deleted from here.

**Entry format:**
- **Location:** affected `file:line`.
- **Risk:** 1 to 10 (1-3 cosmetic · 4-6 slows down/moderate · 7-9 latent bug or security · 10 critical).
- **Problem:** what's wrong, condensed.
- **Future impact:** what it can cause if left alone.
- **Suggestion:** (optional) how to fix it, in one line. A hint for whoever picks it up, not a spec.
- **Date** and **Status** (Open / In progress).

---

## [TD-002] Unreadable when the browser uses a dark color scheme
- **Location:** `apps/web/src/styles.css:1`
- **Risk:** 3/10
- **Problem:** the pages set dark text colors but never a background or a `color-scheme`, so a browser in dark mode paints a dark page under dark text (the room header and banner become unreadable).
- **Future impact:** anyone with a dark system theme sees a broken page on first visit.
- **Suggestion:** settle it with the visual design: declare `color-scheme` and an explicit background, or style both themes.
- **Date:** 2026-10-29 · **Status:** Open
