# Deployment

Every commit to `main` deploys to Azure once CI passes on it (`.github/workflows/deploy.yml`,
ADR [0004](../adr/0004-azure-hosting.md)). It can also be run by hand from the Actions tab.

A deployment migrates the database before it publishes anything, and ends by requiring the new
version to answer `Healthy` at `/health/live` and at `/health/ready`
(ADR [0017](../adr/0017-azure-postgresql.md)). A migration that fails stops the deployment, and
the version that was running goes on serving.

## One-time setup

1. Create a resource group and a Linux App Service (runtime **.NET 10**):

   ```sh
   az group create -n mondino-rg -l canadacentral
   az appservice plan create -g mondino-rg -n mondino-plan --is-linux --sku B1
   az webapp create -g mondino-rg -p mondino-plan -n <app-name> --runtime "DOTNETCORE:10.0"
   az webapp config set -g mondino-rg -n <app-name> --always-on true --http20-enabled true
   az webapp update -g mondino-rg -n <app-name> --https-only true
   ```

2. Create an app registration with a federated credential for this repository's `production`
   environment, and let it deploy to the resource group:

   ```sh
   az ad app create --display-name mondino-deploy          # note appId
   az ad sp create --id <appId>
   az ad app federated-credential create --id <appId> --parameters '{
     "name": "github-production",
     "issuer": "https://token.actions.githubusercontent.com",
     "subject": "repo:<owner>/<repo>:environment:production",
     "audiences": ["api://AzureADTokenExchange"]
   }'
   # This repository's OIDC tokens name it by ID as well, so add that subject too:
   #   repo:QuinntyneBrown@1749159/Mondino@1472966755:environment:production
   # (the exact subject is in the AADSTS700213 error of a failed login).
   # In Git Bash, prefix the next command with MSYS_NO_PATHCONV=1 or the scope is rewritten.
   az role assignment create --assignee <appId> --role "Website Contributor" \
     --scope /subscriptions/<subscription-id>/resourceGroups/mondino-rg
   ```

3. In GitHub, create the `production` environment and set these **variables** (not secrets;
   none of them is secret):

   | Variable | Value |
   | --- | --- |
   | `AZURE_CLIENT_ID` | the app registration's application (client) ID |
   | `AZURE_TENANT_ID` | the directory (tenant) ID |
   | `AZURE_SUBSCRIPTION_ID` | the subscription ID |
   | `AZURE_WEBAPP_NAME` | `<app-name>` |
   | `AZURE_POSTGRES_SERVER` | the database server's name, `<server-name>` (step 4) |

4. Create the database (ADR [0017](../adr/0017-azure-postgresql.md)). `infra/database.bicep`
   describes the server, its one database `mondino`, its Microsoft Entra administrator, its
   firewall and the role that lets the deployment open that firewall to its runner. Put this
   deployment's values in `infra/database.bicepparam`, then:

   ```sh
   az webapp identity assign -g mondino-rg -n <app-name>          # note principalId
   az webapp show -g mondino-rg -n <app-name> --query possibleOutboundIpAddresses -o tsv
   az deployment group create -g mondino-rg -f infra/database.bicep -p infra/database.bicepparam
   ```

   The server has no password: every connection signs in with a Microsoft Entra token. The
   administrator is a person, and is used only here and in an emergency. The template takes
   about three quarters of an hour: the server about ten minutes, then about a minute for each
   firewall rule, one at a time.

5. Create the two database roles, as the administrator, from a machine whose address the
   firewall allows for the length of this step:

   ```sh
   az postgres flexible-server firewall-rule create -g mondino-rg -n <server-name> \
     --rule-name setup --start-ip-address <your-address> --end-ip-address <your-address>
   export PGPASSWORD=$(az account get-access-token --resource-type oss-rdbms --query accessToken -o tsv)
   psql "host=<server-name>.postgres.database.azure.com dbname=postgres user=<administrator> sslmode=verify-full sslrootcert=system" \
     -v deploy_object_id=<object id of mondino-deploy's service principal> \
     -v app_object_id=<principalId from step 4> \
     -f infra/database-roles.sql
   ```

   `mondino_migrator` is the deployment and owns the tables; `mondino_app` is the App Service's
   identity and may only read and write rows.

6. Apply the migrations once by hand, as `mondino_migrator`, so the first deployment finds the
   schema in place, then take the record of migrations from the app's role and close the
   firewall again:

   ```sh
   cd backend
   Database__Provider=PostgreSQL Database__Authentication=AzureCli \
   ConnectionStrings__Mondino="Host=<server-name>.postgres.database.azure.com;Database=mondino;Username=<administrator>;Options=-c role=mondino_migrator" \
     dotnet run --project src/Mondino.Cli -- migrate
   psql "host=<server-name>.postgres.database.azure.com dbname=mondino user=<administrator> sslmode=verify-full sslrootcert=system" \
     -c 'REVOKE ALL ON TABLE "__EFMigrationsHistory" FROM mondino_app'
   az postgres flexible-server firewall-rule delete -g mondino-rg -n <server-name> --rule-name setup --yes
   ```

   On an empty database the migration logs one `fail:` line, a read of `__EFMigrationsHistory`
   before that table exists; EF Core then creates it. The command ends with "The database is at
   the latest migration." and exit code 0.

   **Never run `Mondino.Cli seed` against the deployed database.** The sample team's invite
   token is written in this repository, so anyone who reads it could join that team.

## Live

The app is `mondino-app-27660` in `mondino-rg` (canadacentral, Linux B1):
https://mondino-app-27660.azurewebsites.net

Its database is `mondino` on `mondino-pg-27660` in the same resource group (PostgreSQL 18,
Burstable `Standard_B1ms`, 32 GiB, backups kept 7 days).

## App settings

| Setting | Value | Why |
| --- | --- | --- |
| `ASPNETCORE_ENVIRONMENT` | `Production` | the default; set it only to override |
| `Database__Provider` | `PostgreSQL` | **set by the deployment**; `InMemory` keeps nothing between runs (ADR [0017](../adr/0017-azure-postgresql.md)) |
| `Database__Authentication` | `ManagedIdentity` | **set by the deployment**; the API signs in to the database as the App Service's own identity, with a Microsoft Entra token and no password. The other values are `AzureCli` (the deployment and an operator: whoever `az login` signed in) and `Password` (the default: the connection string carries what it needs, as on a laptop) |
| `ConnectionStrings__Mondino` | `Host=<server-name>.postgres.database.azure.com;Database=mondino;Username=mondino_app` | **set by the deployment**, from `AZURE_POSTGRES_SERVER`; it names the host, the database and the role and holds no password. With `ManagedIdentity` or `AzureCli` the API refuses to start if it holds one, and always verifies the server's certificate and name |
| `DataProtection__KeysPath` | `/home/data-protection-keys` | the key ring that protects the session cookie, kept on the App Service's shared, persistent `/home` so a restart or a second instance keeps teammates signed in (ADR [0008](../adr/0008-session-and-cross-site-requests.md)) |
| `EmailProtection__Key` | 32 random bytes, base64 (`openssl rand -base64 32`), as an App Service setting or a Key Vault reference | the secret key of the email fingerprint; Create Team fails until it is set, and it must never change once teams exist (ADR [0009](../adr/0009-making-a-team.md)) |
| `PostalCodeSource__Username` | the GeoNames account name ([register](https://www.geonames.org/login), then enable *Free Web Services* on the account page) | the postal code source's account; without it every lookup answers `Unavailable` and Join and Create Team offer "Your city" instead (ADR [0006](../adr/0006-postal-code-source.md)) |
| `ASPNETCORE_FORWARDEDHEADERS_ENABLED` | `true` | App Service's front end is a proxy: the rate limits count the client it saw (the last `X-Forwarded-For` entry), not the front end, and the request is known to be HTTPS (ADR [0010](../adr/0010-protecting-team-data.md)) |
| `SignInEmail__ServerToken` | the Postmark server token, as an App Service setting or a Key Vault reference | Sign In mails its links through Postmark; without it no mail leaves and Sign In still answers "Check your inbox" (ADR [0011](../adr/0011-signing-in-with-an-emailed-link.md)) |
| `SignInEmail__From` | a sender signature or verified domain in Postmark, for example `Mondino <signin@mondino.app>` | the sender of sign-in emails; without it no mail leaves (ADR [0011](../adr/0011-signing-in-with-an-emailed-link.md)) |
| `SignInEmail__AppAddress` | the app's own address, for example `https://mondino-app-27660.azurewebsites.net` | the start of every sign-in link; never taken from the request's `Host`, so a forged `Host` cannot send a teammate a link to another site (ADR [0011](../adr/0011-signing-in-with-an-emailed-link.md)) |
| `WeatherSource__BaseAddress` | `https://api.open-meteo.com/` (the default), or `https://customer-api.open-meteo.com/` with a commercial subscription | where the pins' weather is read from; Open-Meteo learns only a city's position, rounded (ADR [0015](../adr/0015-weather-source.md)) |
| `WeatherSource__ApiKey` | the Open-Meteo subscription's key, as an App Service setting or a Key Vault reference; none for the free API | the free API is for non-commercial use; without the key a commercial deployment must not call it (ADR [0015](../adr/0015-weather-source.md)) |

`EmailProtection__Key` and `PostalCodeSource__Username` are required: the deploy workflow checks
that both are set on the App Service (by name; it never reads a value) and refuses to deploy
until they are. Set them with:

```sh
az webapp config appsettings set -g mondino-rg -n <app-name> --settings \
  EmailProtection__Key="$(openssl rand -base64 32)" \
  PostalCodeSource__Username=<geonames-account>
```

## The database

**Migrations.** A deployment applies them itself (`Mondino.Cli migrate`, as `mondino_migrator`)
before it publishes. The version that is running serves while they run, so a migration only
adds what that version can ignore: a table, a nullable column, a column with a default.
Removing or renaming takes two releases: the first stops using it, the second removes it
(ADR [0017](../adr/0017-azure-postgresql.md)). To apply them by hand, allow your address through
the firewall and run the first command of step 6.

**A migration fails.** The deployment stops before publishing. Each migration runs in its own
transaction, so the schema is at the last one that succeeded, and the version that was running
is untouched. Fix the migration with EF Core's tools (`dotnet ef migrations …`), never by
editing a generated migration or the schema by hand, and push again.

**The new version is not ready.** The deployment fails when `/health/ready` does not answer
`Healthy` within 5 minutes: the app runs but cannot reach its database. Check that the App
Service's identity is on, that its outbound addresses are in the server's firewall
(`infra/database.bicepparam`; a change of the plan's tier can change them), and that
`mondino_app` exists with that identity's object id. To go back to the version before, run the
Deploy workflow by hand on the commit before; its migrations are already applied and are
compatible with it by the rule above.

**A firewall rule named `deploy-…` is left behind.** A deployment removes its runner's rule
even when it fails; if a cancelled run left one, remove it:

```sh
az postgres flexible-server firewall-rule delete -g mondino-rg -n <server-name> --rule-name <rule> --yes
```

**Restore.** The server keeps 7 days of backups. A restore makes a new server at a moment you
choose; the roles and their grants come with it, the firewall rules and the deployment's role
assignment do not:

```sh
az postgres flexible-server restore -g mondino-rg -n <new-server-name> \
  --source-server <server-name> --restore-time <UTC time, ISO 8601>
```

Set `serverName` in `infra/database.bicepparam` to the new server and deploy the template again
for its firewall and role assignment, set the GitHub variable `AZURE_POSTGRES_SERVER` to the new
name, and run the Deploy workflow by hand: it points the app at the new server. Delete the old
server once the app is ready on the new one.

