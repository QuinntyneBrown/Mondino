// Acceptance Test
// Traces to: L2-032, L2-031, L2-044
// Description: A teammate saves a new postal code and their pin moves to its city, with that city's time zone, weather and moments; within one city it does not move; nothing is stored for a postal code that cannot be found; no one changes another teammate's location

using System.Net;
using System.Text.Json;
using Mondino.Domain.Moments;
using Mondino.Domain.Teams;
using Mondino.Tests.Support;

namespace Mondino.Tests.Teams;

public sealed class ChangeLocationTests
{
    [Fact]
    public async Task Saving_a_postal_code_in_Toronto_moves_the_pin_there_for_every_teammate()
    {
        // Given Sofia's pin is in Milan and Marco is her teammate, it is 7° and cloudy in Toronto,
        // and the Raptors play at home there on Wednesday
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        var marco = await api.JoinNorthwindAsync(client, "Marco Rossi");
        api.PostalCodes.Knows("CA", "M5V 2T6", KnownCities.Toronto);
        api.Weather.Reports(43.65, -79.38, 7, WeatherCondition.Cloudy);
        api.Calendars.HasEvent(MomentKind.Sport, "Raptors home game", new DateOnly(2025, 10, 29), "CA", 43.6435, -79.3791, "Raptors vs. Celtics at Scotiabank Arena");

        // When she saves Canada and M5V 2T6, as she typed it
        using var response = await client.SendAsync(Save(sofia, "CA", "m5v 2t6"));
        var body = await response.Content.ReadAsStringAsync();

        // Then her own profile answers Toronto, with her postal code in its canonical spelling
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var profile = JsonDocument.Parse(body);
        Assert.Equal("CA", profile.RootElement.GetProperty("countryCode").GetString());
        Assert.Equal("M5V 2T6", profile.RootElement.GetProperty("postalCode").GetString());
        var own = profile.RootElement.GetProperty("pin");
        Assert.Equal("Toronto", own.GetProperty("cityName").GetString());
        Assert.Equal("Canada", own.GetProperty("country").GetString());
        Assert.Equal("America/Toronto", own.GetProperty("timeZoneId").GetString());

        // And when Marco next reads the team, her pin is at Toronto with Toronto's time zone and weather
        using var pins = await client.SendAsync(marco.Request(HttpMethod.Get, $"/api/teams/{marco.TeamId}/pins"));
        var pinsBody = await pins.Content.ReadAsStringAsync();
        using var team = JsonDocument.Parse(pinsBody);
        var hers = team.RootElement.GetProperty("pins").EnumerateArray()
            .Single(p => p.GetProperty("teammateId").GetGuid() == sofia.TeammateId);
        Assert.Equal("Toronto", hers.GetProperty("cityName").GetString());
        Assert.Equal(43.65333, hers.GetProperty("position").GetProperty("latitude").GetDouble(), 5);
        Assert.Equal(-79.38389, hers.GetProperty("position").GetProperty("longitude").GetDouble(), 5);
        Assert.Equal("America/Toronto", hers.GetProperty("timeZoneId").GetString());
        Assert.Equal(7, hers.GetProperty("weather").GetProperty("temperatureC").GetDouble());
        Assert.DoesNotContain("M5V", pinsBody, StringComparison.OrdinalIgnoreCase);

        // And Toronto's moments are hers
        using var moments = await client.SendAsync(marco.Request(HttpMethod.Get, $"/api/teams/{marco.TeamId}/moments"));
        using var listed = JsonDocument.Parse(await moments.Content.ReadAsStringAsync());
        var raptors = Assert.Single(listed.RootElement.EnumerateArray());
        Assert.Equal(sofia.TeammateId, raptors.GetProperty("teammateId").GetGuid());
        Assert.Equal("Toronto", raptors.GetProperty("cityName").GetString());
    }

    [Fact]
    public async Task A_new_postal_code_in_the_same_city_keeps_the_pin_where_it_was()
    {
        // Given Sofia's pin is in Milan, from 20121, and 20122 is in Milan too
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        api.PostalCodes.Knows("IT", "20122", KnownCities.Milan);
        var before = await api.TeammateAsync(sofia.TeammateId);

        // When she saves 20122
        using var response = await client.SendAsync(Save(sofia, "IT", "20122"));

        // Then her postal code is 20122, and her pin is at the same city and the same position
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var after = await api.TeammateAsync(sofia.TeammateId);
        Assert.Equal("20122", after.PostalCode);
        Assert.Equal(before.CityId, after.CityId);
        Assert.Equal(before.City.Position, after.City.Position);
    }

    [Theory]
    [InlineData("M5V 2T", false, 422, "postal_code_not_found")]
    [InlineData("M5V 9Z9", false, 422, "postal_code_not_found")]
    [InlineData("M5V 2T6", true, 503, "postal_code_unavailable")]
    [InlineData("", false, 400, "validation_failed")]
    [InlineData("M5V 2T6 12345", false, 400, "validation_failed")]
    public async Task A_postal_code_that_cannot_be_found_or_checked_is_refused_and_nothing_is_stored(
        string postalCode, bool sourceDown, int status, string code)
    {
        // Given Sofia's pin is in Milan, from 20121
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        api.PostalCodes.Knows("CA", "M5V 2T6", KnownCities.Toronto);
        api.PostalCodes.IsDown = sourceDown;

        // When she saves the postal code
        using var response = await client.SendAsync(Save(sofia, "CA", postalCode));

        // Then it is refused with its code, and her pin and postal code are as they were
        Assert.Equal(status, (int)response.StatusCode);
        using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(code, problem.RootElement.GetProperty("code").GetString());
        var stored = await api.TeammateAsync(sofia.TeammateId);
        Assert.Equal("Milan", stored.City.Name);
        Assert.Equal("20121", stored.PostalCode);
    }

    [Fact]
    public async Task A_teammate_id_in_the_body_is_ignored_and_only_the_askers_own_pin_moves()
    {
        // Given Sofia and Marco are both in Milan
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        var marco = await api.JoinNorthwindAsync(client, "Marco Rossi");
        api.PostalCodes.Knows("CA", "M5V 2T6", KnownCities.Toronto);

        // When Sofia saves Toronto naming Marco's teammate id in the body
        using var request = sofia.Request(
            HttpMethod.Put,
            $"/api/teams/{sofia.TeamId}/me",
            new { teammateId = marco.TeammateId, countryCode = "CA", postalCode = "M5V 2T6" });
        using var response = await client.SendAsync(request);

        // Then her own pin moves, and Marco's stays in Milan
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Toronto", (await api.TeammateAsync(sofia.TeammateId)).City.Name);
        Assert.Equal("Milan", (await api.TeammateAsync(marco.TeammateId)).City.Name);
        Assert.Equal("20121", (await api.TeammateAsync(marco.TeammateId)).PostalCode);
    }

    [Theory]
    [InlineData("/api/teams/{team}/teammates/{other}")]
    [InlineData("/api/teams/{team}/me/{other}")]
    [InlineData("/api/teams/{otherTeam}/me")]
    public async Task A_change_to_another_teammates_location_is_refused_and_nothing_changes(string path)
    {
        // Given Sofia and Marco are in Northwind, both in Milan, and Liam made Southwind in Toronto
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var liam = await api.MakeTeamAsync(client);
        var sofia = await api.JoinNorthwindAsync(client);
        var marco = await api.JoinNorthwindAsync(client, "Marco Rossi");
        api.PostalCodes.Knows("IT", "00185", KnownCities.Rome);

        // When Sofia sends a change of location for Marco, or through Southwind's address
        using var request = sofia.Request(
            HttpMethod.Put,
            path.Replace("{team}", $"{sofia.TeamId}", StringComparison.Ordinal)
                .Replace("{other}", $"{marco.TeammateId}", StringComparison.Ordinal)
                .Replace("{otherTeam}", $"{liam.TeamId}", StringComparison.Ordinal),
            new { countryCode = "IT", postalCode = "00185" });
        using var response = await client.SendAsync(request);

        // Then it is refused with 403 or 404, and no one has moved
        Assert.Contains(response.StatusCode, new[] { HttpStatusCode.Forbidden, HttpStatusCode.NotFound });
        Assert.Equal("Milan", (await api.TeammateAsync(marco.TeammateId)).City.Name);
        Assert.Equal("Milan", (await api.TeammateAsync(sofia.TeammateId)).City.Name);
        Assert.Equal("Toronto", (await api.TeammateAsync(liam.TeammateId)).City.Name);
    }

    private static HttpRequestMessage Save(Session session, string countryCode, string postalCode) =>
        session.Request(HttpMethod.Put, $"/api/teams/{session.TeamId}/me", new { countryCode, postalCode });
}
