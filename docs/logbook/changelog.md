# Changelog

Permanent record of all finished work. Indexed by task code
(`TD-`, `RM-`, `WL-`). Reverse order: newest on top.

**Entry format:**

```
## [CODE] Title (YYYY-MM-DD HH:MM)
Summary in ≤2 lines of what was done.
```

---

## [RM-004] Name modal on entering a room (2026-10-29 21:40)
Entering a room opens a native `<dialog>` with a Signal Forms form (non-blank, up to 24 characters); the room shows "You are <name>" and nothing else until there is one. The name lives only in memory.

## [RM-003] Create a room and share its link (2026-10-29 21:33)
`POST /api/rooms` creates a room in memory (`internal/room`, 22-character unguessable id); the web gets a router with a home page (**Create room**) and `/room/:id` with a banner to copy the link and the echo chat.

## [RM-002] Real-time connection between web and API (2026-10-29 19:39)
The API echoes WebSocket messages on `/api/ws` (`coder/websocket`, first dependency); the home page connects to its own origin, sends what you type and lists what comes back, with the connection status.

## [RM-001] Deploy to Render (2026-10-29 18:59)
One image from `apps/docker/Dockerfile`: Go serves the API under `/api/` and the Angular build for everything else, as a single free Render Web Service.
Render's free tier can't host a private API, so two services would sleep apart; one container wakes whole and keeps the web on the API's origin.
