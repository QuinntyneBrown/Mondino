using MediatR;
using Microsoft.AspNetCore.Mvc;
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
}
