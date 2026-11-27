using Microsoft.Extensions.Diagnostics.HealthChecks;
using Mondino.Application.Persistence;

namespace Mondino.Api.Health;

/// <summary>
/// Ready when the database can be reached (L2-051, L2-057). The result carries no description
/// and no error, so nothing the database said reaches the answer or a log.
/// </summary>
internal sealed class DatabaseReadyCheck(IAppDbContext database) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default)
    {
        try
        {
            return await database.CanConnectAsync(cancellationToken)
                ? HealthCheckResult.Healthy()
                : HealthCheckResult.Unhealthy();
        }
#pragma warning disable CA1031 // Whatever kept the database from answering, the backend is not ready.
        catch (Exception)
#pragma warning restore CA1031
        {
            return HealthCheckResult.Unhealthy();
        }
    }
}
