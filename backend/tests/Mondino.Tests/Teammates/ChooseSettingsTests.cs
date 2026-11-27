// Acceptance Test
// Traces to: L2-033, L2-034, L2-035, L2-019, L2-022, L2-044
// Description: A teammate's settings start from their country, are saved from Profile & Settings and read back on a later visit; what a teammate switched off reaches no other teammate; a setting outside its values, or a save without the antiforgery token, stores nothing; no one changes another teammate's settings

using System.Net;
using System.Text.Json;
using Mondino.Domain.Teams;
using Mondino.Tests.Support;

namespace Mondino.Tests.Teammates;

public sealed class ChooseSettingsTests
{
    [Fact]
    public async Task A_new_teammates_settings_start_from_their_country()
    {
        // Given Sofia joins Northwind from Milan, Liam makes Southwind from Toronto, and Jordan joins Northwind from Austin
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        var liam = await api.MakeTeamAsync(client);
        var jordan = await api.JoinNorthwindFromAsync(client, "Jordan Lee", "US", "78701", KnownCities.Austin);

        // When each reads their own profile
        var sofias = await SettingsAsync(client, sofia);
        var liams = await SettingsAsync(client, liam);
        var jordans = await SettingsAsync(client, jordan);

        // Then Sofia's are °C and the 24-hour clock, Liam's °C and the 12-hour clock, Jordan's °F and the 12-hour clock
        Assert.Equal(("celsius", "24-hour"), (Unit(sofias), Clock(sofias)));
        Assert.Equal(("celsius", "12-hour"), (Unit(liams), Clock(liams)));
        Assert.Equal(("fahrenheit", "12-hour"), (Unit(jordans), Clock(jordans)));

        // And each has every kind of moment on and shares their weather and status
        foreach (var settings in new[] { sofias, liams, jordans })
        {
            Assert.Equal(["holiday", "formula-1", "local-event", "sport"], Kinds(settings));
            Assert.True(settings.GetProperty("sharesWeather").GetBoolean());
            Assert.True(settings.GetProperty("sharesStatus").GetBoolean());
        }
    }

    [Fact]
    public async Task Saved_settings_are_her_own_and_are_read_back_on_a_later_day()
    {
        // Given Sofia is in Milan
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When she saves °F, the 12-hour clock, no Formula 1 and her status unshared, with no location
        using var response = await client.SendAsync(Save(sofia, new
        {
            settings = Settings("fahrenheit", "12-hour", ["holiday", "local-event", "sport"], sharesWeather: true, sharesStatus: false),
        }));

        // Then the answer carries them, and her pin and postal code are where they were
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var saved = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        AssertSettings(saved.RootElement.GetProperty("settings"), "fahrenheit", "12-hour", ["holiday", "local-event", "sport"], true, false);
        Assert.Equal("Milan", saved.RootElement.GetProperty("pin").GetProperty("cityName").GetString());
        Assert.Equal("20121", saved.RootElement.GetProperty("postalCode").GetString());

        // And when she comes back the next day, her profile carries them still
        api.Time.Advance(TimeSpan.FromDays(1));
        AssertSettings(await SettingsAsync(client, sofia), "fahrenheit", "12-hour", ["holiday", "local-event", "sport"], true, false);
    }

    [Fact]
    public async Task What_a_teammate_switched_off_reaches_no_other_teammate_and_she_still_sees_her_own()
    {
        // Given Sofia and Marco are in Milan, where it is 13 °C and foggy
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.Weather.ReportsEverywhere(13, WeatherCondition.Fog);
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        var marco = await api.JoinNorthwindAsync(client, "Marco Rossi");

        // When Sofia turns off both sharing switches and saves
        using var response = await client.SendAsync(Save(sofia, new
        {
            settings = Settings("celsius", "24-hour", ["holiday", "formula-1", "local-event", "sport"], sharesWeather: false, sharesStatus: false),
        }));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Then Marco's read of the team carries no weather and no status for her, and never her switches
        using var marcos = await client.SendAsync(marco.Request(HttpMethod.Get, $"/api/teams/{marco.TeamId}/pins"));
        var body = await marcos.Content.ReadAsStringAsync();
        var hers = PinOf(body, sofia.TeammateId);
        Assert.Equal(JsonValueKind.Null, hers.GetProperty("weather").ValueKind);
        Assert.Equal("NotShared", hers.GetProperty("weatherState").GetString());
        Assert.False(hers.GetProperty("sharesStatus").GetBoolean());
        Assert.Equal("Europe/Rome", hers.GetProperty("timeZoneId").GetString());
        Assert.DoesNotContain("sharesWeather", body, StringComparison.Ordinal);
        Assert.DoesNotContain("temperatureUnit", body, StringComparison.Ordinal);

        // And her own read of the team still carries her weather and her status
        using var own = await client.SendAsync(sofia.Request(HttpMethod.Get, $"/api/teams/{sofia.TeamId}/pins"));
        var mine = PinOf(await own.Content.ReadAsStringAsync(), sofia.TeammateId);
        Assert.Equal(13, mine.GetProperty("weather").GetProperty("temperatureC").GetDouble());
        Assert.True(mine.GetProperty("sharesStatus").GetBoolean());

        // And Marco's own profile is his alone: his switches are on
        var marcosSettings = await SettingsAsync(client, marco);
        Assert.True(marcosSettings.GetProperty("sharesWeather").GetBoolean());
    }

    [Theory]
    [InlineData("kelvin", "24-hour", new[] { "holiday" }, 400, "invalid_request")]
    [InlineData("celsius", "13-hour", new[] { "holiday" }, 400, "invalid_request")]
    [InlineData("celsius", "24-hour", new[] { "holiday", "parade" }, 400, "invalid_request")]
    [InlineData("celsius", "24-hour", new[] { "holiday", "holiday" }, 400, "validation_failed")]
    public async Task A_setting_outside_its_values_is_refused_and_nothing_is_stored(
        string unit, string clock, string[] kinds, int status, string code)
    {
        // Given Sofia is in Milan with the settings of her country
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When she saves a setting outside its values, with her status unshared
        using var response = await client.SendAsync(Save(sofia, new
        {
            settings = Settings(unit, clock, kinds, sharesWeather: true, sharesStatus: false),
        }));

        // Then it is refused with its code, and nothing is stored
        Assert.Equal(status, (int)response.StatusCode);
        using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(code, problem.RootElement.GetProperty("code").GetString());
        AssertSettings(await SettingsAsync(client, sofia), "celsius", "24-hour", ["holiday", "formula-1", "local-event", "sport"], true, true);
    }

    [Fact]
    public async Task A_new_location_that_cannot_be_found_stores_no_setting_either()
    {
        // Given Sofia is in Milan, and M5V 9Z9 is nowhere
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When she saves it with °F
        using var response = await client.SendAsync(Save(sofia, new
        {
            countryCode = "CA",
            postalCode = "M5V 9Z9",
            settings = Settings("fahrenheit", "24-hour", ["holiday", "formula-1", "local-event", "sport"], sharesWeather: true, sharesStatus: true),
        }));

        // Then it is refused, and her unit is still °C
        Assert.Equal(422, (int)response.StatusCode);
        Assert.Equal("celsius", Unit(await SettingsAsync(client, sofia)));
    }

    [Fact]
    public async Task A_save_without_the_antiforgery_token_is_refused_and_nothing_is_stored()
    {
        // Given Sofia is in Milan
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When her browser sends °F without the antiforgery token
        using var request = sofia.Request(
            HttpMethod.Put,
            $"/api/teams/{sofia.TeamId}/me",
            new { settings = Settings("fahrenheit", "24-hour", ["holiday"], sharesWeather: false, sharesStatus: false) },
            withToken: false);
        using var response = await client.SendAsync(request);

        // Then it is refused, and nothing is stored
        Assert.False(response.IsSuccessStatusCode);
        AssertSettings(await SettingsAsync(client, sofia), "celsius", "24-hour", ["holiday", "formula-1", "local-event", "sport"], true, true);
    }

    [Fact]
    public async Task A_teammate_id_in_the_body_is_ignored_and_only_the_askers_own_settings_change()
    {
        // Given Sofia and Marco are in Milan
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        var marco = await api.JoinNorthwindAsync(client, "Marco Rossi");

        // When Sofia saves her weather unshared, naming Marco's teammate id in the body
        using var response = await client.SendAsync(Save(sofia, new
        {
            teammateId = marco.TeammateId,
            settings = Settings("celsius", "24-hour", ["holiday", "formula-1", "local-event", "sport"], sharesWeather: false, sharesStatus: true),
        }));

        // Then her own switch is off, and Marco's is on
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False((await api.TeammateAsync(sofia.TeammateId)).Settings.SharesWeather);
        Assert.True((await api.TeammateAsync(marco.TeammateId)).Settings.SharesWeather);
    }

    private static object Settings(string unit, string clock, string[] kinds, bool sharesWeather, bool sharesStatus) => new
    {
        temperatureUnit = unit,
        clockFormat = clock,
        momentKinds = kinds,
        sharesWeather,
        sharesStatus,
    };

    private static HttpRequestMessage Save(Session session, object body) =>
        session.Request(HttpMethod.Put, $"/api/teams/{session.TeamId}/me", body);

    private static async Task<JsonElement> SettingsAsync(HttpClient client, Session session)
    {
        using var response = await client.SendAsync(session.Request(HttpMethod.Get, $"/api/teams/{session.TeamId}/me"));
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var profile = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return profile.RootElement.GetProperty("settings").Clone();
    }

    private static JsonElement PinOf(string body, Guid teammateId)
    {
        using var team = JsonDocument.Parse(body);
        return team.RootElement.GetProperty("pins").EnumerateArray()
            .Single(pin => pin.GetProperty("teammateId").GetGuid() == teammateId).Clone();
    }

    private static string? Unit(JsonElement settings) => settings.GetProperty("temperatureUnit").GetString();

    private static string? Clock(JsonElement settings) => settings.GetProperty("clockFormat").GetString();

    private static string[] Kinds(JsonElement settings) =>
        settings.GetProperty("momentKinds").EnumerateArray().Select(kind => kind.GetString()!).ToArray();

    private static void AssertSettings(
        JsonElement settings, string unit, string clock, string[] kinds, bool sharesWeather, bool sharesStatus)
    {
        Assert.Equal(unit, Unit(settings));
        Assert.Equal(clock, Clock(settings));
        Assert.Equal(kinds, Kinds(settings));
        Assert.Equal(sharesWeather, settings.GetProperty("sharesWeather").GetBoolean());
        Assert.Equal(sharesStatus, settings.GetProperty("sharesStatus").GetBoolean());
    }
}
