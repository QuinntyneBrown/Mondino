using System.Globalization;
using Mondino.Domain.Teams;

namespace Mondino.Application.Joining;

/// <summary>
/// The colour of a new teammate's pin, from the palette's teammate colours (<c>teammate-1</c> to
/// <c>teammate-13</c>), so that it differs from the teammates nearest to them where the palette
/// allows (L2-011): the colour whose nearest holder is farthest from the new teammate's city. A
/// colour no one holds is farthest of all; among equals, the fewest held, then the lowest number.
/// </summary>
public static class PinColourPicker
{
    public const int Colours = 13;

    public static string Pick(Team team, City city)
    {
        ArgumentNullException.ThrowIfNull(team);
        ArgumentNullException.ThrowIfNull(city);
        var holders = team.Teammates.ToLookup(t => t.Colour);
        return Enumerable.Range(1, Colours)
            .Select(n => string.Create(CultureInfo.InvariantCulture, $"teammate-{n}"))
            .Select(colour => (
                Colour: colour,
                Nearest: holders[colour].Select(t => DistanceInRadians(t.City, city)).DefaultIfEmpty(double.PositiveInfinity).Min(),
                Held: holders[colour].Count()))
            .OrderByDescending(c => c.Nearest)
            .ThenBy(c => c.Held)
            .First()
            .Colour;
    }

    /// <summary>The angle between two cities seen from the Earth's centre (the haversine formula).</summary>
    private static double DistanceInRadians(City from, City to)
    {
        static double Radians(double degrees) => degrees * Math.PI / 180;
        var dLatitude = Radians(to.Latitude - from.Latitude);
        var dLongitude = Radians(to.Longitude - from.Longitude);
        var h = Math.Pow(Math.Sin(dLatitude / 2), 2)
            + (Math.Cos(Radians(from.Latitude)) * Math.Cos(Radians(to.Latitude)) * Math.Pow(Math.Sin(dLongitude / 2), 2));
        return 2 * Math.Asin(Math.Min(1, Math.Sqrt(h)));
    }
}
