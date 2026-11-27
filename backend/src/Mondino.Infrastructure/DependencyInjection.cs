using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mondino.Application.Cities;
using Mondino.Application.Joining;
using Mondino.Application.Persistence;
using Mondino.Application.SignIn;
using Mondino.Application.Teammates;
using Mondino.Application.Teams;
using Mondino.Infrastructure.Cities;
using Mondino.Infrastructure.Persistence;
using Mondino.Infrastructure.Persistence.Seeds;
using Mondino.Infrastructure.PostalCodes;
using Mondino.Infrastructure.SignIn;
using Mondino.Infrastructure.Teammates;
using Mondino.Infrastructure.Teams;
using Mondino.Infrastructure.WeatherSource;
using Npgsql;

namespace Mondino.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// The database, the seed, who is asking and their session (docs/adr/0008), the cities, the postal code source, the invite tokens, the email fingerprint (<c>EmailProtection:Key</c>), the sign-in links and the Email source (<c>SignInEmail:*</c>, docs/adr/0011)
    /// (<c>PostalCodeSource:*</c>, docs/adr/0006). <c>Database:Provider</c> names the engine
    /// (docs/adr/0004): <c>PostgreSQL</c>, with the connection string <c>ConnectionStrings:Mondino</c>
    /// and, deployed, <c>Database:Authentication</c> for a connection without a password
    /// (docs/adr/0017), or <c>InMemory</c>, which keeps nothing between runs.
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        ArgumentNullException.ThrowIfNull(configuration);

        var provider = configuration["Database:Provider"] ?? "InMemory";
        if (string.Equals(provider, "PostgreSQL", StringComparison.OrdinalIgnoreCase))
        {
            // Checked now, so a wrong setting stops the process at startup; connected to only when used.
            // A transient failure is retried by the provider's own strategy (docs/adr/0017).
            var connection = DatabaseConnection.Read(configuration);
            services.AddSingleton(_ => connection.CreateDataSource());
            services.AddDbContext<AppDbContext>((provider, options) => options.UseNpgsql(
                provider.GetRequiredService<NpgsqlDataSource>(),
                npgsql => npgsql.EnableRetryOnFailure()));
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

        // The weather source behind its timeout and cache (<c>WeatherSource:*</c>, docs/adr/0015).
        // Its client logs nothing: its address carries a city's position.
        services.Configure<WeatherSourceOptions>(configuration.GetSection(WeatherSourceOptions.Section));
        services.AddHttpClient(OpenMeteoWeatherSource.ClientName, client => client.Timeout = Timeout.InfiniteTimeSpan)
            .RemoveAllLoggers();
        services.AddSingleton<OpenMeteoWeatherSource>();
        services.AddSingleton<IWeatherSource, CachedWeatherSource>();

        // A new team's invite token, and the keyed fingerprint its maker's email is kept as
        // (<c>EmailProtection:Key</c>, docs/adr/0009).
        services.AddSingleton<IInviteTokens, InviteTokens>();
        services.AddSingleton<IEmailFingerprints, HmacEmailFingerprints>();

        // Sign-in links: their tokens, and the outbox their mails leave through
        // (<c>SignInEmail:*</c>, docs/adr/0011).
        services.Configure<SignInLinkOptions>(configuration.GetSection(SignInLinkOptions.Section));
        services.AddSingleton<ISignInTokens, SignInTokens>();
        services.AddSingleton<SignInMailOutbox>();
        services.AddSingleton<ISignInMailOutbox>(provider => provider.GetRequiredService<SignInMailOutbox>());
        services.Configure<SignInEmailOptions>(configuration.GetSection(SignInEmailOptions.Section));
        services.AddHttpClient(PostmarkSignInEmailSender.ClientName, client => client.Timeout = Timeout.InfiniteTimeSpan)
            .RemoveAllLoggers();
        services.AddSingleton<ISignInEmailSender, PostmarkSignInEmailSender>();
        services.AddHostedService<SignInMailDispatcher>();

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentTeammate, CurrentTeammate>();
        services.AddTeammateSessions(configuration);
        return services;
    }
}
