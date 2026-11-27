using MediatR;
using Microsoft.AspNetCore.Mvc;
using Mondino.Application.Moments;
using Mondino.Application.Teams;

namespace Mondino.Api.Teams;

/// <summary>
/// A team as its own teammates see it. Every action needs a session (the fallback policy), and a
/// team that is not the session's is answered 404 (L2-043).
/// </summary>
[ApiController]
[Route("api/teams/{teamId:guid}")]
public sealed class TeamsController(ISender sender) : ControllerBase
{
    /// <summary>The team and its pins, each at its city and with no postal code (L2-007).</summary>
    [HttpGet("pins")]
    public Task<TeamPinsDto> GetPins(Guid teamId, CancellationToken cancellationToken) =>
        sender.Send(new GetPinsQuery(teamId), cancellationToken);

    /// <summary>
    /// The moments where the team's teammates live, one for each teammate a moment belongs to, from
    /// today in each moment's place to 90 days ahead, in date order (L2-020).
    /// </summary>
    [HttpGet("moments")]
    public Task<IReadOnlyList<MomentDto>> GetMoments(Guid teamId, CancellationToken cancellationToken) =>
        sender.Send(new GetMomentsQuery(teamId), cancellationToken);
}
