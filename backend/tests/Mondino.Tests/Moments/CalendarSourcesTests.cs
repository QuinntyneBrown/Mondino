// Acceptance Test
// Traces to: L2-020, L2-049, L2-050
// Description: The seeded team's moments are the cast's, from Mondino's own calendar and the public holiday source; the source is given a country and a year, kept 24 hours, given up after 5 seconds and left alone for 30 seconds after 5 failures, and while it fails the last holidays it gave are kept beside every other kind

using System.Net;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Moments;

public sealed class CalendarSourcesTests
{
    /// <summary>The cast's moments (docs/mocks/README.md), in date order: date, teammate, kind, title, detail.</summary>
    private static readonly (string Date, string Teammate, string Kind, string Title, string Detail)[] Cast =
    [
        ("2025-10-27", "Liam O’Connor", "holiday", "October Bank Holiday", "Office closed in Ireland today"),
        ("2025-10-31", "Jordan Lee", "local-event", "Halloween on 6th Street", "Costume crawl downtown — expect a slow Friday"),
        ("2025-11-01", "Tomás Herrera", "holiday", "Día de Muertos", "Ofrendas, marigolds and the big parade on Reforma"),
        ("2025-11-01", "Priya Raman", "holiday", "Karnataka Rajyotsava", "State formation day — yellow and red flags everywhere"),
        ("2025-11-01", "Mara Lindqvist", "holiday", "Alla helgons dag", "All Saints’ Day — candles in every cemetery"),
        ("2025-11-02", "Tomás Herrera", "sport", "Clásico Nacional", "América vs. Chivas at the Azteca, 19:00 local"),
        ("2025-11-03", "Aiko Tanaka", "holiday", "Culture Day", "Bunka no Hi — public holiday in Japan"),
        ("2025-11-04", "Noah Williams", "sport", "Melbourne Cup Day", "The race that stops a nation — public holiday"),
        ("2025-11-09", "Chloé Martin", "formula-1", "São Paulo Grand Prix", "Race day at Interlagos, 14:00 local"),
        ("2025-11-11", "Lena Fischer", "local-event", "St. Martin’s lantern walk", "Kids’ lantern parades across Mitte"),
        ("2025-11-12", "Luca Ferri", "formula-1", "Monza tickets on sale", "Italian GP 2026 general sale opens at 10:00"),
        ("2025-11-12", "Sofia Bianchi", "formula-1", "Monza tickets on sale", "Italian GP 2026 general sale opens at 10:00"),
        ("2025-12-02", "Ahmed Al-Sayed", "holiday", "UAE National Day", "Long weekend across the Emirates"),
        ("2025-12-05", "Kwame Mensah", "holiday", "Farmers’ Day", "National holiday honouring Ghana’s farmers"),
        ("2025-12-07", "Ahmed Al-Sayed", "formula-1", "Abu Dhabi Grand Prix", "Season finale at Yas Marina, 17:00 local"),
    ];

    [Fact]
    public async Task The_seeded_teams_moments_are_the_casts_each_naming_its_teammate()
    {
        // Given the seeded Northwind with Sofia, the real calendars, and a public holiday source that
        // has Ireland's and Sweden's holidays under names of its own
        await using var api = new MondinoApi { UsesCalendars = true };
        await api.SeedAsync();
        api.OpenHolidays.Holds("IE", "2025-10-27", "October Holiday");
        api.OpenHolidays.Holds("SE", "2025-11-01", "All Saints' Day");
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When Sofia reads the team's moments
        var moments = await MomentsAsync(client, sofia);

        // Then they are the cast's, in date order, each naming its teammate, with Mondino's own
        // words kept where the public source has the same holiday
        static string Line(string date, string? teammate, string? kind, string? title, string? detail) =>
            $"{date} {teammate} {kind} {title} · {detail}";
        Assert.Equal(
            Cast.Select(c => Line(c.Date, c.Teammate, c.Kind, c.Title, c.Detail)).Order(StringComparer.Ordinal),
            moments.Select(m => Line(
                m.GetProperty("date").GetString()!,
                m.GetProperty("teammateName").GetString(),
                m.GetProperty("kind").GetString(),
                m.GetProperty("title").GetString(),
                m.GetProperty("detail").GetString())).Order(StringComparer.Ordinal));
        var dates = moments.Select(m => m.GetProperty("date").GetString()!).ToList();
        Assert.Equal(dates.Order(StringComparer.Ordinal), dates);
    }

    [Fact]
    public async Task A_public_regional_holiday_is_named_by_its_region_and_belongs_there_only()
    {
        // Given the public source has a holiday of Lombardy, and a teammate lives in Rome
        await using var api = new MondinoApi { UsesCalendars = true };
        await api.SeedAsync();
        api.OpenHolidays.Names("IT", "IT-LO", "Lombardy");
        api.OpenHolidays.Names("IT", "IT-LA", "Lazio");
        api.OpenHolidays.Holds("IT", "2025-12-07", "St. Ambrose", "IT-LO");
        api.OpenHolidays.Holds("IT", "2025-12-08", "Immaculate Conception");
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        await api.JoinNorthwindFromAsync(client, "Giulia Conti", "IT", "00184", KnownCities.Rome);

        // When the moments are read
        var moments = await MomentsAsync(client, sofia);

        // Then St. Ambrose is a holiday of each teammate in Milan, "Public holiday in Lombardy", and
        // the national holiday is everyone's in Italy, "Public holiday in Italy"
        string[] Of(string title) => [.. moments
            .Where(m => m.GetProperty("title").GetString() == title)
            .Select(m => $"{m.GetProperty("teammateName").GetString()} · {m.GetProperty("detail").GetString()}")
            .Order(StringComparer.Ordinal)];
        Assert.Equal(["Luca Ferri · Public holiday in Lombardy", "Sofia Bianchi · Public holiday in Lombardy"], Of("St. Ambrose"));
        Assert.Equal(
            ["Giulia Conti · Public holiday in Italy", "Luca Ferri · Public holiday in Italy", "Sofia Bianchi · Public holiday in Italy"],
            Of("Immaculate Conception"));
    }

    [Fact]
    public async Task The_source_is_given_a_country_and_a_year_and_a_year_is_kept_24_hours()
    {
        // Given the real calendars
        await using var api = new MondinoApi { UsesCalendars = true };
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When the moments are read twice
        await MomentsAsync(client, sofia);
        var first = api.OpenHolidays.Requests.Count;
        await MomentsAsync(client, sofia);

        // Then the source was asked only about the countries it covers, by country, language and
        // year, for the public holidays and the subdivisions' names, and nothing else
        var addresses = api.OpenHolidays.Requests.Select(r => r.RequestUri!.PathAndQuery).ToList();
        Assert.All(addresses, address => Assert.Matches(
            @"^/(PublicHolidays\?countryIsoCode=[A-Z]{2}&languageIsoCode=EN&validFrom=\d{4}-01-01&validTo=\d{4}-12-31|Subdivisions\?countryIsoCode=[A-Z]{2}&languageIsoCode=EN)$",
            address));
        Assert.Equal(
            ["BR", "DE", "IE", "IT", "MX", "SE"],
            addresses.Select(a => a.Split("countryIsoCode=")[1][..2]).Distinct().Order(StringComparer.Ordinal));
        Assert.All(api.OpenHolidays.Requests, r => Assert.DoesNotContain(r.Headers, h => h.Key == "Cookie"));

        // And the second read asked nothing: each country's year is kept
        Assert.Equal(first, api.OpenHolidays.Requests.Count);

        // And after 24 hours it is asked again
        api.Time.Advance(TimeSpan.FromHours(24));
        await MomentsAsync(client, sofia);
        Assert.True(api.OpenHolidays.Requests.Count > first);
    }

    [Fact]
    public async Task A_source_that_does_not_answer_in_5_seconds_leaves_Mondinos_own_moments()
    {
        // Given the public holiday source does not answer
        await using var api = new MondinoApi { UsesCalendars = true };
        await api.SeedAsync();
        api.OpenHolidays.Behaviour = SourceBehaviour.Hangs;
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When the moments are read and 5 seconds pass
        var reading = MomentsAsync(client, sofia);
        await api.OpenHolidays.WaitForRequestsAsync(12);
        api.Time.Advance(TimeSpan.FromSeconds(5));
        var moments = await reading;

        // Then the read succeeds with the cast's moments, from Mondino's own calendar
        Assert.Equal(Cast.Length, moments.Count);
    }

    [Fact]
    public async Task After_5_failures_in_a_row_the_source_is_left_alone_for_30_seconds()
    {
        // Given the public holiday source fails
        await using var api = new MondinoApi { UsesCalendars = true };
        await api.SeedAsync();
        api.OpenHolidays.Behaviour = SourceBehaviour.Fails;
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When the moments are read: six countries it covers for two years, failing, which opens the breaker
        var moments = await MomentsAsync(client, sofia);
        var asked = api.OpenHolidays.Requests.Count;
        Assert.Equal(Cast.Length, moments.Count);

        // Then a read within 30 seconds asks nothing, and still answers
        api.Time.Advance(TimeSpan.FromSeconds(29));
        Assert.Equal(Cast.Length, (await MomentsAsync(client, sofia)).Count);
        Assert.Equal(asked, api.OpenHolidays.Requests.Count);

        // And once 30 seconds have passed it is asked again
        api.Time.Advance(TimeSpan.FromSeconds(1));
        await MomentsAsync(client, sofia);
        Assert.True(api.OpenHolidays.Requests.Count > asked);
    }

    [Theory]
    [InlineData(SourceBehaviour.Fails)]
    [InlineData(SourceBehaviour.Hangs)]
    public async Task While_the_source_fails_the_last_holidays_it_gave_are_kept_and_every_other_kind_is_given(SourceBehaviour behaviour)
    {
        // Given the public holiday source gave Italy's Immaculate Conception yesterday
        await using var api = new MondinoApi { UsesCalendars = true };
        await api.SeedAsync();
        api.OpenHolidays.Holds("IT", "2025-12-08", "Immaculate Conception");
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        Assert.Contains("Immaculate Conception", Titles(await MomentsAsync(client, sofia)));

        // When a day later the source fails (or does not answer in 5 seconds) and the moments are read
        api.Time.Advance(TimeSpan.FromHours(25));
        api.OpenHolidays.Behaviour = behaviour;
        var asked = api.OpenHolidays.Requests.Count;
        var reading = MomentsAsync(client, sofia);
        if (behaviour == SourceBehaviour.Hangs)
        {
            // Each of the six countries it covers is asked again for its two years
            await api.OpenHolidays.WaitForRequestsAsync(asked + 12);
            api.Time.Advance(TimeSpan.FromSeconds(5));
        }

        var moments = await reading.WaitAsync(TimeSpan.FromSeconds(10));

        // Then the source was asked, and the holiday it gave before is still there
        Assert.True(api.OpenHolidays.Requests.Count > asked);
        var titles = Titles(moments);
        Assert.Contains("Immaculate Conception", titles);

        // And moments of every other kind are given: Formula 1, local events and sport
        Assert.Contains("Monza tickets on sale", titles);
        Assert.Contains("Halloween on 6th Street", titles);
        Assert.Contains("Clásico Nacional", titles);

        // And while its breaker is open the holiday is still given, with no call
        asked = api.OpenHolidays.Requests.Count;
        Assert.Contains("Immaculate Conception", Titles(await MomentsAsync(client, sofia)));
        Assert.Equal(asked, api.OpenHolidays.Requests.Count);
    }

    private static List<string?> Titles(List<JsonElement> moments) =>
        [.. moments.Select(m => m.GetProperty("title").GetString())];

    private static async Task<List<JsonElement>> MomentsAsync(HttpClient client, Session session)
    {
        using var response = await client.SendAsync(session.Request(HttpMethod.Get, $"/api/teams/{session.TeamId}/moments"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        return [.. body.EnumerateArray().Select(element => element.Clone())];
    }
}
