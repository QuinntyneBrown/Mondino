using MediatR;
using Microsoft.EntityFrameworkCore;
using Mondino.Application.Errors;
using Mondino.Application.Joining;
using Mondino.Application.Persistence;
using Mondino.Application.Teammates;

namespace Mondino.Application.Teams;

/// <summary>The current teammate's team and its pins (show-pins). Only a teammate of the team may ask (L2-043).</summary>
public sealed record GetPinsQuery(Guid TeamId) : IRequest<TeamPinsDto>, ITeamScopedRequest;

/// <summary>The team's id and name, its invite token, the viewer's teammate id and the pins.</summary>
public sealed record TeamPinsDto(
    Guid TeamId,
    string TeamName,
    string InviteToken,
    Guid ViewerTeammateId,
    IReadOnlyList<PinDto> Pins);

/// <summary>
/// A teammate's pin as their teammates see it: at their city, never at their postal code, which is
/// in no part of it (L2-007), and with no email (L2-043). Weather, moments and the status's sharing
/// join with journeys 13, 19 and 23.
/// </summary>
public sealed record PinDto(
    Guid TeammateId,
    string Name,
    string Colour,
    string CityName,
    string Country,
    PositionDto Position,
    string TimeZoneId,
    bool IsViewer);

internal sealed class GetPinsQueryHandler(IAppDbContext database, ICurrentTeammate currentTeammate)
    : IRequestHandler<GetPinsQuery, TeamPinsDto>
{
    public async Task<TeamPinsDto> Handle(GetPinsQuery request, CancellationToken cancellationToken)
    {
        var team = await database.Teams.AsNoTracking()
            .Where(t => t.Id == request.TeamId)
            .Select(t => new { t.Id, t.Name, t.InviteToken })
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw RefusedException.NotFound(ErrorCodes.TeamNotFound);

        var teammates = await database.Teammates.AsNoTracking()
            .Where(t => t.TeamId == team.Id)
            .OrderBy(t => t.JoinedAt)
            .Select(t => new
            {
                t.Id,
                t.Name,
                t.Colour,
                CityName = t.City.Name,
                t.City.CountryCode,
                t.City.Latitude,
                t.City.Longitude,
                t.City.TimeZoneId,
            })
            .ToListAsync(cancellationToken);

        var viewer = currentTeammate.TeammateId;
        return new TeamPinsDto(
            team.Id,
            team.Name,
            team.InviteToken,
            viewer,
            teammates.Select(t => new PinDto(
                t.Id,
                t.Name,
                t.Colour,
                t.CityName,
                CountryNames.Of(t.CountryCode),
                new PositionDto(t.Latitude, t.Longitude),
                t.TimeZoneId,
                t.Id == viewer)).ToList());
    }
}

/// <summary>A country's name, as the pins and the profile name it: "Italy".</summary>
internal static class CountryNames
{
    public static string Of(string countryCode) => PostalCodeFormats.Find(countryCode)?.CountryName ?? countryCode;
}
