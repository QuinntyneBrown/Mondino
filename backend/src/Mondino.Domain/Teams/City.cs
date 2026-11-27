namespace Mondino.Domain.Teams;

/// <summary>
/// A city: where a pin is placed. Its position is the city's own, never a postal code's, and its
/// time zone is what the browser works a local time out from.
/// </summary>
public sealed class City
{
    private City()
    {
        Name = string.Empty;
        CountryCode = string.Empty;
        TimeZoneId = string.Empty;
    }

    public City(Guid id, string name, string countryCode, Position position, string timeZoneId)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(countryCode);
        ArgumentNullException.ThrowIfNull(position);
        ArgumentException.ThrowIfNullOrWhiteSpace(timeZoneId);
        Id = id;
        Name = name;
        CountryCode = countryCode;
        Latitude = position.Latitude;
        Longitude = position.Longitude;
        TimeZoneId = timeZoneId;
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; }

    /// <summary>The ISO 3166-1 alpha-2 code of the city's country: "IT".</summary>
    public string CountryCode { get; private set; }

    public double Latitude { get; private set; }

    public double Longitude { get; private set; }

    /// <summary>The IANA time zone: "Europe/Rome".</summary>
    public string TimeZoneId { get; private set; }

    public Position Position => new(Latitude, Longitude);
}
