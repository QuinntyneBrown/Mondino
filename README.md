<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/design-system/assets/logo/lockup-on-ink.svg">
    <img src="docs/design-system/assets/logo/lockup.svg" alt="mondino" width="320">
  </picture>
</p>

# Mondino

[![CI](https://github.com/QuinntyneBrown/Mondino/actions/workflows/ci.yml/badge.svg)](https://github.com/QuinntyneBrown/Mondino/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Angular](https://img.shields.io/badge/Angular-22-DD0031.svg)
![.NET](https://img.shields.io/badge/.NET-10-512BD4.svg)

Mondino is where a team spread around the world sees each other. A teammate joins with a
postal code and appears as a pin on an interactive 3D globe. Each pin shows that teammate's
local time, temperature and weather, and a playful highlight when something is happening where
they live: a local holiday, a Formula 1 race, a festival.

Mondino is Italian for "little world". Its tagline is "Your team, around the world, right now."
It is a responsive web application with an Angular frontend and a .NET backend.

[Watch *Meet Mondino* (3:32)](docs/videos/00-meet-mondino/README.md) for a tour of every screen.

## Contents

- [Features](#features)
- [Non-goals](#non-goals)
- [Architecture](#architecture)
- [Getting started](#getting-started)
- [Build and test](#build-and-test)
- [Deployment](#deployment)
- [Repository structure](#repository-structure)
- [Documentation](#documentation)
- [Project status](#project-status)
- [Contributing](#contributing)
- [Code of conduct](#code-of-conduct)
- [Security](#security)
- [Support](#support)
- [License](#license)

## Features

Mondino answers one question: what is it like where my teammate is, right now? It has three
ways in and four screens.

| Screen | What it does |
|---|---|
| **Join** | A teammate opens the team's invite link and gives a name, a country and a postal code. Mondino looks up the postal code, places the pin at the city with the weather there, and adds the teammate to the team. |
| **Create Team** | A team name, a name, a work email, a country and a postal code make a team with its maker's pin on it, and give the invite link to share. |
| **Sign In** | A work email and no password. Mondino emails a link that signs the teammate in once, within 15 minutes. |
| **Globe** | The home screen. A lit 3D globe with every teammate's pin and its night side shaded. A panel shows *This week around the world* and *In working hours now*, or the selected teammate's city, local time, offset, status, weather, moments and working-hours overlap. |
| **Team** | A day ribbon that places each teammate at the hour they are living through, then everyone from west to east, filtered by All, Working now or Asleep. Past 40 teammates the list is searched and split into a section per city. |
| **Moments** | The holidays, races and local happenings where teammates live, filtered by kind, with today's at the top, then This week and Later. |
| **Profile & Settings** | The teammate's own pin and location, °C or °F, a 24-hour or 12-hour clock, which kinds of moment show on the globe, what teammates see, and leaving the team. |

Key behaviours:

- **Only the city is shown.** A postal code places a pin at city level and stays private. A
  teammate sees another's city and country, never their postal code, address or email.
- **Status comes from the local hour.** Working hours are 09:00 to 18:00, Early morning 07:00
  to 09:00, Evening 18:00 to 23:00, and Probably asleep 23:00 to 07:00.
- **A moment is one of four kinds:** a holiday, Formula 1, a local event, or sport.
- **Large teams work.** Pins that would cover each other become one group pin with a count,
  and long lists keep a fixed window of rows in the page.
- **Outside sources can fail.** A pin keeps its local time when the weather or a calendar is
  unavailable, and Join offers a city picker when the postal code lookup is down.
- **Every width, both themes.** Every screen works from a narrow phone to a large display, in
  light and in dark, by touch, keyboard and screen reader, and honours reduced motion.

## Non-goals

Mondino has no chat, no calendar or meeting scheduler, no presence or activity tracking, no
precise location, no social feed, no adverts, and no admins or roles. Whoever makes a team is a
teammate like any other.

## Architecture

```
Teammate ──▶ mondino (screens) ──▶ api clients (fetch) ──▶ backend (.NET) ──▶ PostgreSQL
                  │                                            │
        components (presentation)                              ├──▶ GeoNames (postal codes)
        domain (time, pins, moments)                           ├──▶ Open-Meteo (weather)
        globe (three.js renderer, lazy)                        ├──▶ OpenHolidays (holidays)
                                                               └──▶ Postmark (sign-in email)
```

| Project | Responsibility |
|---|---|
| `frontend/projects/api` (`@mondino/api`) | Contracts, types, injection tokens, and the HTTP clients for the backend |
| `frontend/projects/domain` (`@mondino/domain`) | Rules the browser applies itself: `time/`, `pins/`, `moments/`, `storage/` |
| `frontend/projects/components` (`@mondino/components`) | Presentation components, named as in the design system |
| `frontend/projects/globe` (`@mondino/globe`) | The globe's three.js renderer, its Blender-built model and its map data, imported dynamically |
| `frontend/projects/mondino` | The app: pages, dialogs and the composition root |
| `backend/src/Mondino.Domain` | Entities, with no dependencies |
| `backend/src/Mondino.Application` | MediatR handlers, validators, DTOs, and the interfaces to the outside sources |
| `backend/src/Mondino.Infrastructure` | EF Core, migrations, authentication, and the outside sources |
| `backend/src/Mondino.Api` | Controllers; serves the built frontend when deployed |
| `backend/src/Mondino.Cli` | The `migrate` and `seed` commands |

Design principles:

- **One-way dependencies.** `mondino` depends on the libraries and `api` depends on nothing;
  the backend layers depend inward. ESLint enforces the frontend boundaries.
- **The browser calls only the backend.** No third party learns where a teammate is. The
  backend alone calls the outside sources, with a timeout, a cache and a circuit breaker, and
  sends them a place and never a teammate's name or team.
- **Lazy loading and memory come first.** Every route is lazy-loaded, the globe's renderer is
  imported dynamically, and the initial bundle is held to 150 kB compressed (a 290 kB raw
  budget). The globe is drawn first from a light model and steps its detail down on a slow
  device. Everything a screen acquires is released when the teammate leaves it.
- **One clock.** Local time is never stored or sent. The backend gives a pin's time zone, and
  every local time on a screen ticks from one shared, injected clock.
- **Private telemetry.** OpenTelemetry logs, metrics and spans carry no name, email, postal
  code, position or token.

The decisions behind these are recorded in [`docs/adr/`](docs/adr/README.md), and the full rules
are in [`AGENTS.md`](AGENTS.md).

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org) 22 or later (CI uses 24), with npm
- The [.NET SDK](https://dotnet.microsoft.com/download) 10

### Run locally

```shell
git clone https://github.com/QuinntyneBrown/Mondino.git
cd Mondino
```

Start the backend and the frontend in two terminals:

```shell
cd backend && dotnet run --project src/Mondino.Api    # http://localhost:5080
cd frontend && npm ci && npm start                    # http://localhost:4200
```

`npm start` proxies `/api` to the backend. Open http://localhost:4200 and make a team on Create
Team.

By default the backend uses an in-memory database that keeps nothing between runs. To keep data,
set `Database:Provider` to `PostgreSQL` and `ConnectionStrings:Mondino` to your database, then
apply the migrations and the seed data. The API never applies them on startup.

```shell
cd backend
dotnet run --project src/Mondino.Cli -- migrate
dotnet run --project src/Mondino.Cli -- seed
```

Some features need a setting before they work locally:

| Feature | Setting | Without it |
|---|---|---|
| Postal code lookup | `PostalCodeSource:Username` (a GeoNames account) | Join and Create Team offer a city picker instead |
| Create Team | `EmailProtection:Key` (32 random bytes, base64) | Create Team fails |
| Sign-in email | `SignInEmail:ServerToken`, `SignInEmail:From`, `SignInEmail:AppAddress` | No email is sent |

Every setting is described in [`docs/deployment/README.md`](docs/deployment/README.md#app-settings).

## Build and test

| Task | Command |
|---|---|
| Everything below except the sweeps | `node tools/verify/verify.mjs` |
| Format and lint | `cd frontend && npm run format:check && npm run lint` |
| Unit tests | `cd frontend && npm test` |
| Production build | `cd frontend && npm run build` |
| Behaviour specs | `cd frontend && npx playwright install chromium && npm run e2e` |
| Backend format and tests | `cd backend && dotnet format --verify-no-changes && dotnet test` |
| Visual, responsive, accessibility and performance sweeps | `cd frontend && npm run e2e:visual`, `e2e:responsive`, `e2e:accessibility`, `e2e:performance` |

Run `node tools/verify/verify.mjs` before you push. It runs every CI check and the unit tests.

No automated test uses a real backend, database, clock or outside service, or a network beyond
localhost. Playwright specs run on Chromium against fixtures and a set time. Backend tests run
through the API on EF Core InMemory with fakes for the outside sources. CI runs lint, the builds
and one critical acceptance path per feature in under 5 minutes. The sweeps run only on request.

## Deployment

Every commit to `main` deploys to an Azure App Service once CI passes. A deployment migrates the
Azure PostgreSQL database before it publishes, and succeeds only when the new version answers
`Healthy` at `/health/live` and `/health/ready`.

[`docs/deployment/README.md`](docs/deployment/README.md) covers the one-time setup, the app
settings and the database. The database is described in [`infra/`](infra/).

## Repository structure

```
Mondino/
├── frontend/                The Angular workspace
│   ├── projects/              The libraries (api, domain, components, globe) and the app (mondino)
│   └── e2e/                   Playwright specs, fixtures, page objects and sweeps
├── backend/                 The .NET solution
│   ├── src/                   Domain, Application, Infrastructure, Api and Cli
│   └── tests/                 Acceptance and domain tests
├── docs/
│   ├── specs/               Requirements: L1 (high level) and L2 (acceptance criteria)
│   ├── mocks/               HTML mocks of every screen in every state; the source of truth for the UI
│   ├── design-system/       Tokens and components extracted from the mocks
│   ├── detailed-designs/    One design per feature, grouped by subsystem
│   ├── adr/                 Architecture decision records
│   ├── deployment/          How Mondino is deployed and configured
│   ├── journeys.md          The thirty journeys that built Mondino, with their progress
│   ├── prompts/             One prompt per journey
│   ├── lessons-learned.md   What each journey taught
│   └── videos/              Narrated films of the product
├── infra/                   The database as Bicep
├── tools/                   verify, the city list builder and the video tools
└── .github/                 CI and deployment workflows, issue and pull request templates
```

## Documentation

| Document | Description |
|---|---|
| [AGENTS.md](AGENTS.md) | Mondino's purpose and scope, its design, the architecture rules and the required workflow |
| [docs/specs/](docs/specs/) | What Mondino must do (`L1.md`) and each behaviour with its acceptance criteria (`L2.md`) |
| [docs/mocks/](docs/mocks/README.md) | Every screen, dialog and notification in every state, transcribed from the Magic Patterns prototype |
| [docs/design-system/](docs/design-system/) | Colour, type, spacing and motion tokens, and one page per component |
| [docs/detailed-designs/](docs/detailed-designs/README.md) | The design of each feature, with the requirements it realises |
| [docs/adr/](docs/adr/README.md) | Each decision that shapes the code, with its reason |
| [docs/deployment/](docs/deployment/README.md) | Hosting, app settings and the database |
| [docs/journeys.md](docs/journeys.md) | The journeys in the order they were built, with their requirements and progress |
| [docs/videos/](docs/videos/README.md) | The films and how they are built |

## Project status

Mondino is built and deployed. Every screen is implemented, and the work is 93% complete:
24 of the 30 journeys in [`docs/journeys.md`](docs/journeys.md) are finished, and three more
are at 90%. Three have more to do:

| Journey | Complete |
|---|---|
| Invite teammates | 60% |
| Observe without exposing | 20% |
| Stay fast and light | 10% |

Three behaviours are not designed yet and are not built: how a teammate who joined by invite
link signs in again, what a used or expired sign-in link shows, and what "Reset link" asks
before it acts. [`docs/mocks/README.md`](docs/mocks/README.md) lists them.

## Contributing

Contributions are welcome. Before you open a pull request, read
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the workflow and [`AGENTS.md`](AGENTS.md) for the
architecture rules. In summary:

- A change must serve seeing where a teammate is and what it is like there right now.
- Every change to product code needs a requirement, a detailed design and a mock before any
  code is written.
- Work in small slices, and write the failing acceptance test first.
- Keep the requirements, designs, mocks, tests and code consistent with each other.
- A change that grows the initial bundle or leaks memory is not done.

## Code of conduct

This project has adopted the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you
are expected to uphold this code.

## Security

Do not report security vulnerabilities through public GitHub issues. See
[`SECURITY.md`](SECURITY.md) for how to report one privately.

## Support

See [`SUPPORT.md`](SUPPORT.md) for how to ask a question, report a bug or request a feature.

## License

Copyright (c) 2026 Quinntyne Brown. Licensed under the [MIT License](LICENSE).
