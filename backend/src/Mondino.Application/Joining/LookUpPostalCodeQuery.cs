using MediatR;
using Microsoft.EntityFrameworkCore;
using Mondino.Application.Cities;
using Mondino.Application.Errors;
using Mondino.Application.Persistence;
using Mondino.Application.Teams;

namespace Mondino.Application.Joining;

/// <summary>
/// Looks a postal code up for its country, for someone holding an invite link (L2-003). The
/// invite token is absent when Create Team asks (journey 5).
/// </summary>
public sealed record LookUpPostalCodeQuery(string? InviteToken, string? CountryCode, string? PostalCode)
    : IRequest<PostalCodeResultDto>;

/// <summary>The city a postal code lies in, and the weather there. It does not echo the postal code.</summary>
/// <param name="Weather">The weather at the city, or null when the weather source has none (L2-003).</param>
public sealed record PostalCodeResultDto(CityDto City, WeatherDto? Weather);

/// <summary>A city: its name, region and country, its own position and its IANA time zone.</summary>
public sealed record CityDto(string Name, string Region, string CountryCode, PositionDto Position, string TimeZoneId)
{
    internal static CityDto From(KnownCity city) =>
        new(city.Name, city.Region, city.CountryCode, new PositionDto(city.Latitude, city.Longitude), city.TimeZoneId);
}

/// <summary>Refuses a country outside the supported list, or a postal code empty or over 12 characters.</summary>
internal static class LookUpPostalCodeQueryValidator
{
    public const int MaxLength = 12;

    public static void Validate(LookUpPostalCodeQuery query)
    {
        if (PostalCodeFormats.Find(query.CountryCode) is null
            || string.IsNullOrWhiteSpace(query.PostalCode)
            || query.PostalCode.Length > MaxLength)
        {
            throw new RefusedException(400, ErrorCodes.ValidationFailed);
        }
    }
}

internal sealed class LookUpPostalCodeQueryHandler(IAppDbContext database, IPostalCodeLookup lookup, IWeatherSource weatherSource)
    : IRequestHandler<LookUpPostalCodeQuery, PostalCodeResultDto>
{
    public async Task<PostalCodeResultDto> Handle(LookUpPostalCodeQuery request, CancellationToken cancellationToken)
    {
        LookUpPostalCodeQueryValidator.Validate(request);

        // 1. Only someone holding a team's invite link may look a postal code up through it.
        if (request.InviteToken is not null
            && !await database.Teams.AnyAsync(team => team.InviteToken == request.InviteToken, cancellationToken))
        {
            throw RefusedException.NotFound(ErrorCodes.InviteNotFound);
        }

        // 2. A postal code that does not fit its country's form never reaches the source.
        if (!PostalCodeFormats.TryNormalise(request.CountryCode!, request.PostalCode!, out var postalCode))
        {
            throw new RefusedException(422, ErrorCodes.PostalCodeNotFound);
        }

        // 3. The source finds the city, at the city's own position.
        var outcome = await lookup.FindCityAsync(postalCode, cancellationToken);
        if (outcome.Status != PostalCodeLookupStatus.Found)
        {
            throw outcome.Status == PostalCodeLookupStatus.NotFound
                ? new RefusedException(422, ErrorCodes.PostalCodeNotFound)
                : new RefusedException(503, ErrorCodes.PostalCodeUnavailable);
        }

        // 4. And the weather there, which the source is asked for by the city's position alone.
        var city = outcome.City!;
        var weather = await weatherSource.GetCurrentAsync(WeatherPlaces.Of(city.Latitude, city.Longitude), cancellationToken);
        return new PostalCodeResultDto(CityDto.From(city), WeatherDto.From(weather));
    }
}
