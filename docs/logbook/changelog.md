# Changelog

Permanent record of all finished work. Indexed by task code
(`TD-`, `RM-`, `WL-`). Reverse order: newest on top.

**Entry format:**

```
## [CODE] Title (YYYY-MM-DD HH:MM)
Summary in ≤2 lines of what was done.
```

---

## [RM-001] Deploy to Render (2026-10-29 18:59)
One image from `apps/docker/Dockerfile`: Go serves the API under `/api/` and the Angular build for everything else, as a single free Render Web Service.
Render's free tier can't host a private API, so two services would sleep apart; one container wakes whole and keeps the web on the API's origin.
