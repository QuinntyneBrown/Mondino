using System.Globalization;
using System.IO.Compression;
using System.Text;
using Mondino.Application.Cities;
using Mondino.Domain.Teams;

namespace Mondino.Infrastructure.Cities;

/// <summary>
/// The cities Mondino holds itself: GeoNames' places of 15,000 people or more in the thirteen
/// supported countries, read once from the embedded <c>cities.tsv.gz</c> (docs/adr/0006,
/// tools/cities). Held for the life of the process; it never grows.
/// </summary>
internal sealed class BundledCityDirectory : ICityDirectory
{
    private const string Resource = "Mondino.Infrastructure.Cities.cities.tsv.gz";

    private readonly Lazy<Index> index = new(Load);

    public IReadOnlyList<KnownCity> Search(string countryCode, string text, int max)
    {
        var folded = PlaceNames.Fold(text);
        if (folded.Length == 0 || !index.Value.ByCountry.TryGetValue(countryCode, out var cities))
        {
            return [];
        }

        return cities
            .Where(entry => entry.Folded.StartsWith(folded, StringComparison.Ordinal))
            .Select(entry => entry.City)
            .Take(max)
            .ToList();
    }

    public KnownCity? Find(string cityId) =>
        index.Value.ById.TryGetValue(cityId, out var city) ? city : null;

    public IReadOnlyList<KnownCity> InCountry(string countryCode) =>
        index.Value.ByCountry.TryGetValue(countryCode, out var cities) ? cities.Select(entry => entry.City).ToList() : [];

    private static Index Load()
    {
        using var stream = typeof(BundledCityDirectory).Assembly.GetManifestResourceStream(Resource)
            ?? throw new InvalidOperationException($"The city directory {Resource} is not embedded.");
        using var gzip = new GZipStream(stream, CompressionMode.Decompress);
        using var reader = new StreamReader(gzip, Encoding.UTF8);

        var all = new List<KnownCity>();
        while (reader.ReadLine() is { } line)
        {
            var f = line.Split('\t');
            if (f.Length < 8)
            {
                continue;
            }

            all.Add(new KnownCity(
                f[0], f[1], f[2], f[3],
                double.Parse(f[4], CultureInfo.InvariantCulture),
                double.Parse(f[5], CultureInfo.InvariantCulture),
                f[6],
                int.Parse(f[7], CultureInfo.InvariantCulture)));
        }

        // Largest first within a country, so a search lists the city people mean before its namesakes.
        var byCountry = all
            .GroupBy(city => city.CountryCode)
            .ToDictionary(
                group => group.Key,
                group => group
                    .OrderByDescending(city => city.Population)
                    .ThenBy(city => city.Name, StringComparer.Ordinal)
                    .Select(city => new Entry(city, PlaceNames.Fold(city.Name)))
                    .ToArray());
        return new Index(byCountry, all.ToDictionary(city => city.CityId));
    }

    private sealed record Entry(KnownCity City, string Folded);

    private sealed record Index(IReadOnlyDictionary<string, Entry[]> ByCountry, IReadOnlyDictionary<string, KnownCity> ById);
}
