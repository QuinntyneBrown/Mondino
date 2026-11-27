namespace Mondino.Application.Cities;

/// <summary>
/// A city Mondino holds itself (docs/adr/0006): its own position, never a postal code's, its
/// region and its IANA time zone. <see cref="CityId"/> is stable across runs.
/// </summary>
public sealed record KnownCity(
    string CityId,
    string Name,
    string Region,
    string CountryCode,
    double Latitude,
    double Longitude,
    string TimeZoneId,
    int Population);
