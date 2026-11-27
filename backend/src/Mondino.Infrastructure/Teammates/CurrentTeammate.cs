using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Mondino.Application.Teammates;

namespace Mondino.Infrastructure.Teammates;

/// <summary>
/// The teammate named by the request's authenticated session: its teammate id and team id
/// claims. Until a session is issued (journey 4) no request is authenticated, so no one is.
/// </summary>
internal sealed class CurrentTeammate(IHttpContextAccessor accessor) : ICurrentTeammate
{
    public const string TeammateIdClaim = "teammate_id";
    public const string TeamIdClaim = "team_id";

    public bool IsAuthenticated =>
        accessor.HttpContext?.User.Identity?.IsAuthenticated == true && TeammateId != Guid.Empty && TeamId != Guid.Empty;

    public Guid TeammateId => Claim(TeammateIdClaim);

    public Guid TeamId => Claim(TeamIdClaim);

    private Guid Claim(string type) =>
        Guid.TryParse(accessor.HttpContext?.User.FindFirstValue(type), out var id) ? id : Guid.Empty;
}
