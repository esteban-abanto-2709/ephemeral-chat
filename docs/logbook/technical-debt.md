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

## [TD-003] index.html is served without a cache policy
- **Location:** `apps/api/main.go:134`
- **Risk:** 6/10
- **Problem:** `spa` serves `index.html` with only `Last-Modified` and no `Cache-Control`, so browsers cache it heuristically and keep loading the previous build's bundles after a new image (seen on `/design`, whose iframes kept the old build through Ctrl+R).
- **Future impact:** after a deploy to Render, returning visitors can run a stale app against a newer API, or hit bundles that no longer exist.
- **Suggestion:** send `Cache-Control: no-cache` for `index.html` and long-lived `immutable` caching for the hashed assets.
- **Date:** 2026-11-04 · **Status:** Open
