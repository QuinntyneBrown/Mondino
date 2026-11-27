using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

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

    /// <summary>Signs the browser in as one teammate of one team.</summary>
    public static Task SignInAsync(HttpContext http, Guid teamId, Guid teammateId)
    {
        ArgumentNullException.ThrowIfNull(http);
        var identity = new ClaimsIdentity(
            [
                new Claim(CurrentTeammate.TeammateIdClaim, teammateId.ToString()),
                new Claim(CurrentTeammate.TeamIdClaim, teamId.ToString()),
            ],
            Scheme);
        return http.SignInAsync(Scheme, new ClaimsPrincipal(identity), new AuthenticationProperties { IsPersistent = true });
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
}
