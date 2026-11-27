using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Mondino.Api.RateLimiting;
using Mondino.Api.Security;
using Mondino.Application.SignIn;

namespace Mondino.Api.SignIn;

/// <summary>
/// Sign In (L2-052). Open to anyone at all: the person signing in has no session yet, so every
/// action refuses other sites (docs/adr/0008) and is rate limited (L2-045).
/// </summary>
[ApiController]
[Route("api/sign-in-links")]
[AllowAnonymous]
[SameSiteOnly]
public sealed class SignInController(ISender sender) : ControllerBase
{
    /// <summary>
    /// Asks for a sign-in link: 202 with no body, whatever the email (L2-043). A teammate's email
    /// is mailed a link; any other is not.
    /// </summary>
    [HttpPost]
    [EnableRateLimiting(RateLimitPolicies.SignInLink)]
    public async Task<IActionResult> RequestLink([FromBody] SignInLinkRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new RequestSignInLinkCommand(request.Email), cancellationToken);
        return Accepted();
    }
}

/// <summary>The work email a sign-in link is asked for, as typed.</summary>
public sealed record SignInLinkRequest(string? Email);
