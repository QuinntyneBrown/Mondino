using System.Globalization;
using System.Threading.RateLimiting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Mondino.Application.Errors;

namespace Mondino.Api.RateLimiting;

/// <summary>
/// The limits on what is open to anyone (L2-045). Each is counted for one client, by its address.
/// Over a limit the request is refused with 429, a <c>Retry-After</c> header and the code
/// <c>rate_limited</c>, before any handler runs.
/// </summary>
internal static class RateLimitPolicies
{
    /// <summary>Opening an invite link: 30 a minute, so invite links cannot be guessed at speed.</summary>
    public const string Invite = "invite";

    /// <summary>Looking a postal code up: 10 a minute, before any outside source is asked.</summary>
    public const string Lookup = "lookup";

    public static IServiceCollection AddRateLimitPolicies(this IServiceCollection services) =>
        services.AddRateLimiter(options =>
        {
            options.AddPolicy(Invite, context => PerClient(context, permits: 30, window: TimeSpan.FromMinutes(1)));
            options.AddPolicy(Lookup, context => PerClient(context, permits: 10, window: TimeSpan.FromMinutes(1)));
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
