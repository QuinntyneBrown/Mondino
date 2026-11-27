namespace Mondino.Domain.Teams;

/// <summary>A place on the globe, in degrees.</summary>
public sealed record Position(double Latitude, double Longitude)
{
    private const double EarthRadiusKm = 6371.0088;

    /// <summary>The great-circle distance to another place, in kilometres (haversine).</summary>
    public double DistanceKmTo(Position other)
    {
        ArgumentNullException.ThrowIfNull(other);
        static double Radians(double degrees) => degrees * Math.PI / 180;
        var dLatitude = Radians(other.Latitude - Latitude);
        var dLongitude = Radians(other.Longitude - Longitude);
        var a = (Math.Sin(dLatitude / 2) * Math.Sin(dLatitude / 2))
            + (Math.Cos(Radians(Latitude)) * Math.Cos(Radians(other.Latitude))
               * Math.Sin(dLongitude / 2) * Math.Sin(dLongitude / 2));
        return 2 * EarthRadiusKm * Math.Asin(Math.Min(1, Math.Sqrt(a)));
    }
}
