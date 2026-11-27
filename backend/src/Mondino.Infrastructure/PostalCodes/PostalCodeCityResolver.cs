using Mondino.Application.Cities;
using Mondino.Domain.Teams;
using Mondino.Infrastructure.Cities;

namespace Mondino.Infrastructure.PostalCodes;

/// <summary>A place as the postal code source gives it: its name, its region and where it is.</summary>
internal sealed record SourcePlace(string Name, string? Region, double Latitude, double Longitude);

/// <summary>
/// Turns the source's place into a city Mondino holds (docs/adr/0006, L2-006): the city of the
/// country whose name matches the place's, nearest the place if several do, or else the city
/// nearest the place. The source's coordinates choose the city and are never a pin's position.
/// </summary>
internal sealed class PostalCodeCityResolver(ICityDirectory directory)
{
    public KnownCity? Resolve(string countryCode, SourcePlace place)
    {
        var cities = directory.InCountry(countryCode);
        if (cities.Count == 0)
        {
            return null;
        }

        var names = NamesOf(place.Name);
        var named = cities.Where(city => names.Contains(PlaceNames.Fold(city.Name))).ToList();
        var candidates = named.Count > 0 ? named : cities;
        return candidates.MinBy(city => DistanceSquared(city, place));
    }

    /// <summary>"Toronto (Queen's Park)" is Toronto; "Mississauga City Centre" is looked for whole and as Mississauga.</summary>
    private static HashSet<string> NamesOf(string placeName)
    {
        var names = new HashSet<string>(StringComparer.Ordinal);
        var bare = placeName.Split('(')[0];
        names.Add(PlaceNames.Fold(bare));
        foreach (var suffix in new[] { " city centre", " centre", " downtown", " central" })
        {
            var folded = PlaceNames.Fold(bare);
            if (folded.EndsWith(suffix, StringComparison.Ordinal))
            {
                names.Add(folded[..^suffix.Length]);
            }
        }

        names.Remove(string.Empty);
        return names;
    }

    /// <summary>Near enough on a sphere to compare: longitude shrinks with the cosine of the latitude.</summary>
    private static double DistanceSquared(KnownCity city, SourcePlace place)
    {
        var dLat = city.Latitude - place.Latitude;
        var dLon = (city.Longitude - place.Longitude) * Math.Cos(place.Latitude * Math.PI / 180);
        return (dLat * dLat) + (dLon * dLon);
    }
}
