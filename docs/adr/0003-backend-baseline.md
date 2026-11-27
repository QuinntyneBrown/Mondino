# 0003: The backend baseline

**Status:** Accepted (journey 1, Scaffold the workspace)

## Context

`AGENTS.md` asks for clean architecture in four layers, MediatR handlers, EF Core behind
`IAppDbContext`, ProblemDetails with a `code`, `TimeProvider`, migrations applied by a CLI
command, and tests with no real database, no network and no sleeping. The database engine is
not chosen yet.

## Decision

- **.NET 10**, one solution `backend/Mondino.slnx`: `Mondino.Domain` (no dependency) ←
  `Mondino.Application` ← `Mondino.Infrastructure` ← `Mondino.Api`, and `Mondino.Cli` beside the
  API. `Directory.Build.props` turns on nullable, the recommended analyzers and warnings as
  errors; package versions are central (`Directory.Packages.props`) and locked
  (`packages.lock.json`, restored with `--locked-mode` in CI).
- **MediatR 12.5.0.** It is the last version under the Apache 2.0 licence; later versions need
  a commercial licence. It is pinned, and moving off 12 needs a record here.
- **Errors.** `AddProblemDetails` gives every error as ProblemDetails. Where a handler set no
  `code`, the status gives one (`invalid_request`, `unauthorized`, `forbidden`, `not_found`,
  `method_not_allowed`, `rate_limited`, `unexpected`; `ErrorCodes` in `Mondino.Application`).
  An unexpected error carries its `traceId` and no detail, message or stack trace (since
  [ADR 0031](0031-telemetry-from-an-allow-list.md), every error carries `correlationId`, the trace id).
- **Liveness** is `GET /health/live`, a health check endpoint with no checks: it says the
  process is running and never fails with a dependency. Readiness and telemetry are journey
  30's. The server sends no `Server` header.
- **The database engine is not chosen.** `Database:Provider` is `InMemory`, the only value
  accepted, so the API runs and keeps nothing between runs. Journey 2, the first that persists,
  chooses the engine, records it, adds its provider and the first migration. `AppDbContext`
  holds no entity until then.
- **Migrations and seed are CLI commands**: `dotnet run --project src/Mondino.Cli -- migrate`
  and `-- seed`. The API applies neither on startup. `migrate` calls `IDatabaseMigrator`; on a
  store with no schema it says there was nothing to apply. `seed` runs every `ISeedStep`; a step
  adds only what is missing. There is no step yet.
- **Tests** are xUnit, in `backend/tests/Mondino.Tests`. `MondinoApi` hosts the API in memory
  (`WebApplicationFactory`) with one EF Core InMemory store per fixture, `FakeTimeProvider` set
  to the mocks' "now", a migrator that counts its calls, and `DatabaseFails` to replace
  `IAppDbContext` with one that throws. A test awaits or advances the clock; it never sleeps.

## Consequences

- Until journey 2 the API holds no data, which is all the scaffold needs.
- The test project carries one controller of its own, `api/test-only/unhandled`, added as an
  application part, to prove how an unhandled error is answered.

## Settings a deployed system needs

| Setting | Value | Why |
|---|---|---|
| `Database:Provider` | `InMemory` | The only provider until an engine is chosen (journey 2). |
| `Database:Name` | `mondino` | The name of the in-memory store. |
| `ASPNETCORE_URLS` | for example `http://+:8080` | Where the API listens. |
