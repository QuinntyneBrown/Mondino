using Mondino.Domain.Teams;

namespace Mondino.Domain.Moments;

/// <summary>
/// What a calendar gives (find-moments): a kind, a title, a date local to its place, one line of
/// detail, the country it is in, a region where a holiday is regional, a position for an event
/// or a fixture, and the team or series it is about, if any.
/// </summary>
public sealed record CalendarEntry(
    MomentKind Kind,
    string Title,
    DateOnly Date,
    string Detail,
    string CountryCode,
    string? Region,
    Position? Position,
    string? Subject)
{
    /// <summary>How near a city a local event or a sport fixture must be to belong to it (L2-020).</summary>
    public const double RadiusKm = 100;

    /// <summary>
    /// Whether the entry happens where the city is (L2-020): a holiday in its country, and in its
    /// region where the holiday is regional; a Formula 1 entry in the country that holds the race;
    /// a local event or a sport fixture within 100 km.
    /// </summary>
    public bool BelongsTo(City city)
    {
        ArgumentNullException.ThrowIfNull(city);
        return Kind switch
        {
            MomentKind.Holiday => SameCountry(city)
                && (string.IsNullOrWhiteSpace(Region)
                    || (city.Region is { } region && RegionKey(Region) == RegionKey(region))),
            MomentKind.Formula1 => SameCountry(city),
            MomentKind.LocalEvent or MomentKind.Sport =>
                Position is { } position && position.DistanceKmTo(city.Position) <= RadiusKm,
            _ => false,
        };
    }

    // "State of Berlin" (GeoNames) and "Berlin" (OpenHolidays) are one region.
    private static string RegionKey(string name)
    {
        var folded = PlaceNames.Fold(name);
        foreach (var prefix in (string[])["state of ", "province of ", "region of "])
        {
            if (folded.StartsWith(prefix, StringComparison.Ordinal))
            {
                return folded[prefix.Length..];
            }
        }

        return folded;
    }

    private bool SameCountry(City city) =>
        string.Equals(CountryCode, city.CountryCode, StringComparison.OrdinalIgnoreCase);
}
