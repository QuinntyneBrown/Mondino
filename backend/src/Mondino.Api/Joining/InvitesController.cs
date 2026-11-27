using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Mondino.Api.RateLimiting;
using Mondino.Api.Security;
using Mondino.Application.Joining;
using Mondino.Infrastructure.Teammates;

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

    /// <summary>
    /// The cities of a country that start with the text, for "Your city" while the lookup is down
    /// (L2-004). Answered from Mondino's own cities; the text travels in the body.
    /// </summary>
    [HttpPost("{inviteToken}/city-searches")]
    [EnableRateLimiting(RateLimitPolicies.CitySearch)]
    public Task<IReadOnlyList<CityResultDto>> SearchCities(
        string inviteToken, [FromBody] CitySearchRequest request, CancellationToken cancellationToken) =>
        sender.Send(new SearchCitiesQuery(inviteToken, request.CountryCode, request.Text), cancellationToken);

    /// <summary>
    /// Joins the team with a pin at a city (L2-005), and signs the new teammate in: 201 for a new
    /// teammate, 200 for a join request already answered. Fields the body does not define are ignored.
    /// </summary>
    [HttpPost("{inviteToken}/teammates")]
    [SameSiteOnly]
    [EnableRateLimiting(RateLimitPolicies.Join)]
    public async Task<ActionResult<JoinResultDto>> Join(
        string inviteToken, [FromBody] JoinRequest request, CancellationToken cancellationToken)
    {
        var outcome = await sender.Send(
            new JoinTeamCommand(inviteToken, request.Name, request.CountryCode, request.PostalCode, request.CityId, request.JoinRequestId),
            cancellationToken);
        await TeammateSessionHandler.SignInAsync(HttpContext, outcome.Result.TeamId, outcome.Result.TeammateId);
        return outcome.IsNew ? StatusCode(StatusCodes.Status201Created, outcome.Result) : Ok(outcome.Result);
    }
}

/// <summary>A country and the start of a city's name, as typed.</summary>
public sealed record CitySearchRequest(string? CountryCode, string? Text)
{
    /// <summary>Only the type: what a teammate sent is never written to a log (L2-051).</summary>
    public override string ToString() => nameof(CitySearchRequest);
}

/// <summary>A country and a postal code, as typed.</summary>
public sealed record PostalCodeLookupRequest(string? CountryCode, string? PostalCode)
{
    /// <summary>Only the type: what a teammate sent is never written to a log (L2-051).</summary>
    public override string ToString() => nameof(PostalCodeLookupRequest);
}

/// <summary>A name, a country, and a postal code or a city chosen from "Your city", as given.</summary>
public sealed record JoinRequest(string? Name, string? CountryCode, string? PostalCode, string? CityId, Guid? JoinRequestId)
{
    /// <summary>Only the type: what a teammate sent is never written to a log (L2-051).</summary>
    public override string ToString() => nameof(JoinRequest);
}
