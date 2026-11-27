using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Mondino.Api.RateLimiting;
using Mondino.Api.Security;
using Mondino.Application.Teams;
using Mondino.Infrastructure.Teammates;

namespace Mondino.Api.Teams;

/// <summary>
/// Create Team (L2-053). Open to anyone at all: the person making a team has no session and no
/// invite link yet, so every action is rate limited (L2-045).
/// </summary>
[ApiController]
[Route("api")]
[AllowAnonymous]
public sealed class TeamCreationController(ISender sender) : ControllerBase
{
    /// <summary>
    /// Makes a team with its maker's pin at the city, and signs the maker in: 201 for a new team,
    /// 200 for a request already answered. Fields the body does not define are ignored.
    /// </summary>
    [HttpPost("teams")]
    [SameSiteOnly]
    [EnableRateLimiting(RateLimitPolicies.CreateTeam)]
    public async Task<ActionResult<CreatedTeamDto>> Create(
        [FromBody] CreateTeamRequest request, CancellationToken cancellationToken)
    {
        var outcome = await sender.Send(
            new CreateTeamCommand(
                request.TeamName, request.Name, request.Email, request.CountryCode, request.PostalCode, request.CityId, request.CreateRequestId),
            cancellationToken);
        await TeammateSessionHandler.SignInAsync(HttpContext, outcome.Result.TeamId, outcome.Result.TeammateId);
        return outcome.IsNew ? StatusCode(StatusCodes.Status201Created, outcome.Result) : Ok(outcome.Result);
    }
}

/// <summary>A team name, a name, a work email, a country, and a postal code or a city chosen from "Your city", as given.</summary>
public sealed record CreateTeamRequest(
    string? TeamName, string? Name, string? Email, string? CountryCode, string? PostalCode, string? CityId, Guid? CreateRequestId);
