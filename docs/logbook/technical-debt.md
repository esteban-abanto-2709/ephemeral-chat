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

## [TD-006] Too much text in the UI
- **Location:** `apps/web/src/app/i18n/en.json`, `apps/web/src/app/i18n/es.json` and every template in `apps/web/src/app`
- **Risk:** 3/10
- **Problem:** the page says more than people read. Some controls carry a label where a well-known icon is enough (the theme toggle shows "Light"/"Dark" beside the sun and moon, and had to grow for "Oscuro"), and some notes and hints are longer than they need to be. The goal is the least text possible, trusting the user to understand: short words that read at a glance.
- **Future impact:** cluttered controls that change width with each language, and text people skip.
- **Suggestion:** audit every visible string: drop the ones an icon already says (keeping a translated `aria-label`), shorten the rest, and agree on the list with the user on `/design` before changing anything.
- **Date:** 2026-11-09 · **Status:** Open

## [TD-007] Placeholders that invent an example
- **Location:** `apps/web/src/app/room/name-dialog/name-dialog.html` and every `placeholder` in `apps/web/src/app`
- **Risk:** 2/10
- **Problem:** some fields show a made-up value as their placeholder ("Ana" for your name, "Weekend trip" for a group), which reads like a prefilled answer and feels unnatural. Placeholders that tell you what to do ("Write a message") are fine.
- **Future impact:** fields that look already filled in, and odd examples to keep translating.
- **Suggestion:** review every placeholder and propose to the user which to drop or turn into an instruction; the name dialog may go away with generated names, so check that first.
- **Date:** 2026-11-09 · **Status:** Open

## [TD-008] Desktop scrollbar runs behind the header and the composer
- **Location:** `apps/web/src/app/room/message-list/message-list.html` (the `scroll-glass` scroller)
- **Risk:** 2/10
- **Problem:** on desktop the messages scroll under the floating chat header and composer, so the scrollbar runs the full height and crosses both. The padding keeps the messages clear, but not the scrollbar track.
- **Future impact:** cosmetic: the scrollbar looks like it belongs to the header and the composer too.
- **Suggestion:** keep the track between the two, e.g. a top and bottom margin on the scrollbar track in `scroll-glass`, without losing the messages sliding under the glass.
- **Date:** 2026-11-10 · **Status:** Open
