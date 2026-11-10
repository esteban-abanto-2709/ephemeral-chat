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

## [TD-006] Text on controls that an icon already says
- **Location:** `apps/web/src/app/theme/theme-toggle/theme-toggle.ts` and any other control across `apps/web/src/app`
- **Risk:** 3/10
- **Problem:** some controls carry a visible label where a well-known icon is enough. The theme toggle shows "Light"/"Dark" beside the sun and moon, and had to grow for "Oscuro" to fit. The user wants the whole app reviewed for more cases like it.
- **Future impact:** cluttered controls that change width with each language; every new language risks another one that doesn't fit.
- **Suggestion:** audit every control, list where the text can go (keeping a translated `aria-label`) and where it must stay, and agree on the list with the user on `/design` before changing anything.
- **Date:** 2026-11-09 · **Status:** Open

## [TD-007] Placeholders that invent an example
- **Location:** `apps/web/src/app/room/name-dialog/name-dialog.html` and every `placeholder` in `apps/web/src/app`
- **Risk:** 2/10
- **Problem:** some fields show a made-up value as their placeholder ("Ana" for your name, "Weekend trip" for a group), which reads like a prefilled answer and feels unnatural. Placeholders that tell you what to do ("Write a message") are fine.
- **Future impact:** fields that look already filled in, and odd examples to keep translating.
- **Suggestion:** review every placeholder and propose to the user which to drop or turn into an instruction; the name dialog may go away with generated names, so check that first.
- **Date:** 2026-11-09 · **Status:** Open
