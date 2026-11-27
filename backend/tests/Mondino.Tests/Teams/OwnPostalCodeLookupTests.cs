// Acceptance Test
// Traces to: L2-032, L2-045
// Description: A teammate looks a new postal code up from Profile & Settings: the city is found and nothing moves, a refusal names its code, and the 11th lookup in a minute for the teammate is refused before the source is asked

using System.Net;
using System.Text.Json;
using Mondino.Domain.Teams;
using Mondino.Tests.Support;

namespace Mondino.Tests.Teams;

public sealed class OwnPostalCodeLookupTests
{
    [Fact]
    public async Task A_postal_code_in_Toronto_is_found_with_its_weather_and_the_pin_stays_in_Milan()
    {
        // Given Sofia's pin is in Milan, and it is 7° and cloudy in Toronto
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        api.PostalCodes.Knows("CA", "M5V 2T6", KnownCities.Toronto);
        api.Weather.Reports(43.65, -79.38, 7, WeatherCondition.Cloudy);

        // When she looks up M5V 2T6 in Canada, as she typed it
        using var response = await client.SendAsync(LookUp(sofia, "CA", "m5v2t6"));
        var body = await response.Content.ReadAsStringAsync();

        // Then the answer is Toronto, at its own position and time zone, with the weather there
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var result = JsonDocument.Parse(body);
        var city = result.RootElement.GetProperty("city");
        Assert.Equal("Toronto", city.GetProperty("name").GetString());
        Assert.Equal("CA", city.GetProperty("countryCode").GetString());
        Assert.Equal("America/Toronto", city.GetProperty("timeZoneId").GetString());
        Assert.Equal(7, result.RootElement.GetProperty("weather").GetProperty("temperatureC").GetDouble());
        Assert.DoesNotContain("M5V", body, StringComparison.OrdinalIgnoreCase);

        // And her pin has not moved
        var stored = await api.TeammateAsync(sofia.TeammateId);
        Assert.Equal("Milan", stored.City.Name);
        Assert.Equal("20121", stored.PostalCode);
    }

    [Theory]
    [InlineData("M5V 2T", false, 422, "postal_code_not_found")]
    [InlineData("M5V 9Z9", false, 422, "postal_code_not_found")]
    [InlineData("M5V 2T6", true, 503, "postal_code_unavailable")]
    public async Task A_postal_code_that_cannot_be_found_or_checked_is_refused_with_its_code(
        string postalCode, bool sourceDown, int status, string code)
    {
        // Given Sofia's pin is in Milan, and the source knows M5V 2T6 unless it is down
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        api.PostalCodes.Knows("CA", "M5V 2T6", KnownCities.Toronto);
        api.PostalCodes.IsDown = sourceDown;

        // When she looks the postal code up
        using var response = await client.SendAsync(LookUp(sofia, "CA", postalCode));

        // Then it is refused with the code the screen branches on, and the pin stays in Milan
        Assert.Equal(status, (int)response.StatusCode);
        using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(code, problem.RootElement.GetProperty("code").GetString());
        Assert.Equal("Milan", (await api.TeammateAsync(sofia.TeammateId)).City.Name);
    }

    [Fact]
    public async Task The_11th_lookup_in_a_minute_for_a_teammate_is_refused_before_the_source_is_asked()
    {
        // Given Sofia and Marco on one client, and Sofia has looked up 10 postal codes this minute
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        var marco = await api.JoinNorthwindAsync(client, "Marco Rossi");
        api.PostalCodes.Knows("CA", "M5V 2T6", KnownCities.Toronto);
        for (var lookup = 1; lookup <= 10; lookup++)
        {
            using var allowed = await client.SendAsync(LookUp(sofia, "CA", "M5V 2T6"));
            Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
        }

        var asked = api.PostalCodes.Asked.Count;

        // When she looks up one more
        using var response = await client.SendAsync(LookUp(sofia, "CA", "M5V 2T6"));

        // Then it is refused with 429, a Retry-After header and "rate_limited", and the source is not asked
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.True(response.Headers.RetryAfter?.Delta > TimeSpan.Zero);
        using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("rate_limited", problem.RootElement.GetProperty("code").GetString());
        Assert.Equal(asked, api.PostalCodes.Asked.Count);

        // And Marco, on the same client, still has his own ten
        using var his = await client.SendAsync(LookUp(marco, "CA", "M5V 2T6"));
        Assert.Equal(HttpStatusCode.OK, his.StatusCode);

    }

    [Fact]
    public async Task A_lookup_through_another_teams_address_is_refused_with_404()
    {
        // Given Sofia is in Northwind, and Liam made Southwind
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var liam = await api.MakeTeamAsync(client);
        var sofia = await api.JoinNorthwindAsync(client);

        // When Sofia looks a postal code up through Southwind's address
        using var request = sofia.Request(
            HttpMethod.Post, $"/api/teams/{liam.TeamId}/me/postal-code-lookups", new { countryCode = "CA", postalCode = "M5V 2T6" });
        using var response = await client.SendAsync(request);

        // Then it is refused with 404, as a team that does not exist is
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static HttpRequestMessage LookUp(Session session, string countryCode, string postalCode) =>
        session.Request(
            HttpMethod.Post, $"/api/teams/{session.TeamId}/me/postal-code-lookups", new { countryCode, postalCode });
}
