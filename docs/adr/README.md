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
| [0007](0007-join-form-runtime-in-the-initial-bundle.md) | Join's form brings Angular's runtime for outputs and render effects into the initial bundle | Accepted |
| [0004](0004-azure-hosting.md) | Hosted on one Azure App Service, deployed on every commit to main | Accepted |
| [0008](0008-session-and-cross-site-requests.md) | The session is a year-long sliding cookie, and the open requests refuse other sites | Accepted |
| [0009](0009-making-a-team.md) | Making a team keeps only a keyed fingerprint of the email, and reuses Join's lookup | Accepted |
| [0010](0010-protecting-team-data.md) | Every endpoint needs a session unless marked open, and the app is served under a nonce-based CSP | Accepted |
| [0011](0011-signing-in-with-an-emailed-link.md) | Sign-in links are mailed by Postmark from an outbox, and the link keeps its token in the fragment | Accepted |
| [0012](0012-drawing-the-globe.md) | The globe is drawn by three.js from a Blender-built glTF model and mask textures | Accepted |
| [0013](0013-turning-the-globe.md) | The globe turns from one frame loop, at numbers of its own, and only the Globe screen's globe turns on its own | Accepted |
| [0014](0014-drawing-the-pins.md) | The page places the pins over the globe, and the numbers that group, fade and label them | Accepted |

Not decided yet, by the journey that first needs it: the providers of the calendars (journey 19).
