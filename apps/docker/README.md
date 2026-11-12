# Docker

The whole app ships as **one image**: the Go API serves the Angular build.
Everything Docker-related lives here; the apps have no Dockerfile of their own.

```
apps/docker/
├── Dockerfile               # builds web + api into one image
├── Dockerfile.dockerignore  # ignore file for that Dockerfile
├── compose.yaml             # what every environment shares: container, restart, healthcheck
├── compose.override.yaml    # development: builds from source with /design, publishes 3000, optional tunnel
└── README.md
```

A plain `docker compose …` merges `compose.yaml` with `compose.override.yaml`
on its own, so on your machine it is always development. Production never
reads either file: Render builds `Dockerfile` directly (see below), so nothing
in the override, the tunnel and the `DESIGN=true` build argument (the web's
`/design` board) included, can reach it.

## Quick start

```bash
cd apps/docker
docker compose up -d --build
```

| Container        | URL                                |
| ---------------- | ---------------------------------- |
| `ephemeral-chat` | `http://localhost:3000`            |
|                  | `http://localhost:3000/api/health` |

## Testing on a phone

```bash
docker compose --profile tunnel up -d --build
docker compose logs tunnel | grep trycloudflare.com
```

The `tunnel` profile adds `ephemeral-chat-tunnel`, a Cloudflare quick tunnel:
a public `https://….trycloudflare.com` URL to the app, no account or token.
The URL changes every time the tunnel starts. `https` matters on a phone:
copying the link and installing the app need a secure origin.

The tunnel has no restart policy, so it never comes back on its own after a
reboot; anyone with the URL reaches your machine while it runs. Stop it with
`docker compose --profile tunnel down`.

On the same Wi-Fi, `http://<your PC's IPv4>:3000` also works, without copying
or installing.

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

Render sets `PORT`; the API reads it. The image sets `GOMEMLIMIT=400MiB` so
Go collects garbage harder before the 512 MB instance fills. One service means
web and API sleep and wake together on the free tier.

## Screenshots

`screenshots/capture.mjs` takes the README images from the `/design` board
(the dev image serves it) with Playwright's Chromium, run inside the official
Playwright image so nothing is installed on your machine. It fails instead of
saving frosted-glass fallbacks: it waits for the WebGL `liquid` class.

With the app up on port 3000, from this folder:

```bash
docker run --rm --add-host=host.docker.internal:host-gateway \
  -v "$PWD/screenshots:/script:ro" -v "$PWD/../../docs/images:/out" \
  mcr.microsoft.com/playwright:v1.65.0-noble \
  sh -c 'mkdir /tmp/pw && cp /script/capture.mjs /tmp/pw/ && cd /tmp/pw && npm i --silent playwright@1.65.0 && node capture.mjs'
```

| Variable    | Default                            | Meaning                           |
| ----------- | ---------------------------------- | --------------------------------- |
| `BASE_URL`  | `http://host.docker.internal:3000` | Where the app answers             |
| `SHOT_LANG` | `en`                               | Language of the page (`en`, `es`) |
| `OUT_DIR`   | `/out`                             | Where the PNGs are written        |

For Spanish shots in another folder, add `-e SHOT_LANG=es` and mount a
different output folder on `/out`, for example
`-v "$PWD/../../docs/images/es:/out"` (create it first).

## Commands

```bash
docker compose up -d --build   # build and start
docker compose ps              # status and health
docker compose logs -f app     # follow the logs
docker compose --profile tunnel down  # stop everything, tunnel included
docker images ephemeral-chat-* # image size
```

Nothing to back up: there is no volume and no data. Stopping the container
erases every conversation, by design.
