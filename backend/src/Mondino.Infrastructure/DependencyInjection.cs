using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mondino.Application.Cities;
using Mondino.Application.Joining;
using Mondino.Application.Persistence;
using Mondino.Application.Teammates;
using Mondino.Infrastructure.Cities;
using Mondino.Infrastructure.Persistence;
using Mondino.Infrastructure.Persistence.Seeds;
using Mondino.Infrastructure.PostalCodes;
using Mondino.Infrastructure.Teammates;

namespace Mondino.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// The database, the seed, who is asking and their session (docs/adr/0008), the cities and the postal code source
    /// (<c>PostalCodeSource:*</c>, docs/adr/0006). <c>Database:Provider</c> names the engine
    /// (docs/adr/0004): <c>PostgreSQL</c>, with the connection string <c>ConnectionStrings:Mondino</c>,
    /// or <c>InMemory</c>, which keeps nothing between runs.
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var provider = configuration["Database:Provider"] ?? "InMemory";
        if (string.Equals(provider, "PostgreSQL", StringComparison.OrdinalIgnoreCase))
        {
            var connectionString = configuration.GetConnectionString("Mondino");
            if (string.IsNullOrWhiteSpace(connectionString))
            {
                throw new InvalidOperationException(
                    "Database:Provider 'PostgreSQL' needs the connection string ConnectionStrings:Mondino.");
            }

            services.AddDbContext<AppDbContext>(options => options.UseNpgsql(connectionString));
        }
        else if (string.Equals(provider, "InMemory", StringComparison.OrdinalIgnoreCase))
        {
            var name = configuration["Database:Name"] ?? "mondino";
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(name));
        }
        else
        {
            throw new InvalidOperationException(
                $"Database:Provider '{provider}' is not supported. Use 'PostgreSQL' or 'InMemory'.");
        }

        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());
        services.AddScoped<IDatabaseMigrator, DatabaseMigrator>();
        services.AddScoped<ISeedStep, NorthwindSeed>();

        // The cities Mondino holds, and the postal code source behind its timeout, cache and
        // breaker (docs/adr/0006). The source's client logs nothing: its address carries the postal code.
        services.AddSingleton<ICityDirectory, BundledCityDirectory>();
        services.AddSingleton<PostalCodeCityResolver>();
        services.Configure<PostalCodeSourceOptions>(configuration.GetSection(PostalCodeSourceOptions.Section));
        services.AddHttpClient(GeoNamesPostalCodeLookup.ClientName, client => client.Timeout = Timeout.InfiniteTimeSpan)
            .RemoveAllLoggers();
        services.AddSingleton<GeoNamesPostalCodeLookup>();
        services.AddSingleton<IPostalCodeLookup, CachedPostalCodeLookup>();

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentTeammate, CurrentTeammate>();
        services.AddTeammateSessions(configuration);
        return services;
    }
}
