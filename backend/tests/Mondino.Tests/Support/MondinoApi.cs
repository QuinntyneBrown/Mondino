using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Time.Testing;
using Mondino.Application.Joining;
using Mondino.Application.Persistence;
using Mondino.Application.SignIn;
using Mondino.Application.Teammates;
using Mondino.Application.Teams;
using Mondino.Domain.Teams;
using Mondino.Infrastructure.Persistence;
using Mondino.Infrastructure.PostalCodes;
using Mondino.Infrastructure.SignIn;
using Mondino.Infrastructure.WeatherSource;

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

    /// <summary>Who the API takes the browser to be: no one, until a test signs a teammate in.</summary>
    public FakeCurrentTeammate CurrentTeammate { get; } = new();

    /// <summary>The postal code lookup, answering as the test tells it.</summary>
    public FakePostalCodeLookup PostalCodes { get; } = new();

    /// <summary>
    /// The outside postal code service. Set <see cref="UsesPostalCodeSource"/> before the first
    /// request to run the real lookup, with its city directory, cache and breaker, against it.
    /// </summary>
    public FakePostalCodeSource PostalCodeSource { get; } = new();

    public bool UsesPostalCodeSource { get; set; }

    /// <summary>The weather source, answering as the test tells it: nothing, until told.</summary>
    public FakeWeatherSource Weather { get; } = new();

    /// <summary>
    /// The outside weather service. Set <see cref="UsesWeatherSource"/> before the first request to
    /// run the real weather source, with its cache and timeout, against it.
    /// </summary>
    public FakeOpenMeteo OpenMeteo { get; } = new();

    public bool UsesWeatherSource { get; set; }

    /// <summary>Set before the first request to serve <c>TestApp</c>, a stand-in for the Angular build, as wwwroot.</summary>
    public bool ServesApp { get; set; }

    /// <summary>The changes the test-only session endpoint was asked to make.</summary>
    public TestOnlyChanges Changes { get; } = new();

    /// <summary>The GeoNames account the real lookup is configured with; null leaves it unset.</summary>
    public string? PostalCodeSourceUsername { get; set; } = "mondino-tests";

    /// <summary>The key of the email fingerprint (<c>EmailProtection:Key</c>); null leaves it unset.</summary>
    public string? EmailKey { get; set; } = Convert.ToBase64String(new byte[32]);

    /// <summary>The outbox sign-in mails leave through, recording each one instead of sending it.</summary>
    public FakeSignInMailOutbox SignInMails { get; } = new();

    /// <summary>
    /// The outside Email source. Set <see cref="UsesEmailSource"/> before the first request to send
    /// sign-in mails for real, through the outbox and the Postmark sender, to it.
    /// </summary>
    public FakeEmailSource EmailSource { get; } = new();

    public bool UsesEmailSource { get; set; }

    /// <summary>The Postmark server token the Email source is called with; null leaves it unset.</summary>
    public string? EmailServerToken { get; set; } = "postmark-test-token";

    /// <summary>The app's own address, the start of every sign-in link (<c>SignInEmail:AppAddress</c>).</summary>
    public const string AppAddress = "https://mondino.test";

    /// <summary>Every log line, at every level, once <see cref="CapturesLogs"/> is set before the first request.</summary>
    public CapturedLogs Logs { get; } = new();

    public bool CapturesLogs { get; set; }

    /// <summary>Set before the first request to make every use of the database fail.</summary>
    public bool DatabaseFails { get; set; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseSetting("Database:Provider", "InMemory");
        builder.UseSetting("Database:Name", $"mondino-tests-{Guid.NewGuid():N}");

        if (ServesApp)
        {
            builder.UseWebRoot(Path.Combine(AppContext.BaseDirectory, "TestApp"));
        }

        if (EmailKey is not null)
        {
            builder.UseSetting("EmailProtection:Key", EmailKey);
        }

        builder.UseSetting("SignInEmail:AppAddress", AppAddress);
        builder.UseSetting("SignInEmail:From", "Mondino <signin@mondino.test>");
        if (EmailServerToken is not null)
        {
            builder.UseSetting("SignInEmail:ServerToken", EmailServerToken);
        }

        if (UsesPostalCodeSource && PostalCodeSourceUsername is not null)
        {
            builder.UseSetting("PostalCodeSource:Username", PostalCodeSourceUsername);
        }

        if (CapturesLogs)
        {
            builder.ConfigureLogging(logging => logging.SetMinimumLevel(LogLevel.Trace).AddProvider(Logs).AddFilter<CapturedLogs>(null, LogLevel.Trace));
        }

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Time);

            services.RemoveAll<IDatabaseMigrator>();
            services.AddSingleton<IDatabaseMigrator>(Migrator);

            // A teammate the test signs in stands in for the session; otherwise the session
            // cookie the API issued is read as the API reads it.
            var session = services.Single(service => service.ServiceType == typeof(ICurrentTeammate));
            services.Remove(session);
            services.AddScoped<ICurrentTeammate>(provider => CurrentTeammate.IsAuthenticated
                ? CurrentTeammate
                : (ICurrentTeammate)ActivatorUtilities.CreateInstance(provider, session.ImplementationType!));

            if (UsesPostalCodeSource)
            {
                services.AddHttpClient(GeoNamesPostalCodeLookup.ClientName)
                    .ConfigurePrimaryHttpMessageHandler(() => PostalCodeSource);
            }
            else
            {
                services.RemoveAll<IPostalCodeLookup>();
                services.AddSingleton<IPostalCodeLookup>(PostalCodes);
            }

            if (UsesWeatherSource)
            {
                services.AddHttpClient(OpenMeteoWeatherSource.ClientName)
                    .ConfigurePrimaryHttpMessageHandler(() => OpenMeteo);
            }
            else
            {
                services.RemoveAll<IWeatherSource>();
                services.AddSingleton<IWeatherSource>(Weather);
            }

            if (UsesEmailSource)
            {
                services.AddHttpClient(PostmarkSignInEmailSender.ClientName)
                    .ConfigurePrimaryHttpMessageHandler(() => EmailSource);
            }
            else
            {
                services.RemoveAll<ISignInMailOutbox>();
                services.AddSingleton<ISignInMailOutbox>(SignInMails);
            }

            if (DatabaseFails)
            {
                services.RemoveAll<IAppDbContext>();
                services.AddScoped<IAppDbContext, FailingAppDbContext>();
            }

            services.AddSingleton(Changes);

            // Endpoints that exist only so a test can see how the API answers a failure.
            services.AddControllers().AddApplicationPart(typeof(MondinoApi).Assembly);
        });
    }

    /// <summary>Runs the seed, as `Mondino.Cli seed` does: Northwind and its twelve teammates.</summary>
    public async Task SeedAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        foreach (var step in scope.ServiceProvider.GetServices<ISeedStep>())
        {
            await step.SeedAsync(database, CancellationToken.None);
        }

        await database.SaveChangesAsync(CancellationToken.None);
    }

    /// <summary>
    /// A browser at https://localhost that keeps the cookies it is given, as a browser keeps the
    /// session cookie, which is sent only over HTTPS.
    /// </summary>
    public HttpClient CreateSecureClient() =>
        CreateClient(new WebApplicationFactoryClientOptions { BaseAddress = new Uri("https://localhost") });

    /// <summary>How many teams are stored.</summary>
    public async Task<int> TeamCountAsync()
    {
        await using var scope = Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        return await database.Teams.CountAsync();
    }

    /// <summary>How many teammates the team of the invite token has, as stored.</summary>
    public async Task<int> TeammateCountAsync(string inviteToken)
    {
        await using var scope = Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        var team = await database.Teams.AsNoTracking().SingleAsync(t => t.InviteToken == inviteToken);
        return await database.Teammates.CountAsync(t => t.TeamId == team.Id);
    }

    /// <summary>Adds made-up teammates at the team's first city until it has <paramref name="count"/>.</summary>
    public async Task FillTeamAsync(string inviteToken, int count)
    {
        await using var scope = Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        var team = await database.Teams.Include(t => t.Teammates).ThenInclude(t => t.City).SingleAsync(t => t.InviteToken == inviteToken);
        var city = team.Teammates[0].City;
        for (var i = team.Teammates.Count; i < count; i++)
        {
            team.Add(Guid.NewGuid(), $"Teammate {i}", "teammate-1", city, Now.AddMinutes(-i));
        }

        await database.SaveChangesAsync(CancellationToken.None);
    }

    /// <summary>Gives a teammate another postal code, as stored, keeping their city.</summary>
    public async Task MoveTeammateAsync(Guid teammateId, string postalCode)
    {
        await using var scope = Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var teammate = await database.Teammates.SingleAsync(t => t.Id == teammateId);
        database.Entry(teammate).Property(t => t.PostalCode).CurrentValue = postalCode;
        await database.SaveChangesAsync(CancellationToken.None);
    }

    /// <summary>Turns off a teammate's "Share whether I’m working or asleep", as stored (journey 23 adds the switch).</summary>
    public async Task HideStatusAsync(Guid teammateId)
    {
        await using var scope = Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var teammate = await database.Teammates.SingleAsync(t => t.Id == teammateId);
        database.Entry(teammate).Property(t => t.SharesStatus).CurrentValue = false;
        await database.SaveChangesAsync(CancellationToken.None);
    }

    /// <summary>Turns off a teammate's "Share my local weather", as stored (journey 23 adds the switch).</summary>
    public async Task HideWeatherAsync(Guid teammateId)
    {
        await using var scope = Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var teammate = await database.Teammates.SingleAsync(t => t.Id == teammateId);
        database.Entry(teammate).Property(t => t.SharesWeather).CurrentValue = false;
        await database.SaveChangesAsync(CancellationToken.None);
    }

    /// <summary>The id of the team of the invite token.</summary>
    public async Task<Guid> TeamIdAsync(string inviteToken)
    {
        await using var scope = Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        return await database.Teams.Where(t => t.InviteToken == inviteToken).Select(t => t.Id).SingleAsync();
    }

    /// <summary>A teammate as stored, with their city.</summary>
    public async Task<Teammate> TeammateAsync(Guid teammateId)
    {
        await using var scope = Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        return await database.Teammates.AsNoTracking().Include(t => t.City).SingleAsync(t => t.Id == teammateId);
    }

    /// <summary>Takes a teammate out of their team, as leaving does (journey 24).</summary>
    public async Task RemoveTeammateAsync(Guid teammateId)
    {
        await using var scope = Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        database.Teammates.Remove(await database.Teammates.SingleAsync(t => t.Id == teammateId));
        await database.SaveChangesAsync(CancellationToken.None);
    }

    /// <summary>Makes the browser's session one of the team's teammates: the one who joined first.</summary>
    public async Task SignInAsTeammateOfAsync(string inviteToken)
    {
        await using var scope = Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<IAppDbContext>();
        var team = await database.Teams.Include(t => t.Teammates).SingleAsync(t => t.InviteToken == inviteToken);
        CurrentTeammate.TeamId = team.Id;
        CurrentTeammate.TeammateId = team.Teammates.OrderBy(t => t.JoinedAt).First().Id;
    }

    /// <summary>Makes the browser's session a teammate of a team that is not the one asked about.</summary>
    public void SignInAsTeammateOfAnotherTeam()
    {
        CurrentTeammate.TeamId = Guid.NewGuid();
        CurrentTeammate.TeammateId = Guid.NewGuid();
    }
}
