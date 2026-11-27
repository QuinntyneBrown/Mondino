using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Mondino.Application.Teammates;

namespace Mondino.Infrastructure.Teammates;

/// <summary>
/// Ends the asker's session by expiring its cookie and the antiforgery cookie on the answer. The
/// session itself is not stored: once its teammate is gone, any copy of it is refused (docs/adr/0024).
/// </summary>
internal sealed class CookieTeammateSessions(IHttpContextAccessor accessor) : ITeammateSessions
{
    public async Task EndAsync()
    {
        if (accessor.HttpContext is not { } http)
        {
            return;
        }

        await http.SignOutAsync(TeammateSessionHandler.Scheme);
        http.Response.Cookies.Delete(TeammateSessionHandler.AntiforgeryCookieName, new CookieOptions
        {
            Secure = true,
            SameSite = SameSiteMode.Strict,
            Path = "/",
        });
    }
}
