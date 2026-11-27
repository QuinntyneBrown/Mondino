using MediatR;
using Microsoft.EntityFrameworkCore;
using Mondino.Application.Errors;
using Mondino.Application.Joining;
using Mondino.Application.Persistence;
using Mondino.Application.Teammates;
using Mondino.Domain.Teams;

namespace Mondino.Application.Teams;

/// <summary>The current teammate's team and its pins (show-pins). Only a teammate of the team may ask (L2-043).</summary>
public sealed record GetPinsQuery(Guid TeamId) : IRequest<TeamPinsDto>, ITeamScopedRequest;

/// <summary>
/// The team's id and name, its invite token, the viewer's teammate id, the pins, and the viewer's
/// own settings, so a browser that has never opened Profile &amp; Settings draws in them and a choice
/// saved elsewhere arrives at the next refresh (docs/adr/0025). No other teammate's settings are in it.
/// </summary>
public sealed record TeamPinsDto(
    Guid TeamId,
    string TeamName,
    string InviteToken,
    Guid ViewerTeammateId,
    IReadOnlyList<PinDto> Pins,
    SettingsDto ViewerSettings);

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
        // The viewer's own settings, which only their own read carries (docs/adr/0025).
        var own = await database.Teammates.AsNoTracking()
            .Where(t => t.Id == viewer && t.TeamId == team.Id)
            .Select(t => new { t.TemperatureUnit, t.ClockFormat, t.MomentKinds, t.SharesWeather, t.SharesStatus })
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw RefusedException.NotFound(ErrorCodes.TeamNotFound);
        var viewerSettings = SettingsDto.From(new TeammateSettings(
            own.TemperatureUnit, own.ClockFormat, own.MomentKinds, own.SharesWeather, own.SharesStatus));

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
                StateOf(t.Id, t.SharesWeather, t.Latitude, t.Longitude))).ToList(),
            viewerSettings);

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
