# Deployment

Every commit to `main` deploys to Azure once CI passes on it (`.github/workflows/deploy.yml`,
ADR [0004](../adr/0004-azure-hosting.md)). It can also be run by hand from the Actions tab.

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

## Live

The app is `mondino-app-27660` in `mondino-rg` (canadacentral, Linux B1):
https://mondino-app-27660.azurewebsites.net

## App settings

| Setting | Value | Why |
| --- | --- | --- |
| `ASPNETCORE_ENVIRONMENT` | `Production` | the default; set it only to override |
| `Database__Provider` | `InMemory` | the only value accepted until journey 2 chooses an engine |
| `DataProtection__KeysPath` | `/home/data-protection-keys` | the key ring that protects the session cookie, kept on the App Service's shared, persistent `/home` so a restart or a second instance keeps teammates signed in (ADR [0008](../adr/0008-session-and-cross-site-requests.md)) |
