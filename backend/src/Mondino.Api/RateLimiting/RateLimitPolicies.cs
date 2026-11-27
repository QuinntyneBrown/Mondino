using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Mondino.Application.Errors;
using Mondino.Infrastructure.Teammates;

namespace Mondino.Api.RateLimiting;

/// <summary>
/// The limits on what is open to anyone (L2-045). Each is counted for one client, by its address.
/// Making a team is the one open request with no limit (docs/adr/0016). A teammate's own lookup is
/// counted for the teammate instead (docs/adr/0022).
/// Over a limit the request is refused with 429, a <c>Retry-After</c> header and the code
/// <c>rate_limited</c>, before any handler runs.
/// </summary>
internal static class RateLimitPolicies
{
    /// <summary>Opening an invite link: 30 a minute, so invite links cannot be guessed at speed.</summary>
    public const string Invite = "invite";

    /// <summary>Looking a postal code up: 10 a minute, before any outside source is asked.</summary>
    public const string Lookup = "lookup";

    /// <summary>
    /// A teammate looking a new postal code up on Profile &amp; Settings: 10 a minute, counted for the
    /// teammate the session names, on whatever device (docs/adr/0022).
    /// </summary>
    public const string OwnLookup = "own-lookup";

    /// <summary>Searching the cities for "Your city": 30 a minute, as the person types.</summary>
    public const string CitySearch = "city-search";

    /// <summary>Joining a team: 5 a minute.</summary>
    public const string Join = "join";

    /// <summary>Asking for a sign-in link: 5 in 15 minutes.</summary>
    public const string SignInLink = "sign-in-link";

    /// <summary>Opening a sign-in link: 10 a minute, so sign-in links cannot be guessed at speed.</summary>
    public const string SignInRedemption = "sign-in-redemption";

    public static IServiceCollection AddRateLimitPolicies(this IServiceCollection services) =>
        services.AddRateLimiter(options =>
        {
            options.AddPolicy(Invite, context => PerClient(context, permits: 30, window: TimeSpan.FromMinutes(1)));
            options.AddPolicy(Lookup, context => PerClient(context, permits: 10, window: TimeSpan.FromMinutes(1)));
            options.AddPolicy(OwnLookup, context => PerTeammate(context, permits: 10, window: TimeSpan.FromMinutes(1)));
            options.AddPolicy(CitySearch, context => PerClient(context, permits: 30, window: TimeSpan.FromMinutes(1)));
            options.AddPolicy(Join, context => PerClient(context, permits: 5, window: TimeSpan.FromMinutes(1)));
            options.AddPolicy(SignInLink, context => PerClient(context, permits: 5, window: TimeSpan.FromMinutes(15)));
            options.AddPolicy(SignInRedemption, context => PerClient(context, permits: 10, window: TimeSpan.FromMinutes(1)));
            options.OnRejected = RefuseAsync;
        });

    private static RateLimitPartition<string> PerClient(HttpContext context, int permits, TimeSpan window) =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permits,
                Window = window,
                QueueLimit = 0,
            });

    /// <summary>
    /// Counted for the teammate the session names, which authentication has read by now; a request
    /// with no session is counted by its address and refused by authorization after it.
    /// </summary>
    private static RateLimitPartition<string> PerTeammate(HttpContext context, int permits, TimeSpan window)
    {
        var teammate = TeammateSessionHandler.TeammateIdOf(context);
        return RateLimitPartition.GetFixedWindowLimiter(
            teammate is null ? $"address:{context.Connection.RemoteIpAddress}" : $"teammate:{teammate}",
            _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = permits,
                Window = window,
                QueueLimit = 0,
            });
    }

    private static async ValueTask RefuseAsync(OnRejectedContext context, CancellationToken cancellationToken)
    {
        var http = context.HttpContext;
        http.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        if (context.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            http.Response.Headers.RetryAfter =
                Math.Max(1, (int)Math.Ceiling(retryAfter.TotalSeconds)).ToString(CultureInfo.InvariantCulture);
        }

        var problem = new ProblemDetails { Status = StatusCodes.Status429TooManyRequests };
        problem.Extensions["code"] = ErrorCodes.RateLimited;
        await http.RequestServices.GetRequiredService<IProblemDetailsService>()
            .WriteAsync(new ProblemDetailsContext { HttpContext = http, ProblemDetails = problem });
    }
}
