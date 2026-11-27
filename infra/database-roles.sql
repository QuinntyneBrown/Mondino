-- The two database roles of the deployed Mondino (docs/adr/0017-azure-postgresql.md), each mapped
-- to a Microsoft Entra identity by its object id. Neither has a password.
--
--   mondino_migrator   the deployment (mondino-deploy's service principal): creates and changes
--                      the tables, and owns them
--   mondino_app        the App Service's managed identity: reads and writes rows, nothing else
--
-- Run once, as the server's Microsoft Entra administrator, connected to the database "postgres":
--
--   export PGPASSWORD=$(az account get-access-token --resource-type oss-rdbms --query accessToken -o tsv)
--   psql "host=<server>.postgres.database.azure.com dbname=postgres user=<administrator> sslmode=verify-full sslrootcert=system" \
--     -v deploy_object_id=<object id of mondino-deploy's service principal> \
--     -v app_object_id=<principal id of the App Service's managed identity> \
--     -f infra/database-roles.sql

\set ON_ERROR_STOP on
\set migrator_label 'aadauth,oid=' :deploy_object_id ',type=service'
\set app_label 'aadauth,oid=' :app_object_id ',type=service'

-- The roles. The label is what lets a Microsoft Entra token for that object id sign in as the role.
CREATE ROLE mondino_migrator LOGIN;
SECURITY LABEL FOR "pgaadauth" ON ROLE mondino_migrator IS :'migrator_label';
CREATE ROLE mondino_app LOGIN;
SECURITY LABEL FOR "pgaadauth" ON ROLE mondino_app IS :'app_label';

-- The administrator may act as mondino_migrator (SET ROLE), so an operator can apply the
-- migrations by hand and the tables still have one owner.
GRANT mondino_migrator TO CURRENT_USER;

\connect mondino

-- Nobody reaches the database or its schema by default.
REVOKE ALL ON DATABASE mondino FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT CONNECT ON DATABASE mondino TO mondino_migrator, mondino_app;

-- mondino_migrator makes the tables; mondino_app only uses them.
GRANT USAGE, CREATE ON SCHEMA public TO mondino_migrator;
GRANT USAGE ON SCHEMA public TO mondino_app;

-- Every table and sequence mondino_migrator makes from now on is usable by mondino_app, so a new
-- migration needs no new grant.
ALTER DEFAULT PRIVILEGES FOR ROLE mondino_migrator IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO mondino_app;
ALTER DEFAULT PRIVILEGES FOR ROLE mondino_migrator IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO mondino_app;

-- After the first migration, the record of which migrations ran is taken from mondino_app, which
-- has no use for it (docs/deployment/README.md):
--
--   REVOKE ALL ON TABLE "__EFMigrationsHistory" FROM mondino_app;
