using Microsoft.EntityFrameworkCore;
using Mondino.Application.Persistence;
using Mondino.Domain.Teams;

namespace Mondino.Infrastructure.Persistence.Seeds;

/// <summary>
/// The sample team of the mocks, Northwind, with its invite link and its twelve teammates at
/// their cities. Until a team can be made (journey 5), the seed is how one comes to exist. It
/// adds only what is missing.
/// </summary>
internal sealed class NorthwindSeed : ISeedStep
{
    public const string InviteToken = "northwind-7Kq2";

    private static readonly DateTimeOffset FirstJoined = new(2025, 9, 1, 9, 0, 0, TimeSpan.Zero);

    // Oldest first: the last five are the five who joined most recently.
    private static readonly (string Name, string Colour, string City)[] Cast =
    [
        ("Tomás Herrera", "teammate-11", "Mexico City"),
        ("Jordan Lee", "teammate-12", "Austin"),
        ("Chloé Martin", "teammate-10", "São Paulo"),
        ("Luca Ferri", "teammate-13", "Milan"),
        ("Priya Raman", "teammate-7", "Bengaluru"),
        ("Aiko Tanaka", "teammate-8", "Tokyo"),
        ("Noah Williams", "teammate-9", "Melbourne"),
        ("Ahmed Al-Sayed", "teammate-6", "Dubai"),
        ("Kwame Mensah", "teammate-5", "Accra"),
        ("Lena Fischer", "teammate-4", "Berlin"),
        ("Liam O’Connor", "teammate-3", "Dublin"),
        ("Mara Lindqvist", "teammate-2", "Stockholm"),
    ];

    private static readonly (string Name, string CountryCode, string Region, double Latitude, double Longitude, string TimeZoneId)[] Cities =
    [
        ("Mexico City", "MX", "Mexico City", 19.4326, -99.1332, "America/Mexico_City"),
        ("Austin", "US", "Texas", 30.2672, -97.7431, "America/Chicago"),
        ("São Paulo", "BR", "São Paulo", -23.5505, -46.6333, "America/Sao_Paulo"),
        ("Dublin", "IE", "Leinster", 53.3498, -6.2603, "Europe/Dublin"),
        ("Accra", "GH", "Greater Accra", 5.6037, -0.1870, "Africa/Accra"),
        ("Milan", "IT", "Lombardy", 45.4642, 9.19, "Europe/Rome"),
        ("Berlin", "DE", "State of Berlin", 52.52, 13.405, "Europe/Berlin"),
        ("Stockholm", "SE", "Stockholm", 59.3293, 18.0686, "Europe/Stockholm"),
        ("Dubai", "AE", "Dubai", 25.2048, 55.2708, "Asia/Dubai"),
        ("Bengaluru", "IN", "Karnataka", 12.9716, 77.5946, "Asia/Kolkata"),
        ("Tokyo", "JP", "Tokyo", 35.6762, 139.6503, "Asia/Tokyo"),
        ("Melbourne", "AU", "Victoria", -37.8136, 144.9631, "Australia/Melbourne"),
    ];

    public async Task SeedAsync(IAppDbContext database, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(database);
        if (await database.Teams.AnyAsync(team => team.InviteToken == InviteToken, cancellationToken))
        {
            return;
        }

        var known = await database.Cities.ToListAsync(cancellationToken);
        var cities = new Dictionary<string, City>();
        foreach (var (name, countryCode, region, latitude, longitude, timeZoneId) in Cities)
        {
            var city = known.FirstOrDefault(c => c.Name == name && c.CountryCode == countryCode);
            if (city is null)
            {
                city = new City(Guid.NewGuid(), name, countryCode, new Position(latitude, longitude), timeZoneId, region: region);
                database.Cities.Add(city);
            }

            cities[name] = city;
        }

        var team = new Team(Guid.NewGuid(), "Northwind", InviteToken);
        for (var i = 0; i < Cast.Length; i++)
        {
            var (name, colour, city) = Cast[i];
            team.Add(Guid.NewGuid(), name, colour, cities[city], FirstJoined.AddDays(i));
        }

        database.Teams.Add(team);
    }
}
