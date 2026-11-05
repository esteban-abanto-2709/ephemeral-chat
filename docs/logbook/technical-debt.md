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

## [TD-004] Web code drifted from Prettier
- **Location:** `apps/web/src` (23 files, e.g. `src/app/theme/theme.ts`)
- **Risk:** 2/10
- **Problem:** `.prettierrc` and `prettier` are in the web, but `prettier --check` fails on 23 files; nothing runs it.
- **Future impact:** formatting churn mixed into feature diffs whenever someone formats a file they touch.
- **Suggestion:** one `prettier --write` pass on its own commit before closing v0.4, then keep it clean.
- **Date:** 2026-11-05 · **Status:** Open
