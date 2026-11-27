using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Mondino.Application.Joining;

namespace Mondino.Api.Joining;

/// <summary>
/// Invite links. Open to anyone who holds one: the person opening it has no session yet.
/// </summary>
[ApiController]
[Route("api/invites")]
[AllowAnonymous]
public sealed class InvitesController(ISender sender) : ControllerBase
{
    /// <summary>The team an invite link opens, as a stranger to it may see it (L2-001).</summary>
    [HttpGet("{inviteToken}")]
    public Task<InviteDto> GetInvite(string inviteToken, CancellationToken cancellationToken) =>
        sender.Send(new GetInviteQuery(inviteToken), cancellationToken);
}
