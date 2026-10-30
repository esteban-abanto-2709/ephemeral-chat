# Build context: the repository root (paths below start at it).

# ---------- Web ----------
FROM node:24-alpine AS web

WORKDIR /web

RUN corepack enable

COPY apps/web/package.json apps/web/pnpm-lock.yaml apps/web/pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY apps/web .
RUN pnpm run build


# ---------- API ----------
FROM golang:1.27-alpine AS api

WORKDIR /src

COPY apps/api .
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/api .


# ---------- Runtime ----------
FROM alpine:3.22 AS runner

RUN adduser -D -u 1001 app

COPY --from=api /out/api /usr/local/bin/api
COPY --from=web /web/dist/web/browser /srv/web

USER app

ENV PORT=8080
ENV STATIC_DIR=/srv/web
EXPOSE 8080

CMD ["api"]
