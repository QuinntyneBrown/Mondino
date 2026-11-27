using Mondino.Application.Cities;
using Mondino.Application.Joining;

namespace Mondino.Tests.Support;

/// <summary>
/// The postal code source, answering as the test tells it: the postal codes it knows, or down.
/// It records what it was asked, as "IT 20121", in the canonical spelling it was given.
/// </summary>
public sealed class FakePostalCodeLookup : IPostalCodeLookup
{
    private readonly Dictionary<string, KnownCity> known = [];
    private readonly List<string> asked = [];

    public bool IsDown { get; set; }

    public IReadOnlyList<string> Asked
    {
        get
        {
            lock (asked)
            {
                return [.. asked];
            }
        }
    }

    public void Knows(string countryCode, string postalCode, KnownCity city) => known[$"{countryCode} {postalCode}"] = city;

    public Task<PostalCodeLookupOutcome> FindCityAsync(PostalCode postalCode, CancellationToken cancellationToken)
    {
        var key = $"{postalCode.CountryCode} {postalCode.Value}";
        lock (asked)
        {
            asked.Add(key);
        }

        if (IsDown)
        {
            return Task.FromResult(PostalCodeLookupOutcome.Unavailable);
        }

        return Task.FromResult(known.TryGetValue(key, out var city)
            ? PostalCodeLookupOutcome.Found(city)
            : PostalCodeLookupOutcome.NotFound);
    }
}

/// <summary>Cities as the city directory holds them (GeoNames, docs/adr/0006).</summary>
public static class KnownCities
{
    public static readonly KnownCity Austin = new("4671654", "Austin", "Texas", "US", 30.26715, -97.74306, "America/Chicago", 961855);
    public static readonly KnownCity Milan = new("3173435", "Milan", "Lombardy", "IT", 45.46427, 9.18951, "Europe/Rome", 1371498);
    public static readonly KnownCity Mississauga = new("6075357", "Mississauga", "Ontario", "CA", 43.5789, -79.6583, "America/Toronto", 717961);
    public static readonly KnownCity Ottawa = new("6094817", "Ottawa", "Ontario", "CA", 45.41117, -75.69812, "America/Toronto", 812129);
    public static readonly KnownCity Rome = new("3169070", "Rome", "Lazio", "IT", 41.89193, 12.51133, "Europe/Rome", 2318895);
    public static readonly KnownCity Toronto = new("6167865", "Toronto", "Ontario", "CA", 43.65333, -79.38389, "America/Toronto", 2794356);
}
