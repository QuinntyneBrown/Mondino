using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;
using Mondino.Application.Persistence;

namespace Mondino.Tests.Support;

/// <summary>
/// The API as an acceptance test sees it: in memory, with one EF Core InMemory store per
/// fixture, a clock the test moves, and fakes for everything outside. No real database, no
/// network and no sleeping.
/// </summary>
public class MondinoApi : WebApplicationFactory<Program>
{
    /// <summary>The mocks' "now": Monday 27 October 2025, 14:05 UTC.</summary>
    public static readonly DateTimeOffset Now = new(2025, 10, 27, 14, 5, 0, TimeSpan.Zero);

    public FakeTimeProvider Time { get; } = new(Now);

    public SpyDatabaseMigrator Migrator { get; } = new();

    /// <summary>Set before the first request to make every use of the database fail.</summary>
    public bool DatabaseFails { get; set; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Database:Provider", "InMemory");
        builder.UseSetting("Database:Name", $"mondino-tests-{Guid.NewGuid():N}");

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Time);

            services.RemoveAll<IDatabaseMigrator>();
            services.AddSingleton<IDatabaseMigrator>(Migrator);

            if (DatabaseFails)
            {
                services.RemoveAll<IAppDbContext>();
                services.AddScoped<IAppDbContext, FailingAppDbContext>();
            }

            // Endpoints that exist only so a test can see how the API answers a failure.
            services.AddControllers().AddApplicationPart(typeof(MondinoApi).Assembly);
        });
    }
}
