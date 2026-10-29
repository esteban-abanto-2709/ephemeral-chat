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

Everything below is **v0.1** (see [product vision](../product-vision.md)).
Each entry is one commit, and no commit breaks production.

## [RM-001] Deploy to Render
- **Goal:** the current scaffold (Angular default page + Go `/health`) live on Render, so every later commit lands on a real production.
- **Scope:** both Docker images, free tier. In: the setup to deploy on every push to `main`. Out: custom domain.
- **Open questions:** one service or two (Go serving the Angular build vs. a static site + the API; cold starts and the 750 free hours a month weigh in); how the web reaches the API in production; whether to add an external keep-alive ping.
- **Done when:** the public URL serves the web and `/health` answers `ok`, and a push to `main` redeploys.
- **Date:** 2026-10-29 · **Status:** Open

## [RM-002] Real-time connection between web and API
- **Goal:** the browser opens a WebSocket to the API and gets messages back (echo), in development and in production.
- **Scope:** first Go dependency (WebSocket library, `go.sum` appears); dev proxy in `ng serve`; the same path working in the Docker setup and on Render.
- **Open questions:** `coder/websocket` (recommended) or `gorilla/websocket`.
- **Done when:** a message typed in the web comes back from the API, locally and on the production URL.
- **Date:** 2026-10-29 · **Status:** Open

## [RM-003] Create a room and share its link
- **Goal:** from the home page, **Create room** gives a room with its own link, and the room page shows a banner to copy and share it.
- **Scope:** the API creates rooms in memory with an unguessable id; Angular routes for home and room. Out: names and messages.
- **Done when:** clicking **Create room** lands on `/room/<id>`, the banner copies that URL, and opening it in another browser reaches the same room.
- **Date:** 2026-10-29 · **Status:** Open

## [RM-004] Name modal on entering a room
- **Goal:** every time someone enters a room (creator or guest), a modal asks for the name they will appear with.
- **Scope:** the name lives only in memory in the browser; reloading asks again.
- **Done when:** no one can be in a room without having entered a name, and the name is shown as theirs inside the room.
- **Date:** 2026-10-29 · **Status:** Open

## [RM-005] Text messages in a room
- **Goal:** everyone in a room exchanges text messages in real time.
- **Scope:** the server relays to the room's connections and **stores nothing**; whoever joins late sees only what arrives after.
- **Done when:** two browsers in the same room see each other's messages with the sender's name, and a third that joins later sees only new ones.
- **Date:** 2026-10-29 · **Status:** Open

## [RM-006] Presence: who joined, who left, who is here
- **Goal:** the room announces "X joined" and "X left" and shows the list of people connected.
- **Done when:** opening and closing a tab updates the list and the notices in every other browser in the room.
- **Date:** 2026-10-29 · **Status:** Open

## [RM-007] Room lifecycle
- **Goal:** a room disappears once it has been empty for one minute; a link to a room that no longer exists says so.
- **Scope:** the grace period is one value in the API, easy to change.
- **Done when:** a room left empty for over a minute is gone (its link shows "room not found"), and reloading while alone inside the minute keeps it.
- **Date:** 2026-10-29 · **Status:** Open

## [RM-008] Limits against abuse
- **Goal:** the API protects itself: messages up to 1000 characters, 5 messages per second per person, 50 people per room.
- **Scope:** enforced in the API (the source of truth), reflected in the web (character counter, a clear message when a room is full or you're sending too fast). Each value lives in one place.
- **Done when:** exceeding any limit is rejected by the API with a clear message in the web, and normal use is never affected.
- **Date:** 2026-10-29 · **Status:** Open
