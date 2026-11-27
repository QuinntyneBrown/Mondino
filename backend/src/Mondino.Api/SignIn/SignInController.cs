using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Mondino.Api.RateLimiting;
using Mondino.Api.Security;
using Mondino.Application.SignIn;
using Mondino.Infrastructure.Teammates;

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

    /// <summary>
    /// Opens a sign-in link: the token travels in the body, never in the address. A good link of a
    /// teammate signs them in to their team (L2-043); one of an email on no team names the email and
    /// issues no session; a used, expired or unknown one is refused with 410.
    /// </summary>
    [HttpPost("redemptions")]
    [EnableRateLimiting(RateLimitPolicies.SignInRedemption)]
    public async Task<ActionResult<SignInResultDto>> Redeem(
        [FromBody] SignInRedemptionRequest request, CancellationToken cancellationToken)
    {
        var result = await sender.Send(new RedeemSignInLinkCommand(request.SignInToken), cancellationToken);
        if (result.Membership is { } membership)
        {
            await TeammateSessionHandler.SignInAsync(HttpContext, membership.TeamId, membership.TeammateId);
        }

        return Ok(result);
    }
}

/// <summary>The work email a sign-in link is asked for, as typed.</summary>
public sealed record SignInLinkRequest(string? Email)
{
    /// <summary>Only the type: what a teammate sent is never written to a log (L2-051).</summary>
    public override string ToString() => nameof(SignInLinkRequest);
}

/// <summary>The token from the fragment of an emailed sign-in link.</summary>
public sealed record SignInRedemptionRequest(string? SignInToken)
{
    /// <summary>Only the type: what a teammate sent is never written to a log (L2-051).</summary>
    public override string ToString() => nameof(SignInRedemptionRequest);
}
