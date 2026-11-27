// Acceptance Test
// Traces to: L2-053, L2-003, L2-004, L2-045
// Description: Create Team looks a postal code up and searches the cities with no invite link, with Join's answers and codes, held to the same limits

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Teams;

public sealed class CreateTeamLookupTests
{
    private const string Lookups = "/api/postal-code-lookups";
    private const string CitySearches = "/api/city-searches";

    [Fact]
    public async Task A_postal_code_is_looked_up_with_no_invite_link_and_answers_the_city_without_echoing_it()
    {
        // Given no team at all, and a source that knows 20121 in Italy is in Milan
        await using var api = new MondinoApi();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateClient();

        // When 20121 in Italy is looked up from Create Team
        using var response = await client.PostAsJsonAsync(Lookups, new { countryCode = "IT", postalCode = "20121" });
        var body = await response.Content.ReadAsStringAsync();

        // Then the answer is Milan, Lombardy, at the city's own position, and not the postal code
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var city = JsonDocument.Parse(body).RootElement.GetProperty("city");
        Assert.Equal("Milan", city.GetProperty("name").GetString());
        Assert.Equal("Lombardy", city.GetProperty("region").GetString());
        Assert.Equal(45.46427, city.GetProperty("position").GetProperty("latitude").GetDouble(), 5);
        Assert.DoesNotContain("20121", body, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("2012", false, HttpStatusCode.UnprocessableEntity, "postal_code_not_found")]
    [InlineData("20999", false, HttpStatusCode.UnprocessableEntity, "postal_code_not_found")]
    [InlineData("20121", true, HttpStatusCode.ServiceUnavailable, "postal_code_unavailable")]
    public async Task A_postal_code_that_cannot_be_found_or_checked_is_refused_with_Join_s_codes(
        string postalCode, bool sourceDown, HttpStatusCode status, string code)
    {
        await using var api = new MondinoApi();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        api.PostalCodes.IsDown = sourceDown;
        using var client = api.CreateClient();

        using var response = await client.PostAsJsonAsync(Lookups, new { countryCode = "IT", postalCode });

        Assert.Equal(status, response.StatusCode);
        Assert.Equal(code, (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
    }

    [Fact]
    public async Task The_eleventh_lookup_in_a_minute_is_refused_and_the_source_is_not_asked()
    {
        // Given one client that has looked up 10 postal codes this minute
        await using var api = new MondinoApi();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateClient();
        for (var lookup = 1; lookup <= 10; lookup++)
        {
            using var allowed = await client.PostAsJsonAsync(Lookups, new { countryCode = "IT", postalCode = "20121" });
            Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
        }

        // When it looks up one more
        using var response = await client.PostAsJsonAsync(Lookups, new { countryCode = "IT", postalCode = "20121" });

        // Then it is refused with 429 and Retry-After, and the source was asked only ten times
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.NotNull(response.Headers.RetryAfter?.Delta);
        Assert.Equal("rate_limited", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        Assert.Equal(10, api.PostalCodes.Asked.Count);
    }

    [Fact]
    public async Task The_cities_of_a_country_are_searched_with_no_invite_link()
    {
        await using var api = new MondinoApi();
        using var client = api.CreateClient();

        using var response = await client.PostAsJsonAsync(CitySearches, new { countryCode = "IT", text = "Mil" });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var cities = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Contains(cities.EnumerateArray(), c => c.GetProperty("city").GetProperty("name").GetString() == "Milan");
        Assert.All(cities.EnumerateArray(), c => Assert.Equal("IT", c.GetProperty("city").GetProperty("countryCode").GetString()));
    }
}
