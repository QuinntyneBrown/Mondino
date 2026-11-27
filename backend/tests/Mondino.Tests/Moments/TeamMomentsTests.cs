// Acceptance Test
// Traces to: L2-020, L2-049
// Description: A team's moments are read through the API, one for each teammate a moment belongs to, from today in each moment's own place, and a failing calendar never fails the read

using System.Net;
using System.Text.Json;
using Mondino.Domain.Moments;
using Mondino.Tests.Support;

namespace Mondino.Tests.Moments;

public sealed class TeamMomentsTests
{
    [Fact]
    public async Task A_teammate_in_Dublin_has_the_October_Bank_Holiday_today()
    {
        // Given Liam lives in Dublin and the October Bank Holiday is on 27 October
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.Calendars.HasHoliday("October Bank Holiday", new DateOnly(2025, 10, 27), "IE", detail: "Office closed in Ireland today");
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When Sofia reads the team's moments
        var moments = await MomentsAsync(client, sofia);

        // Then Liam has a holiday titled "October Bank Holiday", dated 27 October, in Dublin
        var moment = Assert.Single(moments);
        Assert.Equal("Liam O’Connor", moment.GetProperty("teammateName").GetString());
        Assert.Equal("holiday", moment.GetProperty("kind").GetString());
        Assert.Equal("October Bank Holiday", moment.GetProperty("title").GetString());
        Assert.Equal("2025-10-27", moment.GetProperty("date").GetString());
        Assert.Equal("Office closed in Ireland today", moment.GetProperty("detail").GetString());
        Assert.Equal("Dublin", moment.GetProperty("cityName").GetString());
        Assert.Equal("IE", moment.GetProperty("countryCode").GetString());
        Assert.Equal("Europe/Dublin", moment.GetProperty("timeZoneId").GetString());
        Assert.Equal(JsonValueKind.Null, moment.GetProperty("emblemKey").ValueKind);

        // And it carries no postal code and no position
        Assert.False(moment.TryGetProperty("postalCode", out _));
        Assert.False(moment.TryGetProperty("position", out _));
    }

    [Fact]
    public async Task The_Italian_Grand_Prix_weekend_and_its_ticket_sale_belong_to_Milan_and_not_to_Austin()
    {
        // Given Sofia and Luca live in Milan and Jordan in Austin, and the Italian Grand Prix's
        // calendar has its tickets going on sale on 12 November and a race weekend on 30 November
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.Calendars.HasRace("Monza tickets on sale", new DateOnly(2025, 11, 12), "IT", "Italian GP 2026 general sale opens at 10:00");
        api.Calendars.HasRace("Italian Grand Prix", new DateOnly(2025, 11, 30), "IT");
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When Sofia reads the team's moments
        var moments = await MomentsAsync(client, sofia);

        // Then both are Formula 1 moments for each teammate in Milan, each naming its teammate,
        // in date order, and for no one in Austin
        Assert.All(moments, moment => Assert.Equal("formula-1", moment.GetProperty("kind").GetString()));
        Assert.All(moments, moment => Assert.Equal("Milan", moment.GetProperty("cityName").GetString()));
        Assert.Equal(
            ["Monza tickets on sale", "Monza tickets on sale", "Italian Grand Prix", "Italian Grand Prix"],
            moments.Select(moment => moment.GetProperty("title").GetString()));
        var tickets = moments.Where(moment => moment.GetProperty("date").GetString() == "2025-11-12").ToList();
        Assert.Equal(
            ["Luca Ferri", "Sofia Bianchi"],
            tickets.Select(moment => moment.GetProperty("teammateName").GetString()).Order(StringComparer.Ordinal));
        Assert.Contains(tickets, moment => moment.GetProperty("teammateId").GetGuid() == sofia.TeammateId);
        Assert.DoesNotContain(moments, moment => moment.GetProperty("teammateName").GetString() == "Jordan Lee");
    }

    [Fact]
    public async Task A_Raptors_home_game_belongs_to_Toronto_and_Mississauga_and_not_to_Ottawa()
    {
        // Given teammates in Mississauga, Toronto and Ottawa, and a Raptors home game in Toronto
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.Calendars.HasEvent(MomentKind.Sport, "Raptors home game", new DateOnly(2025, 10, 29), "CA", 43.6435, -79.3791, "Raptors vs. Celtics at Scotiabank Arena");
        using var client = api.CreateSecureClient();
        var mira = await api.JoinNorthwindFromAsync(client, "Mira Shah", "CA", "L5B 1M2", KnownCities.Mississauga);
        await api.JoinNorthwindFromAsync(client, "Theo Grant", "CA", "M5V 2T6", KnownCities.Toronto);
        await api.JoinNorthwindFromAsync(client, "Ana Roy", "CA", "K1P 1J1", KnownCities.Ottawa);

        // When the moments are read
        var moments = await MomentsAsync(client, mira);

        // Then it is a sport moment for the teammates in Mississauga and Toronto, and not in Ottawa
        Assert.All(moments, moment => Assert.Equal("sport", moment.GetProperty("kind").GetString()));
        Assert.Equal(
            ["Mira Shah", "Theo Grant"],
            moments.Select(moment => moment.GetProperty("teammateName").GetString()).Order(StringComparer.Ordinal));
    }

    [Fact]
    public async Task A_holiday_of_Lombardy_belongs_to_Milan_and_not_to_Rome()
    {
        // Given Sofia in Milan, a teammate in Rome, and a holiday of Lombardy alone
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.Calendars.HasHoliday("Festa di Lombardia", new DateOnly(2025, 11, 3), "IT", region: "Lombardy");
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        await api.JoinNorthwindFromAsync(client, "Giulia Conti", "IT", "00184", KnownCities.Rome);

        // When the moments are read
        var moments = await MomentsAsync(client, sofia);

        // Then it belongs to each teammate in Milan, and to no one in Rome
        Assert.Equal(
            ["Luca Ferri", "Sofia Bianchi"],
            moments.Select(moment => moment.GetProperty("teammateName").GetString()).Order(StringComparer.Ordinal));
    }

    [Fact]
    public async Task Today_is_the_date_in_the_moments_own_place()
    {
        // Given it is 14:00 UTC on 3 November: 01:00 on 4 November in Melbourne, 15:00 on 3 November in Milan
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.Calendars.HasEvent(MomentKind.Sport, "Melbourne Cup Day", new DateOnly(2025, 11, 4), "AU", -37.8136, 144.9631);
        api.Calendars.HasEvent(MomentKind.LocalEvent, "Spring Racing Carnival opens", new DateOnly(2025, 11, 3), "AU", -37.8136, 144.9631);
        api.Calendars.HasEvent(MomentKind.LocalEvent, "Lantern walk in Brera", new DateOnly(2025, 11, 3), "IT", 45.4642, 9.19);
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        api.Time.SetUtcNow(new DateTimeOffset(2025, 11, 3, 14, 0, 0, TimeSpan.Zero));

        // When the moments are read
        var moments = await MomentsAsync(client, sofia);
        var titles = moments.Select(moment => moment.GetProperty("title").GetString()).ToList();

        // Then Melbourne's 4 November is today there and listed, its 3 November is past and not,
        // and Milan's 3 November is still today in Milan
        Assert.Contains("Melbourne Cup Day", titles);
        Assert.DoesNotContain("Spring Racing Carnival opens", titles);
        Assert.Contains("Lantern walk in Brera", titles);
    }

    [Fact]
    public async Task A_moment_more_than_90_days_ahead_is_not_read()
    {
        // Given Liam's country has holidays 90 and 91 days ahead
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.Calendars.HasHoliday("Ninety days", new DateOnly(2025, 10, 27).AddDays(90), "IE");
        api.Calendars.HasHoliday("Ninety-one days", new DateOnly(2025, 10, 27).AddDays(91), "IE");
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When the moments are read
        var moments = await MomentsAsync(client, sofia);

        // Then only the first is there
        Assert.Equal("Ninety days", Assert.Single(moments).GetProperty("title").GetString());
    }

    [Fact]
    public async Task A_failing_calendar_never_fails_the_read()
    {
        // Given the holiday calendar is down, and the race calendar still answers
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.Calendars.HasHoliday("October Bank Holiday", new DateOnly(2025, 10, 27), "IE");
        api.Calendars.HasRace("Monza tickets on sale", new DateOnly(2025, 11, 12), "IT");
        api.Calendars.HolidaysFail = true;
        api.Calendars.EventsFail = true;
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When the moments are read
        var moments = await MomentsAsync(client, sofia);

        // Then the read succeeds with the race calendar's moments
        Assert.Equal(["Monza tickets on sale", "Monza tickets on sale"], moments.Select(moment => moment.GetProperty("title").GetString()));
    }

    [Fact]
    public async Task Each_calendar_is_asked_once_per_city_about_a_place_and_nothing_else()
    {
        // Given Northwind's twelve teammates in twelve cities, and Sofia joining in Milan, where Luca lives
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When the moments are read
        await MomentsAsync(client, sofia);

        // Then each calendar is asked about a country or a position, never a name or a team
        var asked = api.Calendars.Asked;
        Assert.Contains("holidays IE", asked);
        Assert.Contains("races IT", asked);
        Assert.Contains("events 45.46,9.19", asked);
        Assert.All(asked, what => Assert.Matches(@"^(holidays [A-Z]{2}|races [A-Z]{2}|events -?\d+(\.\d+)?,-?\d+(\.\d+)?)$", what));

        // And once for each city the team's thirteen teammates live in, never once per teammate:
        // thirteen, as the seed's Milan and the city directory's Milan, where Sofia joined, are two
        Assert.Equal(13, asked.Count(what => what.StartsWith("holidays", StringComparison.Ordinal)));
    }

    [Fact]
    public async Task A_title_and_a_detail_from_a_calendar_are_plain_text_cut_to_80_and_160_characters()
    {
        // Given an event whose title is markup 100 characters long and whose detail is 200 characters
        await using var api = new MondinoApi();
        await api.SeedAsync();
        var title = "<img src=x onerror=alert(1)>" + new string('t', 72);
        var detail = "<b>" + new string('d', 197);
        api.Calendars.HasEvent(MomentKind.LocalEvent, title, new DateOnly(2025, 10, 30), "IT", 45.4642, 9.19, detail);
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When the moments are read
        var moment = (await MomentsAsync(client, sofia)).First();

        // Then the title is its first 79 characters and an ellipsis, as the literal characters, and
        // the detail its first 159 and an ellipsis
        Assert.Equal(title[..79] + "…", moment.GetProperty("title").GetString());
        Assert.Equal(detail[..159] + "…", moment.GetProperty("detail").GetString());
    }

    private static async Task<List<JsonElement>> MomentsAsync(HttpClient client, Session session)
    {
        using var response = await client.SendAsync(session.Request(HttpMethod.Get, $"/api/teams/{session.TeamId}/moments"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        return [.. body.EnumerateArray().Select(element => element.Clone())];
    }
}
