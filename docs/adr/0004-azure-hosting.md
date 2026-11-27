# 0004: Hosted on Azure App Service, deployed on every commit to main

**Status:** Accepted

## Context

Every commit to `main` is to be deployed to Azure. `AGENTS.md` asks that the browser call only
the backend and that no secret sit in the repository. ADR 0003 leaves the database engine to
journey 2; this decision does not choose it.

## Decision

- **One Linux App Service** (.NET 10) runs `Mondino.Api`. The Angular build
  (`frontend/dist/mondino/browser`) is published into the API's `wwwroot`, and the API serves
  it with a fallback to `index.html`. The app and its API share one origin, so there is no
  CORS and the browser calls only the backend. An unknown `/api/...` route stays a 404.
- **`.github/workflows/deploy.yml`** runs when `CI` completes on a push to `main`, and only if
  it passed; it can also be started by hand. It builds, publishes, signs in to Azure with
  OpenID Connect (a federated credential, no stored secret) and deploys, then waits for
  `/health/live`. Deployments run one at a time in the `production` environment.
- Migrations are not applied by the deploy; `Mondino.Cli migrate` does that once an engine is
  chosen (journey 2).

## Consequences

- CI stays under 5 minutes; the deploy is a separate workflow and does not count toward it.
- While `Database:Provider` is `InMemory`, a deployment keeps nothing across restarts.
- The settings a deployment needs are in `docs/deployment/README.md`.
