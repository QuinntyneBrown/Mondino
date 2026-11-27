using MediatR;
using Microsoft.EntityFrameworkCore;
using Mondino.Application.Errors;
using Mondino.Application.Joining;
using Mondino.Application.Persistence;
using Mondino.Application.Teams;

namespace Mondino.Application.Teammates;

/// <summary>
/// The current teammate's own profile. It names no teammate: it is always the asker's own, so no
/// request can read another teammate's (L2-007).
/// </summary>
public sealed record GetProfileQuery(Guid TeamId) : IRequest<ProfileDto>, ITeamScopedRequest;

/// <summary>
/// What Profile &amp; Settings reads: the team's name, the teammate's own pin, country and postal
/// code, which no other answer carries (L2-007); null for a pin placed through "Your city". The
/// settings join with journeys 22 and 23.
/// </summary>
public sealed record ProfileDto(string TeamName, PinDto Pin, string CountryCode, string? PostalCode);

internal sealed class GetProfileQueryHandler(IAppDbContext database, ICurrentTeammate currentTeammate)
    : IRequestHandler<GetProfileQuery, ProfileDto>
{
    public async Task<ProfileDto> Handle(GetProfileQuery request, CancellationToken cancellationToken)
    {
        var own = await database.Teammates.AsNoTracking()
            .Where(t => t.Id == currentTeammate.TeammateId && t.TeamId == request.TeamId)
            .Select(t => new
            {
                TeamName = database.Teams.Where(team => team.Id == t.TeamId).Select(team => team.Name).Single(),
                t.Id,
                t.Name,
                t.Colour,
                CityName = t.City.Name,
                t.City.CountryCode,
                t.City.Latitude,
                t.City.Longitude,
                t.City.TimeZoneId,
                t.PostalCode,
            })
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw RefusedException.NotFound(ErrorCodes.TeamNotFound);

        return new ProfileDto(
            own.TeamName,
            new PinDto(
                own.Id,
                own.Name,
                own.Colour,
                own.CityName,
                CountryNames.Of(own.CountryCode),
                new PositionDto(own.Latitude, own.Longitude),
                own.TimeZoneId,
                SharesStatus: true,
                IsViewer: true),
            own.CountryCode,
            own.PostalCode);
    }
}
