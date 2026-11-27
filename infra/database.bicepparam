// The values of the live Mondino database (docs/deployment/README.md). None of them is a secret.
using 'database.bicep'

param serverName = 'mondino-pg-27660'

// The product owner's account: the server's Microsoft Entra administrator.
param administratorObjectId = '3ebe2b61-d64e-4a56-9ea2-e73e1b0fe6d8'
param administratorPrincipalName = 'quinntyne_hotmail.com#EXT#@quinntynehotmail.onmicrosoft.com'

// mondino-deploy, the app registration the deployment signs in as.
param deployPrincipalObjectId = '1cf01a9d-0c28-43af-baa8-80d78be01d43'

// az webapp show -g mondino-rg -n mondino-app-27660 --query possibleOutboundIpAddresses -o tsv
param appOutboundAddresses = [
  '4.173.227.190'
  '4.174.194.20'
  '4.204.145.190'
  '4.204.174.6'
  '4.229.152.186'
  '4.229.161.56'
  '4.229.161.98'
  '4.229.169.12'
  '4.229.169.120'
  '4.229.169.172'
  '4.229.169.178'
  '4.229.180.38'
  '4.229.180.87'
  '4.229.205.182'
  '4.239.150.59'
  '4.239.186.214'
  '4.239.187.203'
  '4.239.193.125'
  '4.248.200.97'
  '4.248.219.196'
  '4.248.220.74'
  '4.248.221.114'
  '20.116.42.9'
  '20.175.214.180'
  '20.175.254.187'
  '52.237.59.106'
  '130.107.40.232'
  '130.107.158.238'
  '130.107.159.46'
  '130.107.177.121'
  '130.107.178.32'
]
