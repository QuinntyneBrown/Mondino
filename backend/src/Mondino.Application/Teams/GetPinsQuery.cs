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
/// in no part of it (L2-007), and with no email (L2-043). It carries the city's IANA time zone and
/// no local time: the browser works the time and the status out (L2-014), and shows no status for a
/// teammate who does not share it (L2-015). It carries the weather at the city, or none, and why
/// (L2-018). Moments join with journey 19.
/// </summary>
public sealed record PinDto(
    Guid TeammateId,
    string Name,
    string Colour,
    string CityName,
    string Country,
    PositionDto Position,
    string TimeZoneId,
    bool SharesStatus,
    bool IsViewer,
    WeatherDto? Weather,
    WeatherState WeatherState);

internal sealed class GetPinsQueryHandler(
    IAppDbContext database, ICurrentTeammate currentTeammate, IWeatherSource weatherSource)
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
                t.SharesStatus,
                t.SharesWeather,
            })
            .ToListAsync(cancellationToken);

        var viewer = currentTeammate.TeammateId;

        // The weather once per city, in parallel, for the cities of the pins whose weather the
        // viewer may see: their own, and every teammate's who shares it (docs/adr/0015).
        bool showsWeather(Guid id, bool shares) => shares || id == viewer;
        var places = teammates
            .Where(t => showsWeather(t.Id, t.SharesWeather))
            .Select(t => WeatherPlaces.Of(t.Latitude, t.Longitude))
            .Distinct()
            .ToList();
        var readings = await Task.WhenAll(places.Select(place => weatherSource.GetCurrentAsync(place, cancellationToken)));
        var weatherAt = places.Zip(readings).ToDictionary(pair => pair.First, pair => WeatherDto.From(pair.Second));

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
                // A teammate still sees their own status, whatever they share.
                t.SharesStatus || t.Id == viewer,
                t.Id == viewer,
                WeatherOf(t.Id, t.SharesWeather, t.Latitude, t.Longitude),
                StateOf(t.Id, t.SharesWeather, t.Latitude, t.Longitude))).ToList());

        WeatherDto? WeatherOf(Guid id, bool shares, double latitude, double longitude) =>
            showsWeather(id, shares) ? weatherAt[WeatherPlaces.Of(latitude, longitude)] : null;

        WeatherState StateOf(Guid id, bool shares, double latitude, double longitude) =>
            !showsWeather(id, shares) ? WeatherState.NotShared
            : WeatherOf(id, shares, latitude, longitude) is null ? WeatherState.Unavailable
            : WeatherState.Available;
    }
}

/// <summary>A country's name, as the pins and the profile name it: "Italy".</summary>
internal static class CountryNames
{
    public static string Of(string countryCode) => PostalCodeFormats.Find(countryCode)?.CountryName ?? countryCode;
}
