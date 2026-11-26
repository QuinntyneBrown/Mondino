# Mondino

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
![Angular](https://img.shields.io/badge/Angular-frontend-DD0031.svg)
![.NET](https://img.shields.io/badge/.NET-backend-512BD4.svg)

Mondino is where a team spread around the world sees each other. A teammate joins with a
postal code and appears as a pin on an interactive 3D globe. Each pin shows that teammate's
**local time, temperature and weather**, and a playful highlight when something is happening
where they live: a local holiday, a Formula 1 race, a festival.

Mondino is Italian for "little world". It is a responsive web application: an Angular frontend
and a .NET backend.

## Contents

- [The app](#the-app)
- [What Mondino leaves out](#what-mondino-leaves-out)
- [Design](#design)
- [Project status](#project-status)
- [How it works](#how-it-works)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Build and test](#build-and-test)
- [Repository structure](#repository-structure)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [Code of conduct](#code-of-conduct)
- [Security](#security)
- [Support](#support)
- [License](#license)

## The app

"Your team, around the world, right now." Five screens:

1. **Join.** "Put yourself on the map." A name, a country and a postal code, beside the globe
   with the team already on it. The postal code is looked up and the pin is placed at city
   level, with the weather there. A postal code that cannot be found says so.
2. **Globe.** The globe with every teammate's pin and its night side shaded, and a count of
   teammates, time zones, and who is working and who is asleep. A panel beside it shows *This
   week around the world* and *In working hours now*, or, for a selected pin, that teammate's
   city, local time, offset from you, status, weather, moments and working-hours overlap.
3. **Team.** "Where everyone is in their day." A day ribbon that places each teammate at the
   hour they are living through, then everyone from west to east, filtered by All, Working now
   or Asleep.
4. **Moments.** The holidays, races and local happenings where teammates live, filtered by
   kind, with today's at the top, then This week and Later.
5. **Profile & Settings.** "Your pin." Your location, °C or °F, a 24-hour or 12-hour clock,
   which kinds of moment show on the globe, what you share, and leaving the team.

A pin is a person, their clock and their sky: initials in the teammate's own colour, their local
time, the weather and the temperature, and a sun dot when there is a moment there this week.
Only the city is shown; a postal code stays private.

| Status | Local hour |
|---|---|
| Working hours | 09:00 to 18:00 |
| Early morning | 07:00 to 09:00 |
| Evening | 18:00 to 23:00 |
| Probably asleep | 23:00 to 07:00 |

A moment is one of four kinds: a holiday, Formula 1, a local event, or sport.

## What Mondino leaves out

Chat, a calendar or meeting scheduler, presence or activity tracking, precise location, a social
feed and adverts. Inviting a teammate, messaging one, sign-in and making a team are not designed
yet, and none is built before its design exists.

## Design

The design is the **Mondino App** prototype in Magic Patterns (the *Global Teammate Globe* OS),
with the *Mondino Brand* prototype (*Logo & Wordmark*) beside it.

- **Wordmark:** lowercase **mondino**, set in Gabarito.
- **Mark:** a little world: a globe with one meridian and one parallel, and a single pin resting
  on its rim.
- **Look:** paper and ink carry the interface: a warm paper canvas and deep navy ink. Pin
  (orange-red) marks people, sun (yellow) marks moments, leaf (green) marks working hours and
  sea (navy) is the globe. Gabarito for the wordmark, names and clocks; Inter for everything
  that is read.
- **Phone:** one column; Globe puts the globe on top and the panel under it.
- **Tablet and desktop:** the Join form sits beside the globe, the panel to the right of the
  globe, Team is a table, and your pin sits beside your settings.

Before a screen is built, its states are transcribed from the prototype into `docs/mocks/`, the
source of truth for the code.

## Project status

Mondino is designed and not yet built. The repository holds the agent instructions
([`AGENTS.md`](AGENTS.md)), the skills that drive the work (`.claude/skills/`, `.agents/skills/`)
and the community files. What comes next, in order:

1. The requirements in `docs/specs/`, from the prototype.
2. The mocks in `docs/mocks/`, transcribed from the prototype, and the design system extracted
   from them.
3. The detailed designs, the journeys and their slices.
4. The scaffold: the Angular workspace, the .NET solution, the test harness and CI.
5. The app, one slice at a time, each with its failing acceptance test first.

## How it works

```
Teammate ──▶ mondino (screens) ──▶ api clients (HTTP) ──▶ backend (.NET) ──▶ database
                  │                                           │
        components (presentation)                             └──▶ postal code lookup, weather, calendars
        globe (the globe's renderer)
```

| Project | Responsibility |
|---|---|
| `frontend/projects/api` (`@mondino/api`) | Contracts, types, injection tokens, and the HTTP clients for the backend |
| `frontend/projects/domain` (`@mondino/domain`) | Rules the browser applies itself: `time/`, `pins/`, `moments/`, `storage/` |
| `frontend/projects/components` (`@mondino/components`) | Presentation components, named as in the design system |
| `frontend/projects/globe` (`@mondino/globe`) | The globe's renderer and its map data, imported dynamically |
| `frontend/projects/mondino` | The app: pages, dialogs and the composition root |
| `backend/src/Mondino.*` | `Domain` ← `Application` ← `Infrastructure` ← `Api` |

This is the planned structure; each project is added by the first change that needs it.
Dependencies run one way, and ESLint enforces it. Every route is lazy-loaded. The browser
calls only the backend, which alone calls the postal code lookup, the weather and the calendars,
and a postal code is never sent to another teammate. The full rules are in [`AGENTS.md`](AGENTS.md).

## Prerequisites

- [Node.js](https://nodejs.org) 24 or later, with npm, for the frontend
- The [.NET SDK](https://dotnet.microsoft.com/download) 10, for the backend
- A current browser

## Getting started

```shell
git clone https://github.com/QuinntyneBrown/Mondino.git
cd Mondino
```

There is nothing to run yet. The scaffold adds `frontend/` and `backend/`, and from then on:

```shell
cd frontend && npm ci && npm start        # http://localhost:4200
cd backend && dotnet run --project src/Mondino.Api
```

## Build and test

These commands arrive with the scaffold; the table is what the project holds itself to.

| Task | Command | Scope |
|---|---|---|
| Format and lint | `cd frontend && npm run format:check && npm run lint` | Prettier, angular-eslint and its dependency boundaries |
| Unit tests | `cd frontend && npm test` | The unit tests of every frontend project, on a fake clock |
| Build | `cd frontend && npm run build` | The production build, within the `angular.json` bundle budgets |
| Behaviour specs | `cd frontend && npx playwright install chromium && npm run e2e` | Playwright on Chromium, with page objects, against fixtures and a set time, with no request off localhost |
| Backend | `cd backend && dotnet format --verify-no-changes && dotnet test` | Format, build and acceptance tests through the API on EF Core InMemory, with fakes for the outside sources |
| Everything | `node tools/verify/verify.mjs` | All of the above, side by side; run it before you push |

No automated test uses a real backend, database, clock or outside service, or a network beyond
localhost. CI runs lint,
the builds and one critical acceptance path per feature in under 5 minutes. Unit tests run only
locally.

## Repository structure

Today:

```
Mondino/
├── AGENTS.md                        The purpose, the design, the architecture rules and the workflow
├── CLAUDE.md                        Points to AGENTS.md
├── .claude/skills/                  The skills, for Claude Code
├── .agents/skills/                  The same skills, for other coding agents
├── .github/                         Issue and pull request templates
└── README.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, SECURITY.md, SUPPORT.md, LICENSE
```

As it is built:

```
Mondino/
├── frontend/                        The Angular workspace and its Playwright specs
│   ├── projects/                      The libraries and the app
│   └── e2e/                           Behaviour specs, fixtures and page objects
├── backend/                         The .NET service: Domain, Application, Infrastructure, Api, tests
├── docs/
│   ├── journeys.md                  The journeys, by value added, with % complete
│   ├── detailed-journeys.md         Each journey split into slices
│   ├── lessons-learned.md           What each slice taught
│   ├── specs/                       Requirements: L1 (high level), L2 (acceptance criteria)
│   ├── detailed-designs/            One design per feature, grouped by subsystem
│   ├── mocks/                       HTML mocks, the source of truth for the UI
│   ├── design-system/               Tokens and components extracted from the mocks
│   └── adr/                         Architecture decision records
├── tools/                           verify
└── .github/                         CI workflow, issue and pull request templates
```

## Documentation

| Document | Description |
|---|---|
| [AGENTS.md](AGENTS.md) | Mondino's purpose and scope, its design, the architecture rules and the required workflow |
| [CONTRIBUTING.md](CONTRIBUTING.md) | How a change is proposed and made |
| Skills (`.claude/skills/`, `.agents/skills/`) | Requirements, mocks, the design system, detailed designs, estimates, feature prompts, Angular and incremental implementation |

Requirements, mocks, the design system, the detailed designs, the journeys and the architecture
decisions are written into `docs/` as the work reaches them, and are listed here when they are.

## Contributing

Contributions are welcome. Before you open a pull request, read
[`CONTRIBUTING.md`](CONTRIBUTING.md) for the workflow and [`AGENTS.md`](AGENTS.md) for the
architecture rules. In summary:

- If it does not serve seeing where a teammate is and what it is like there right now, it does
  not belong in Mondino.
- Every change to product code needs a requirement, a detailed design and a mock before any code
  is written.
- Work in small slices, and write the failing acceptance test first.
- Keep the requirements, designs, mocks, tests and code consistent with each other.
- Lazy loading and memory come first: a change that grows the initial bundle or leaks memory is
  not done.

## Code of conduct

This project has adopted the [Contributor Covenant](CODE_OF_CONDUCT.md). By participating, you are
expected to uphold this code.

## Security

Do not report security vulnerabilities through public GitHub issues. See [`SECURITY.md`](SECURITY.md)
for how to report one privately.

## Support

See [`SUPPORT.md`](SUPPORT.md) for how to ask a question, report a bug or request a feature.

## License

Copyright (c) 2026 Quinntyne Brown. Licensed under the [MIT License](LICENSE).
