using MediatR;
using Microsoft.AspNetCore.Mvc;
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
}
