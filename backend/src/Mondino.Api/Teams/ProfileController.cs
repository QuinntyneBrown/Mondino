using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Mondino.Api.Joining;
using Mondino.Api.RateLimiting;
using Mondino.Application.Joining;
using Mondino.Application.Teammates;

namespace Mondino.Api.Teams;

/// <summary>
/// The asker's own pin and settings. Its routes end in <c>/me</c> and name no teammate, so no
/// request reaches another teammate's (L2-043). Every action needs a session.
/// </summary>
[ApiController]
[Route("api/teams/{teamId:guid}/me")]
public sealed class ProfileController(ISender sender) : ControllerBase
{
    /// <summary>The asker's own profile, the only answer that carries a postal code (L2-007).</summary>
    [HttpGet]
    public Task<ProfileDto> Get(Guid teamId, CancellationToken cancellationToken) =>
        sender.Send(new GetProfileQuery(teamId), cancellationToken);

    /// <summary>
    /// Saves the asker's own new location (L2-032): the city is found again and the pin moves to
    /// it. Fields the body does not define, a teammate id among them, are ignored (L2-044).
    /// </summary>
    [HttpPut]
    public Task<ProfileDto> Put(Guid teamId, [FromBody] ProfileUpdateRequest request, CancellationToken cancellationToken) =>
        sender.Send(new UpdateProfileCommand(teamId, request.CountryCode, request.PostalCode), cancellationToken);

    /// <summary>
    /// Looks a new postal code up for the asker's own pin (L2-032) and changes nothing. The postal
    /// code travels in the body; the lookups are counted for the teammate (docs/adr/0022).
    /// </summary>
    [HttpPost("postal-code-lookups")]
    [EnableRateLimiting(RateLimitPolicies.OwnLookup)]
    public Task<PostalCodeResultDto> LookUpPostalCode(
        Guid teamId, [FromBody] PostalCodeLookupRequest request, CancellationToken cancellationToken) =>
        sender.Send(new LookUpOwnPostalCodeQuery(teamId, request.CountryCode, request.PostalCode), cancellationToken);
}

/// <summary>A country and a postal code, as typed on Profile &amp; Settings. Journey 23 adds the settings.</summary>
public sealed record ProfileUpdateRequest(string? CountryCode, string? PostalCode)
{
    /// <summary>Only the type: what a teammate sent is never written to a log (L2-051).</summary>
    public override string ToString() => nameof(ProfileUpdateRequest);
}
