using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Mondino.Application.Joining;
using Mondino.Domain.Moments;

namespace Mondino.Infrastructure.Moments;

/// <summary>
/// The public holidays of the OpenHolidays API (docs/adr/0019, ODbL). It is given a country and a
/// calendar year and nothing else (L2-050), and asked for the year's public holidays and the
/// English names of the country's subdivisions, by which a regional holiday names its region. It
/// is asked only for the countries it covers. Any failure is null: no holidays from it.
/// </summary>
internal sealed class OpenHolidaysCalendar(IHttpClientFactory clients, IOptions<HolidaySourceOptions> options)
{
    public const string ClientName = "holiday-source";

    /// <summary>The countries OpenHolidays covers, of which Mondino's are BR, DE, IE, IT, MX and SE.</summary>
    public static readonly IReadOnlySet<string> Covers = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
    {
        "AD", "AL", "AT", "BE", "BG", "BR", "BY", "CH", "CZ", "DE", "EE", "ES", "FR", "HR", "HU", "IE", "IT", "LI",
        "LT", "LU", "LV", "MC", "MD", "MT", "MX", "NL", "PL", "PT", "RO", "RS", "SE", "SI", "SK", "SM", "VA", "ZA",
    };

    public async Task<IReadOnlyList<CalendarEntry>?> YearAsync(string countryCode, int year, CancellationToken cancellationToken)
    {
        var country = countryCode.ToUpperInvariant();
        var client = clients.CreateClient(ClientName);
        var holidaysAddress = new Uri(
            options.Value.BaseAddress,
            $"PublicHolidays?countryIsoCode={country}&languageIsoCode=EN"
            + $"&validFrom={year.ToString(CultureInfo.InvariantCulture)}-01-01&validTo={year.ToString(CultureInfo.InvariantCulture)}-12-31");
        var subdivisionsAddress = new Uri(options.Value.BaseAddress, $"Subdivisions?countryIsoCode={country}&languageIsoCode=EN");

        IReadOnlyList<Holiday>? holidays;
        IReadOnlyList<Subdivision>? subdivisions;
        try
        {
            holidays = await ReadAsync<IReadOnlyList<Holiday>>(client, holidaysAddress, cancellationToken);
            subdivisions = await ReadAsync<IReadOnlyList<Subdivision>>(client, subdivisionsAddress, cancellationToken);
        }
        catch (Exception exception) when (exception is HttpRequestException or System.Text.Json.JsonException
                                              or NotSupportedException)
        {
            return null;
        }

        if (holidays is null || subdivisions is null)
        {
            return null;
        }

        var names = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        foreach (var subdivision in subdivisions.SelectMany(Flatten))
        {
            if (subdivision.Code is { } code && English(subdivision.Name) is { } name)
            {
                names[code] = name;
            }
        }

        var countryName = PostalCodeFormats.Find(country)?.CountryName ?? country;
        var entries = new List<CalendarEntry>();
        foreach (var holiday in holidays)
        {
            if (!string.Equals(holiday.Type, "Public", StringComparison.OrdinalIgnoreCase)
                || English(holiday.Name) is not { } title
                || !DateOnly.TryParseExact(holiday.StartDate, "yyyy-MM-dd", CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            {
                continue;
            }

            if (holiday.Nationwide || holiday.Subdivisions is not { Count: > 0 })
            {
                entries.Add(new CalendarEntry(MomentKind.Holiday, title, date, $"Public holiday in {countryName}", country, null, null, null));
                continue;
            }

            // A regional holiday, once for each subdivision it is kept in that has a name.
            foreach (var code in holiday.Subdivisions.Select(s => s.Code).OfType<string>())
            {
                if (names.TryGetValue(code, out var region))
                {
                    entries.Add(new CalendarEntry(MomentKind.Holiday, title, date, $"Public holiday in {region}", country, region, null, null));
                }
            }
        }

        return entries;
    }

    private static async Task<T?> ReadAsync<T>(HttpClient client, Uri address, CancellationToken cancellationToken)
    {
        using var response = await client.GetAsync(address, cancellationToken);
        return response.IsSuccessStatusCode
            ? await response.Content.ReadFromJsonAsync<T>(cancellationToken)
            : default;
    }

    private static IEnumerable<Subdivision> Flatten(Subdivision subdivision) =>
        new[] { subdivision }.Concat((subdivision.Children ?? []).SelectMany(Flatten));

    private static string? English(IReadOnlyList<LocalisedText>? texts) =>
        texts?.FirstOrDefault(text => string.Equals(text.Language, "EN", StringComparison.OrdinalIgnoreCase))?.Text
        ?? (texts is { Count: > 0 } ? texts[0].Text : null);

    private sealed record LocalisedText(
        [property: JsonPropertyName("language")] string? Language,
        [property: JsonPropertyName("text")] string? Text);

    private sealed record SubdivisionCode([property: JsonPropertyName("code")] string? Code);

    private sealed record Holiday(
        [property: JsonPropertyName("startDate")] string? StartDate,
        [property: JsonPropertyName("type")] string? Type,
        [property: JsonPropertyName("name")] IReadOnlyList<LocalisedText>? Name,
        [property: JsonPropertyName("nationwide")] bool Nationwide,
        [property: JsonPropertyName("subdivisions")] IReadOnlyList<SubdivisionCode>? Subdivisions);

    private sealed record Subdivision(
        [property: JsonPropertyName("code")] string? Code,
        [property: JsonPropertyName("name")] IReadOnlyList<LocalisedText>? Name,
        [property: JsonPropertyName("children")] IReadOnlyList<Subdivision>? Children);
}
