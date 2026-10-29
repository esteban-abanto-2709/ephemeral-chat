# Ephemeral Chat

A real-time chat where **nothing is kept**.

No accounts, no database, no history. You come in, talk, and when everyone
leaves, the conversation is gone.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue)](./LICENSE)

[![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)](https://angular.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Go](https://img.shields.io/badge/Go-1.27-00ADD8?logo=go&logoColor=white)](https://go.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](./apps/docker/README.md)

---

## The idea

Most chats remember everything: every message, forever, tied to an account.

Ephemeral Chat starts from the opposite idea: **a conversation only exists
while people are in it**. Everything lives in the server's memory. There is
nothing to sign up for and nothing left behind.

## How it works

1. **Create a room** and pick the name you'll appear with.
2. **Share the link.** Whoever has it comes in, even if a friend forwarded it.
3. **Talk.** Everyone sees who joined, who left and who is here.
4. **Leave.** A minute after the last person goes, the room is gone and its
   link stops working.

The server **never stores a message**: it only passes it on to whoever is in
the room at that moment. Join late and you see nothing from before. Reload and
everything you had is gone.

## What it is NOT

- **Not a public chat.** There's no global room: every conversation happens
  behind a link.
- **Not a place to keep things.** No history, no accounts, nothing to recover.

## Status

Building **v0.1**: the journey above, text only, deployed. Images, voice
messages, stickers and end-to-end encryption are ideas for later versions.

The detail and the order are in the [roadmap](./docs/logbook/roadmap.md).

## How it's built

Two independent applications and the orchestration that ties them together:

| Folder | What it is |
|---|---|
| [`apps/web`](./apps/web/README.md) | The interface: Angular and Tailwind |
| [`apps/api`](./apps/api/README.md) | The server: Go, standard library |
| [`apps/docker`](./apps/docker/README.md) | Docker Compose to run both together |

Each folder has its own README with the technical detail.

### Run it on your machine

```bash
cd apps/docker
docker compose up -d --build
```

Then open `http://localhost:3000`.

## About the project

Built to learn Angular and Go in depth, coming from Next.js and NestJS. No
rush: the goal is to understand each piece, not to ship the most features.

- [Product vision](./docs/product-vision.md): principles, limits, versions and
  what was decided against.
- [Logbook](./docs/logbook/): roadmap, ideas, technical debt and changelog.

## License

[MIT](./LICENSE) © Esteban Abanto
