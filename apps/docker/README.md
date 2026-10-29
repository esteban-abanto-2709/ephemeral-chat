# Docker

Both apps run with Docker Compose, each from its own `Dockerfile` in
`apps/api` and `apps/web`.

## Quick start

```bash
cd apps/docker
docker compose up -d --build
```

| Service | Container            | URL                            |
| ------- | -------------------- | ------------------------------ |
| `web`   | `ephemeral-chat-web` | `http://localhost:3000`        |
| `api`   | `ephemeral-chat-api` | `http://localhost:4000/health` |

`web` starts only once `api` reports healthy.

## Commands

```bash
docker compose up -d --build   # build and start
docker compose ps              # status and health
docker compose logs -f api     # follow a service's logs
docker compose down            # stop and remove the containers
docker images ephemeral-chat-* # image sizes
```

Nothing to back up: there is no volume and no data. Stopping the containers
erases every conversation, by design.
