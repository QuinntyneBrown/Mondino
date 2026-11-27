using Microsoft.EntityFrameworkCore;
using Mondino.Application.Cities;
using Mondino.Application.Errors;
using Mondino.Application.Persistence;
using Mondino.Domain.Teams;

namespace Mondino.Application.Joining;

/// <summary>
/// The city a new pin is placed at, found again by the backend, never taken from the browser: the
/// city of a postal code, or a city chosen from "Your city" while the lookup is down (L2-004,
/// L2-006). Joining and making a team place their pins the same way.
/// </summary>
internal static class PinCities
{
    /// <summary>
    /// The city of the postal code, with the postal code in its canonical spelling, or the city
    /// chosen, with none. Refused with <c>postal_code_not_found</c>, <c>postal_code_unavailable</c>
    /// or, for a chosen city outside the country, <c>validation_failed</c>.
    /// </summary>
    public static async Task<(KnownCity City, string? PostalCode)> FindAsync(
        IPostalCodeLookup lookup,
        ICityDirectory directory,
        string countryCode,
        string? postalCode,
        string? cityId,
        CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(cityId))
        {
            var chosen = directory.Find(cityId);
            return chosen is not null && chosen.CountryCode == countryCode
                ? (chosen, null)
                : throw new RefusedException(400, ErrorCodes.ValidationFailed);
        }

        if (!PostalCodeFormats.TryNormalise(countryCode, postalCode!, out var normalised))
        {
            throw new RefusedException(422, ErrorCodes.PostalCodeNotFound);
        }

        var outcome = await lookup.FindCityAsync(normalised, cancellationToken);
        return outcome.Status switch
        {
            PostalCodeLookupStatus.Found => (outcome.City!, normalised.Value),
            PostalCodeLookupStatus.NotFound => throw new RefusedException(422, ErrorCodes.PostalCodeNotFound),
            _ => throw new RefusedException(503, ErrorCodes.PostalCodeUnavailable),
        };
    }

    /// <summary>The city as the database holds it, added the first time a pin is placed there.</summary>
    public static async Task<City> HoldAsync(IAppDbContext database, KnownCity known, CancellationToken cancellationToken)
    {
        var city = await database.Cities.SingleOrDefaultAsync(c => c.DirectoryId == known.CityId, cancellationToken);
        if (city is null)
        {
            city = new City(
                Guid.NewGuid(),
                known.Name,
                known.CountryCode,
                new Position(known.Latitude, known.Longitude),
                known.TimeZoneId,
                known.CityId);
            database.Cities.Add(city);
        }

        return city;
    }
}
