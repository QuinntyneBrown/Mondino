# Architecture decision records

A decision that shapes the code, with its reason, in the order it was made. A record is never
rewritten once it is accepted: a later record supersedes it and says so. Read the records for an
area before changing it. A departure from the platform's best practice (Angular, .NET,
Playwright, WCAG) needs a record here that gives its reason.

| # | Decision | Status |
|---|---|---|
| [0001](0001-frontend-workspace.md) | The frontend workspace: libraries read from source, one lint, Vitest | Accepted |
| [0002](0002-e2e-harness.md) | The e2e harness: fixtures answer the API, a set time, localhost only | Accepted |
| [0003](0003-backend-baseline.md) | The backend baseline: four layers, MediatR 12, InMemory until an engine is chosen | Accepted |
| [0004](0004-database-engine.md) | The database engine: PostgreSQL through EF Core, migrations and seed by the CLI | Accepted |
| [0005](0005-fetch-for-the-backend.md) | The browser calls the backend with `fetch`, so `HttpClient` stays out of the initial bundle | Accepted |
| [0006](0006-postal-code-source.md) | The postal code source is GeoNames, and the city comes from Mondino's own list | Accepted |

Not decided yet, each by the journey that first needs it: the globe's renderer and asset format
(journey 8), the hosting platform, the providers of the calendars (journey 19) and the sender of sign-in emails
(journey 7).
