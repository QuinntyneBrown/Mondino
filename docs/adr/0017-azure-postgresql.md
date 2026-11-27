# 0017: The deployed database is an Azure PostgreSQL Flexible Server, reached without a password and migrated by the deployment

**Status:** Accepted. Adds to [ADR 0004, the database engine](0004-database-engine.md), which
chose PostgreSQL, and to [ADR 0004, Azure hosting](0004-azure-hosting.md), which left migrations
to "once an engine is chosen".

## Context

The deployed Mondino ran with `Database:Provider` `InMemory`: every restart and every deployment
lost each team, teammate, pin and sign-in link (L2-057). The code already spoke PostgreSQL
through a connection string, but a deployment applied no migration and proved only
`/health/live`, which checks nothing, so a database that could not be reached would have passed.
No migration had ever run on a real PostgreSQL (ADR 0004, the database engine).

The app is one Linux App Service (`mondino-app-27660`, plan B1, `canadacentral`). The deployment
runs on a GitHub-hosted runner and signs in to Azure with OpenID Connect as the app registration
`mondino-deploy`, which holds no secret.

## Decision

- **One Azure Database for PostgreSQL Flexible Server**, `mondino-pg-27660`, in `mondino-rg`,
  `canadacentral`, beside the app: PostgreSQL 18, Burstable `Standard_B1ms` (1 vCore, 2 GiB),
  32 GiB of storage that does not grow on its own, no high availability, no replica. One
  database, `mondino`. At the list prices of 27 November 2026 that is about USD 13.50 a month of
  compute and USD 4.05 of storage, **about USD 18 a month**. It is described in
  `infra/database.bicep`.
- **Microsoft Entra authentication only.** Password authentication is switched off on the
  server, so there is no database password to store, leak or rotate. A connection presents a
  short-lived Entra token as its password, over TLS, with the server's certificate and name
  verified (`SSL Mode=VerifyFull`).
- **Three roles, each with the least it needs.**

  | Role | Who signs in as it | What it may do |
  |---|---|---|
  | the Entra administrator | the product owner's own account | everything; used to set the server up and in an emergency, never by the app or the deployment |
  | `mondino_migrator` | the deployment (`mondino-deploy`'s service principal) | create and change tables in the `mondino` database's `public` schema; it owns them |
  | `mondino_app` | the App Service's system-assigned managed identity | read and write rows in those tables, and nothing else: it cannot create, alter or drop a table |

  `infra/database-roles.sql` creates the two roles and their grants. Default privileges give
  `mondino_app` its rights on every table `mondino_migrator` creates later, so a new migration
  needs no new grant.
- **`Database:Authentication` says how the connection signs in**: `Password` (the default: the
  connection string carries whatever it needs, as on a laptop), `ManagedIdentity` (the deployed
  API) or `AzureCli` (the deployment and an operator, from whoever `az login` signed in). With
  either Entra value the connection string names the host, the database and the role, must hold
  no password, and is forced to `VerifyFull`; a setting that breaks this stops the process at
  startup with a message that names the setting and never its value. The credential is named,
  never discovered (`DefaultAzureCredential` tries several and may pick another on another
  machine). The token is asked for when a connection is opened and is never logged.
- **Transient failures are retried** by the EF Core provider's own execution strategy
  (`EnableRetryOnFailure`). No handler opens a transaction of its own, which the strategy would
  refuse.
- **The server is reached over its public endpoint, behind its firewall.** The firewall allows
  the App Service's possible outbound addresses and nothing else; "Allow public access from any
  Azure service" is off. Those addresses are shared with other App Service customers of the same
  stamp, so the firewall narrows who can try, and Entra authentication is what lets in only
  Mondino's two identities.
- **Migrations run in the deployment, before the new version is published.** `deploy.yml` builds
  `Mondino.Cli`, allows the runner's own address through the firewall for the length of the
  step, runs `Mondino.Cli migrate` as `mondino_migrator`, and removes the rule again whether or
  not the step passed. The API still applies nothing on startup. `mondino-deploy` holds a custom
  role, on this server only, that may read the server and write and delete its firewall rules.
- **A failed migration stops the deployment.** Each migration runs in its own transaction, so
  the schema stays at the last migration that succeeded and the version that was running goes on
  serving.
- **A migration must suit the version before it.** The old version serves while the schema
  changes and until the new one has started, so a migration only adds what the old version can
  ignore (a table, a nullable column, a column with a default). Removing or renaming something
  takes two releases: the first stops using it, the second removes it.
- **The deployment points the app at the database it migrated.** After the migration it sets
  `Database__Provider`, `Database__Authentication` and `ConnectionStrings__Mondino` on the App
  Service from the same variables, only when they differ, so the app and the migration can never
  name different servers. None of the three is a secret.
- **Readiness.** `GET /health/ready` answers `Healthy` when the API can reach its database and
  503 `Unhealthy` when it cannot, and says nothing else (`observe-without-exposing`, L2-051). The
  deployment ends by requiring `Healthy` from both `/health/live` and `/health/ready`.
- **Backups.** The server keeps its automatic backups for 7 days, locally redundant. A restore
  to a moment in that week makes a new server; the app is then pointed at it
  (`docs/deployment/README.md`).

### Rejected

- **A password in an app setting or a Key Vault.** It works with the code as it was, but it is a
  secret to store and rotate, and it would have to be given to the deployment as well.
- **A private endpoint or a virtual network, with public access off.** It is the stronger
  network boundary, and the plan supports it. But the GitHub-hosted runner could then not reach
  the server to migrate, nor an operator to restore or repair it, without a self-hosted runner
  or a jump host; a private endpoint also costs about USD 7 a month. With passwords off, a
  connection from an allowed address still needs a token for one of two identities. Revisit it
  if Mondino gains a self-hosted runner or holds more than a name, a city and a postal code.
- **One of the subscription's other PostgreSQL servers.** They belong to other projects; Mondino
  would share their capacity, their outages and their administrators.
- **Migrating on startup.** `AGENTS.md` forbids it: the running app would need the rights to
  change its own schema, and two instances would race.
- **A database in CI.** The pipeline stays under five minutes and tests run on no real database;
  the migrations are proven on the real server by the deployment itself.

## Consequences

- A deployed Mondino keeps what a team stores. What was held in memory when the app was switched
  over is lost; it could not be carried.
- No test proves the connection, the retries or a migration: they need a real PostgreSQL. The
  deployment proves each release's migrations before publishing it, and readiness proves the
  connection after.
- `/health/ready` is open to anyone and asks the database each time. It runs one trivial query
  on a pooled connection; it is not rate limited (L2-045 excepts the health endpoints).
- When the app's settings are first switched, the version that was running serves for about a
  minute with settings it cannot use, until the new version is published. Later deployments
  change no setting.
- The firewall lists the App Service's possible outbound addresses. Changing the plan's tier can
  change them; `infra/database.bicep` is then deployed again with the new list.
- Burstable compute earns credits while idle and slows when they are spent. A team of 500 reads
  far more than it writes; if the server's CPU credits run low, the next size is
  `Standard_B2s`.
- `Mondino.Cli seed` is never run against this database: the sample team's invite token is
  written in the repository.

## Settings a deployed system needs

| Setting | Value | Why |
|---|---|---|
| `Database__Provider` | `PostgreSQL` | set by the deployment |
| `Database__Authentication` | `ManagedIdentity` | set by the deployment; the API signs in as the App Service's identity |
| `ConnectionStrings__Mondino` | `Host=<server>.postgres.database.azure.com;Database=mondino;Username=mondino_app` | set by the deployment; holds no password |

The deployment reads the server's name from the GitHub `production` variable
`AZURE_POSTGRES_SERVER`.
