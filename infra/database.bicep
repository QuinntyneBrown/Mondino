// The deployed Mondino database (docs/adr/0017-azure-postgresql.md):
// one Azure Database for PostgreSQL Flexible Server with one database, Microsoft Entra
// authentication only, a firewall that allows the App Service's outbound addresses, and the
// role that lets the deployment open that firewall to its runner for the length of a migration.
//
//   az deployment group create -g mondino-rg -f infra/database.bicep -p infra/database.bicepparam
//
// The database roles are not Azure resources: infra/database-roles.sql makes them.

@description('The server\'s name. Its address is <name>.postgres.database.azure.com.')
param serverName string

@description('Where the server runs: beside the App Service.')
param location string = resourceGroup().location

@description('The PostgreSQL major version.')
param postgresVersion string = '18'

@description('The object id of the Microsoft Entra administrator: a person, for setup and emergencies only.')
param administratorObjectId string

@description('The administrator\'s user principal name, which is also their PostgreSQL user name.')
param administratorPrincipalName string

@description('The App Service\'s possible outbound addresses (az webapp show --query possibleOutboundIpAddresses).')
param appOutboundAddresses string[]

@description('The object id of the deployment\'s service principal (mondino-deploy).')
param deployPrincipalObjectId string

resource server 'Microsoft.DBforPostgreSQL/flexibleServers@2025-08-01' = {
  name: serverName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: postgresVersion
    storage: {
      storageSizeGB: 32
      autoGrow: 'Disabled'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
    // No password exists: a connection presents a Microsoft Entra token.
    authConfig: {
      activeDirectoryAuth: 'Enabled'
      passwordAuth: 'Disabled'
      tenantId: subscription().tenantId
    }
  }
}

resource administrator 'Microsoft.DBforPostgreSQL/flexibleServers/administrators@2025-08-01' = {
  parent: server
  name: administratorObjectId
  properties: {
    principalName: administratorPrincipalName
    principalType: 'User'
    tenantId: subscription().tenantId
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2025-08-01' = {
  parent: server
  name: 'mondino'
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
  dependsOn: [
    administrator
  ]
}

// One rule per address, one at a time: the server takes one change at once. There is no rule for
// 0.0.0.0, so "Allow public access from any Azure service" stays off.
@batchSize(1)
resource appFirewallRules 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2025-08-01' = [
  for address in appOutboundAddresses: {
    parent: server
    name: 'app-service-${replace(address, '.', '-')}'
    properties: {
      startIpAddress: address
      endIpAddress: address
    }
    dependsOn: [
      database
    ]
  }
]

// What the deployment may do to the server: see it, and write and delete firewall rules, so its
// runner can reach the database while Mondino.Cli migrate runs. Nothing else, and nowhere else.
resource firewallRole 'Microsoft.Authorization/roleDefinitions@2022-04-01' = {
  name: guid(resourceGroup().id, 'mondino-deploy-database-firewall')
  properties: {
    roleName: 'Mondino deployment: database firewall'
    description: 'Read the Mondino database server and write and delete its firewall rules.'
    type: 'CustomRole'
    assignableScopes: [
      resourceGroup().id
    ]
    permissions: [
      {
        actions: [
          'Microsoft.DBforPostgreSQL/flexibleServers/read'
          'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules/read'
          'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules/write'
          'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules/delete'
        ]
      }
    ]
  }
}

resource firewallRoleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  scope: server
  name: guid(server.id, deployPrincipalObjectId, firewallRole.id)
  properties: {
    roleDefinitionId: firewallRole.id
    principalId: deployPrincipalObjectId
    principalType: 'ServicePrincipal'
  }
}

@description('The host the app and the deployment connect to.')
output host string = server.properties.fullyQualifiedDomainName
