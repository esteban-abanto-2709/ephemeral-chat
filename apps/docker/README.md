# Docker

The whole app ships as **one image**: the Go API serves the Angular build.
Everything Docker-related lives here; the apps have no Dockerfile of their own.

```
apps/docker/
├── Dockerfile               # builds web + api into one image
├── Dockerfile.dockerignore  # ignore file for that Dockerfile
├── compose.yaml             # runs the production image locally
└── README.md
```

## Quick start

```bash
cd apps/docker
docker compose up -d --build
```

| Container        | URL                                |
| ---------------- | ---------------------------------- |
| `ephemeral-chat` | `http://localhost:3000`            |
|                  | `http://localhost:3000/api/health` |

For day-to-day development you don't need Docker: run the API with `go run .`
and the web with `pnpm start` (see each app's README). Compose is for trying
the exact image production runs, before pushing.

## How the image is built

The **build context is the repository root**, not this folder, so the
Dockerfile can reach both apps (`COPY apps/web …`, `COPY apps/api …`).

1. `node:24-alpine` builds Angular to static files.
2. `golang:1.27-alpine` compiles a static Go binary.
3. `alpine` gets only the binary and the static files, runs as a non-root
   user, with `STATIC_DIR=/srv/web` so the API serves the web.

`Dockerfile.dockerignore` sits next to the Dockerfile instead of a
`.dockerignore` at the repository root: BuildKit uses an ignore file named
after the Dockerfile, in its folder, over the root one. It keeps
`node_modules`, `dist` and `.git` out of the context.

## Render

One free **Web Service**, Docker runtime, deployed on every push to `main`:

| Setting           | Value                    |
| ----------------- | ------------------------ |
| Dockerfile Path   | `apps/docker/Dockerfile` |
| Build context     | repository root          |
| Health Check Path | `/api/health`            |

Render sets `PORT`; the API reads it. One service means web and API sleep and
wake together on the free tier.

## Commands

```bash
docker compose up -d --build   # build and start
docker compose ps              # status and health
docker compose logs -f app     # follow the logs
docker compose down            # stop and remove the container
docker images ephemeral-chat-* # image size
```

Nothing to back up: there is no volume and no data. Stopping the container
erases every conversation, by design.
