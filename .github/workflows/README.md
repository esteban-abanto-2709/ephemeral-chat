# Workflows

One file: **CI verifies**. There is no CD here: Render builds and deploys
every push to `main` on its own.

| File | Triggered by | What it does |
|---|---|---|
| `ci.yml` | every push to `main` and every pull request to it | checks the API, the web and the Docker image |

| Job | What it runs |
|---|---|
| API | `gofmt`, `go vet` and `go test -race` in `apps/api` |
| Web | `format:check`, the tests and the build in `apps/web` |
| Image | builds `apps/docker/Dockerfile` without publishing it, as Render will |

The three jobs are independent and run at the same time.

## Deploys wait for CI

Render deploys a push whether CI passes or not, unless the service's
auto-deploy is set to **After CI Checks Pass**. With that setting a commit
that fails here never reaches production.

## Concurrency

A new push to the same branch cancels the run of the previous one: only the
last commit matters.
