using Microsoft.AspNetCore.Diagnostics.HealthChecks;

namespace Mondino.Api.Health;

/// <summary>
/// The health endpoints (L2-051). Each answers one word as plain text, never cached, to anyone:
/// no configuration, no versions and no teammate data.
/// </summary>
internal static class HealthEndpoints
{
    private const string Ready = "ready";

    public static IServiceCollection AddMondinoHealth(this IServiceCollection services)
    {
        services.AddHealthChecks().AddCheck<DatabaseReadyCheck>("database", tags: [Ready]);
        return services;
    }

    public static void MapMondinoHealth(this IEndpointRouteBuilder app)
    {
        // Liveness: the process is running. It checks nothing else, so it never fails with a dependency.
        app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false }).AllowAnonymous();

        // Readiness: the database can be reached. 200 "Healthy", or 503 "Unhealthy".
        app.MapHealthChecks("/health/ready", new HealthCheckOptions { Predicate = check => check.Tags.Contains(Ready) }).AllowAnonymous();
    }
}
