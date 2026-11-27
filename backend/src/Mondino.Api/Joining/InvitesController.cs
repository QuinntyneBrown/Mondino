using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Mondino.Api.RateLimiting;
using Mondino.Application.Joining;

namespace Mondino.Api.Joining;

/// <summary>
/// Invite links. Open to anyone who holds one: the person opening it has no session yet, so
/// every action is rate limited.
/// </summary>
[ApiController]
[Route("api/invites")]
[AllowAnonymous]
public sealed class InvitesController(ISender sender) : ControllerBase
{
    /// <summary>The team an invite link opens, as a stranger to it may see it (L2-001).</summary>
    [HttpGet("{inviteToken}")]
    [EnableRateLimiting(RateLimitPolicies.Invite)]
    public Task<InviteDto> GetInvite(string inviteToken, CancellationToken cancellationToken) =>
        sender.Send(new GetInviteQuery(inviteToken), cancellationToken);

    /// <summary>
    /// Looks a postal code up for its country (L2-003). The postal code travels in the body, never
    /// in the address.
    /// </summary>
    [HttpPost("{inviteToken}/postal-code-lookups")]
    [EnableRateLimiting(RateLimitPolicies.Lookup)]
    public Task<PostalCodeResultDto> LookUpPostalCode(
        string inviteToken, [FromBody] PostalCodeLookupRequest request, CancellationToken cancellationToken) =>
        sender.Send(new LookUpPostalCodeQuery(inviteToken, request.CountryCode, request.PostalCode), cancellationToken);
}

/// <summary>A country and a postal code, as typed.</summary>
public sealed record PostalCodeLookupRequest(string? CountryCode, string? PostalCode);
