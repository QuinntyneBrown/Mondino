using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Mondino.Application.Persistence;

namespace Mondino.Infrastructure.Teammates;

/// <summary>
/// The teammate's session (docs/adr/0008): a cookie that is <c>HttpOnly</c>, <c>Secure</c> and
/// <c>SameSite=Lax</c>, whose protected payload names the teammate id and the team id and nothing
/// else. It lasts 365 days and slides. Issued only on joining, making a team and signing in.
/// </summary>
public sealed class TeammateSessionHandler
{
    public const string Scheme = "TeammateSession";
    public const string CookieName = "__Host-mondino-session";
    public static readonly TimeSpan Lifetime = TimeSpan.FromDays(365);

    /// <summary>The cookie the antiforgery request token is given to the browser in: scripts may read it (docs/adr/0010).</summary>
    public const string AntiforgeryCookieName = "__Host-mondino-xsrf";

    /// <summary>The header the browser returns the antiforgery request token in.</summary>
    public const string AntiforgeryHeaderName = "X-XSRF-TOKEN";

    /// <summary>
    /// Signs the browser in as one teammate of one team, and gives it the antiforgery token its
    /// changes will need.
    /// </summary>
    public static async Task SignInAsync(HttpContext http, Guid teamId, Guid teammateId)
    {
        ArgumentNullException.ThrowIfNull(http);
        var identity = new ClaimsIdentity(
            [
                new Claim(CurrentTeammate.TeammateIdClaim, teammateId.ToString()),
                new Claim(CurrentTeammate.TeamIdClaim, teamId.ToString()),
            ],
            Scheme);
        var principal = new ClaimsPrincipal(identity);
        await http.SignInAsync(Scheme, principal, new AuthenticationProperties { IsPersistent = true });

        // The token is bound to the session's claims, so it is made for the teammate just signed in.
        http.User = principal;
        IssueAntiforgeryToken(http);
    }

    /// <summary>The teammate a request's session names, once authentication has read it; or null.</summary>
    public static string? TeammateIdOf(HttpContext http)
    {
        ArgumentNullException.ThrowIfNull(http);
        return http.User.FindFirstValue(CurrentTeammate.TeammateIdClaim);
    }

    /// <summary>Gives the signed-in browser an antiforgery request token, in a cookie scripts can read.</summary>
    public static void IssueAntiforgeryToken(HttpContext http)
    {
        ArgumentNullException.ThrowIfNull(http);
        var tokens = http.RequestServices.GetRequiredService<IAntiforgery>().GetAndStoreTokens(http);
        http.Response.Cookies.Append(AntiforgeryCookieName, tokens.RequestToken!, new CookieOptions
        {
            HttpOnly = false,
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = "/",
        });
    }
}

internal static class TeammateSessions
{
    public static IServiceCollection AddTeammateSessions(this IServiceCollection services, IConfiguration configuration)
    {
        var protection = services.AddDataProtection().SetApplicationName("Mondino");
        if (configuration["DataProtection:KeysPath"] is { Length: > 0 } keysPath)
        {
            protection.PersistKeysToFileSystem(new DirectoryInfo(keysPath));
        }

        services.AddAntiforgery(options =>
        {
            options.HeaderName = TeammateSessionHandler.AntiforgeryHeaderName;
            options.Cookie.Name = "__Host-mondino-antiforgery";
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
            options.Cookie.SameSite = SameSiteMode.Strict;
            options.Cookie.Path = "/";
        });

        services.AddAuthentication(TeammateSessionHandler.Scheme)
            .AddCookie(TeammateSessionHandler.Scheme, options =>
            {
                options.Cookie.Name = TeammateSessionHandler.CookieName;
                options.Cookie.HttpOnly = true;
                options.Cookie.SecurePolicy = CookieSecurePolicy.Always;
                options.Cookie.SameSite = SameSiteMode.Lax;
                options.Cookie.Path = "/";
                options.ExpireTimeSpan = TeammateSessionHandler.Lifetime;
                options.SlidingExpiration = true;

                // A session whose teammate no longer exists in its team (they left) is no session.
                options.Events.OnValidatePrincipal = RejectWhenGoneAsync;

                // An API answers 401 and 403; it never redirects to a sign-in page.
                options.Events.OnRedirectToLogin = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    return Task.CompletedTask;
                };
                options.Events.OnRedirectToAccessDenied = context =>
                {
                    context.Response.StatusCode = StatusCodes.Status403Forbidden;
                    return Task.CompletedTask;
                };
            });
        return services;
    }

    private static async Task RejectWhenGoneAsync(CookieValidatePrincipalContext context)
    {
        var principal = context.Principal;
        var found = Guid.TryParse(principal?.FindFirstValue(CurrentTeammate.TeammateIdClaim), out var teammateId)
            & Guid.TryParse(principal?.FindFirstValue(CurrentTeammate.TeamIdClaim), out var teamId);
        var database = context.HttpContext.RequestServices.GetRequiredService<IAppDbContext>();
        if (!found || !await database.Teammates.AsNoTracking()
                .AnyAsync(t => t.Id == teammateId && t.TeamId == teamId, context.HttpContext.RequestAborted))
        {
            context.RejectPrincipal();
        }
    }
}
