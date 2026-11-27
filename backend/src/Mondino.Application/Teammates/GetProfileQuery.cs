using MediatR;
using Microsoft.EntityFrameworkCore;
using Mondino.Application.Errors;
using Mondino.Application.Joining;
using Mondino.Application.Persistence;
using Mondino.Application.Teams;
using Mondino.Domain.Teams;

namespace Mondino.Application.Teammates;

/// <summary>
/// The current teammate's own profile. It names no teammate: it is always the asker's own, so no
/// request can read another teammate's (L2-007).
/// </summary>
public sealed record GetProfileQuery(Guid TeamId) : IRequest<ProfileDto>, ITeamScopedRequest;

/// <summary>
/// What Profile &amp; Settings reads: the team's name, the teammate's own pin, country and postal
/// code, which no other answer carries (L2-007), null for a pin placed through "Your city"; and
/// their own settings (docs/adr/0023).
/// </summary>
public sealed record ProfileDto(string TeamName, PinDto Pin, string CountryCode, string? PostalCode, SettingsDto Settings);

internal sealed class GetProfileQueryHandler(
    IAppDbContext database, ICurrentTeammate currentTeammate, IWeatherSource weatherSource)
    : IRequestHandler<GetProfileQuery, ProfileDto>
{
    public Task<ProfileDto> Handle(GetProfileQuery request, CancellationToken cancellationToken) =>
        OwnProfiles.ReadAsync(database, weatherSource, currentTeammate.TeammateId, request.TeamId, cancellationToken);
}

/// <summary>Reads a teammate's own profile, as Profile &amp; Settings reads it and as a save answers it.</summary>
internal static class OwnProfiles
{
    public static async Task<ProfileDto> ReadAsync(
        IAppDbContext database,
        IWeatherSource weatherSource,
        Guid teammateId,
        Guid teamId,
        CancellationToken cancellationToken,
        SourceDeadline? deadline = null)
    {
        var own = await database.Teammates.AsNoTracking()
            .Where(t => t.Id == teammateId && t.TeamId == teamId)
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
                t.TemperatureUnit,
                t.ClockFormat,
                t.MomentKinds,
                t.SharesWeather,
                t.SharesStatus,
            })
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw RefusedException.NotFound(ErrorCodes.TeamNotFound);

        // A teammate sees their own weather, whatever they share; after a lookup, within what is
        // left of its deadline.
        var place = WeatherPlaces.Of(own.Latitude, own.Longitude);
        var weather = WeatherDto.From(deadline is null
            ? await weatherSource.GetCurrentAsync(place, cancellationToken)
            : await deadline.WeatherAtAsync(weatherSource, place));
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
                IsViewer: true,
                weather,
                weather is null ? WeatherState.Unavailable : WeatherState.Available),
            own.CountryCode,
            own.PostalCode,
            SettingsDto.From(new TeammateSettings(
                own.TemperatureUnit, own.ClockFormat, own.MomentKinds, own.SharesWeather, own.SharesStatus)));
    }
}
