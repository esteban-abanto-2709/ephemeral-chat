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

## [TD-001] Socket signals are writable from outside the service
- **Location:** `apps/web/src/app/echo-socket.ts:7`
- **Risk:** 2/10
- **Problem:** `status` and `messages` are exposed as writable signals; `readonly` only stops replacing them, so any component can still call `.set()` or `.update()` on them.
- **Future impact:** a component could change the connection state or the message list by mistake, and the bug would look like it came from the socket.
- **Suggestion:** keep private writable signals (`_status`) and expose `_status.asReadonly()`.
- **Date:** 2026-10-29 · **Status:** Open
