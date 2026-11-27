using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mondino.Application.Persistence;
using Mondino.Application.Teammates;
using Mondino.Infrastructure.Persistence;
using Mondino.Infrastructure.Persistence.Seeds;
using Mondino.Infrastructure.Teammates;

namespace Mondino.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// The database, the seed and who is asking. <c>Database:Provider</c> names the engine
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

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentTeammate, CurrentTeammate>();
        return services;
    }
}
