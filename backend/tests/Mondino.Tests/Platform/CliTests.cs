// Acceptance Test
// Traces to: L2-051
// Description: Migrations and seed data are applied by a CLI command, never by the API on startup

using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Mondino.Application.Persistence;
using Mondino.Cli;
using Mondino.Domain.Teams;
using Mondino.Tests.Support;

namespace Mondino.Tests.Platform;

public sealed class CliTests
{
    private static ServiceProvider Services(SpyDatabaseMigrator migrator, params ISeedStep[] steps)
    {
        var services = new ServiceCollection();
        services.AddSingleton<IDatabaseMigrator>(migrator);
        services.AddScoped<IAppDbContext, CountingAppDbContext>();
        foreach (var step in steps)
        {
            services.AddSingleton(step);
        }

        return services.BuildServiceProvider();
    }

    [Fact]
    public async Task Migrate_applies_the_migrations_once()
    {
        // Given the CLI
        var migrator = new SpyDatabaseMigrator();
        await using var services = Services(migrator);
        using var output = new StringWriter();

        // When "migrate" is run
        var exitCode = await Commands.RunAsync(["migrate"], services, output, CancellationToken.None);

        // Then the migrations were applied once and the command succeeded
        Assert.Equal(0, exitCode);
        Assert.Equal(1, migrator.Calls);
    }

    [Fact]
    public async Task Seed_run_twice_leaves_what_the_first_run_left()
    {
        // Given a seed step that adds its row only when it is missing
        var step = new OnceSeedStep();
        await using var services = Services(new SpyDatabaseMigrator(), step);
        using var output = new StringWriter();

        // When "seed" is run twice
        var first = await Commands.RunAsync(["seed"], services, output, CancellationToken.None);
        var second = await Commands.RunAsync(["seed"], services, output, CancellationToken.None);

        // Then both runs succeed and the row is there once
        Assert.Equal(0, first);
        Assert.Equal(0, second);
        Assert.Equal(2, step.Runs);
        Assert.Equal(1, step.Rows);
    }

    [Theory]
    [InlineData]
    [InlineData("drop")]
    public async Task An_unknown_command_changes_nothing_and_says_what_can_be_run(params string[] args)
    {
        // Given the CLI
        var migrator = new SpyDatabaseMigrator();
        await using var services = Services(migrator);
        using var output = new StringWriter();

        // When it is run with no command, or one it does not have
        var exitCode = await Commands.RunAsync(args, services, output, CancellationToken.None);

        // Then it fails, names the commands, and applies nothing
        Assert.Equal(2, exitCode);
        Assert.Contains("migrate", output.ToString(), StringComparison.Ordinal);
        Assert.Contains("seed", output.ToString(), StringComparison.Ordinal);
        Assert.Equal(0, migrator.Calls);
    }

    private sealed class CountingAppDbContext : IAppDbContext
    {
        public DbSet<Team> Teams => throw new NotSupportedException();

        public DbSet<Teammate> Teammates => throw new NotSupportedException();

        public DbSet<City> Cities => throw new NotSupportedException();

        public DbSet<Mondino.Domain.SignIn.SignInLink> SignInLinks => throw new NotSupportedException();

        public Task<int> SaveChangesAsync(CancellationToken cancellationToken) => Task.FromResult(0);

        public Task<bool> CanConnectAsync(CancellationToken cancellationToken) => Task.FromResult(true);
    }

    private sealed class OnceSeedStep : ISeedStep
    {
        public int Runs { get; private set; }

        public int Rows { get; private set; }

        public Task SeedAsync(IAppDbContext database, CancellationToken cancellationToken)
        {
            Runs++;
            if (Rows == 0)
            {
                Rows++;
            }

            return Task.CompletedTask;
        }
    }
}
