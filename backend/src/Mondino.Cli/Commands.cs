using Microsoft.Extensions.DependencyInjection;
using Mondino.Application.Persistence;

namespace Mondino.Cli;

/// <summary>
/// What an operator runs against a deployed system. The API applies no migration and no seed on
/// startup; these commands do.
/// </summary>
public static class Commands
{
    private const int Succeeded = 0;
    private const int Misused = 2;

    public static async Task<int> RunAsync(
        IReadOnlyList<string> args,
        IServiceProvider services,
        TextWriter output,
        CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(args);
        ArgumentNullException.ThrowIfNull(services);
        ArgumentNullException.ThrowIfNull(output);

        await using var scope = services.CreateAsyncScope();
        switch (args.Count == 1 ? args[0] : null)
        {
            case "migrate":
                var outcome = await scope.ServiceProvider
                    .GetRequiredService<IDatabaseMigrator>()
                    .MigrateAsync(cancellationToken);
                await output.WriteLineAsync(outcome == MigrationOutcome.Applied
                    ? "The database is at the latest migration."
                    : "This database keeps no schema; there was nothing to apply.");
                return Succeeded;

            case "seed":
                var database = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
                var steps = scope.ServiceProvider.GetServices<ISeedStep>().ToList();
                foreach (var step in steps)
                {
                    await step.SeedAsync(database, cancellationToken);
                }

                await database.SaveChangesAsync(cancellationToken);
                await output.WriteLineAsync($"Seeded: {steps.Count} step(s), each adding only what was missing.");
                return Succeeded;

            default:
                await output.WriteLineAsync("Usage: Mondino.Cli <command>");
                await output.WriteLineAsync("  migrate   apply the database's migrations");
                await output.WriteLineAsync("  seed      add the seed data that is missing");
                return Misused;
        }
    }
}
