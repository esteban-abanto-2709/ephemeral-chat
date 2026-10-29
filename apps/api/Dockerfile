# ---------- Build ----------
FROM golang:1.27-alpine AS builder

WORKDIR /src

COPY . .

RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /out/api .


# ---------- Runtime ----------
FROM alpine:3.22 AS runner

RUN adduser -D -u 1001 app

COPY --from=builder /out/api /usr/local/bin/api

USER app

ENV PORT=4000
EXPOSE 4000

CMD ["api"]
