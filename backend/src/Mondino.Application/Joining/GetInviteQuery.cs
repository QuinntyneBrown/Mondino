using MediatR;
using Microsoft.EntityFrameworkCore;
using Mondino.Application.Errors;
using Mondino.Application.Persistence;
using Mondino.Application.Teammates;

namespace Mondino.Application.Joining;

/// <summary>Opens an invite link: what anyone holding it may learn of its team.</summary>
public sealed record GetInviteQuery(string InviteToken) : IRequest<InviteDto>;

/// <summary>
/// The team's name, its count, a bare position for each teammate and the initials and colour of
/// the five who joined most recently. No teammate id, name, city, time zone, weather or postal code.
/// </summary>
public sealed record InviteDto(
    string TeamName,
    int TeammateCount,
    IReadOnlyList<PositionDto> Positions,
    IReadOnlyList<InviteAvatarDto> Avatars,
    bool AlreadyJoined,
    IReadOnlyList<CountryDto> Countries);

/// <summary>A bare position: where a pin is, and nothing of whose it is.</summary>
public sealed record PositionDto(double Latitude, double Longitude);

/// <summary>A teammate's initials and colour: the most a holder of an invite link learns of them.</summary>
public sealed record InviteAvatarDto(string Initials, string Colour);

public sealed record CountryDto(string Code, string Name);

internal sealed class GetInviteQueryHandler(IAppDbContext database, ICurrentTeammate currentTeammate)
    : IRequestHandler<GetInviteQuery, InviteDto>
{
    public const int AvatarCount = 5;

    public async Task<InviteDto> Handle(GetInviteQuery request, CancellationToken cancellationToken)
    {
        var team = await database.Teams
            .AsNoTracking()
            .Where(t => t.InviteToken == request.InviteToken)
            .Select(t => new { t.Id, t.Name })
            .SingleOrDefaultAsync(cancellationToken);

        // InMemory compares strings as .NET does and PostgreSQL by bytes: both match the token exactly.
        if (team is null)
        {
            throw RefusedException.NotFound(ErrorCodes.InviteNotFound);
        }

        var teammates = database.Teammates.AsNoTracking().Where(t => t.TeamId == team.Id);
        var count = await teammates.CountAsync(cancellationToken);

        if (currentTeammate.IsAuthenticated && currentTeammate.TeamId == team.Id)
        {
            return new InviteDto(team.Name, count, [], [], AlreadyJoined: true, SupportedCountries.All);
        }

        var positions = await teammates
            .OrderBy(t => t.City.Latitude).ThenBy(t => t.City.Longitude)
            .Select(t => new PositionDto(t.City.Latitude, t.City.Longitude))
            .ToListAsync(cancellationToken);

        var recent = await teammates
            .OrderByDescending(t => t.JoinedAt)
            .Take(AvatarCount)
            .Select(t => new { t.Name, t.Colour })
            .ToListAsync(cancellationToken);

        return new InviteDto(
            team.Name,
            count,
            positions,
            recent.Select(t => new InviteAvatarDto(Domain.Teams.TeammateInitials.Of(t.Name), t.Colour)).ToList(),
            AlreadyJoined: false,
            SupportedCountries.All);
    }
}
