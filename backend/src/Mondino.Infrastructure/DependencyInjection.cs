using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mondino.Application.Persistence;
using Mondino.Infrastructure.Persistence;

namespace Mondino.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// The database. <c>Database:Provider</c> names the engine; until the first journey that
    /// persists chooses one (docs/adr/0003), the only provider is <c>InMemory</c>, which keeps
    /// nothing between runs.
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var provider = configuration["Database:Provider"] ?? "InMemory";
        if (!string.Equals(provider, "InMemory", StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException(
                $"Database:Provider '{provider}' is not supported. The only provider is 'InMemory' until a database engine is chosen.");
        }

        var name = configuration["Database:Name"] ?? "mondino";
        services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(name));
        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());
        services.AddScoped<IDatabaseMigrator, DatabaseMigrator>();
        return services;
    }
}
