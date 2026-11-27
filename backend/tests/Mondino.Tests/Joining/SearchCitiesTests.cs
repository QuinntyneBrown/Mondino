// Acceptance Test
// Traces to: L2-004, L2-045, L2-050
// Description: While the lookup is down, "Your city" searches the cities Mondino holds, through the invite link, calling no outside source

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Joining;

public sealed class SearchCitiesTests
{
    private const string Searches = "/api/invites/northwind-7Kq2/city-searches";

    [Fact]
    public async Task The_cities_of_the_country_that_start_with_the_text_are_listed_largest_first_with_their_ids()
    {
        // Given Northwind, with the postal code source down
        await using var api = new MondinoApi { UsesPostalCodeSource = true };
        await api.SeedAsync();
        api.PostalCodeSource.Behaviour = SourceBehaviour.Fails;
        using var client = api.CreateClient();

        // When "Mil" is searched in Italy
        using var response = await client.PostAsJsonAsync(Searches, new { countryCode = "IT", text = "Mil" });

        // Then Milan and Milazzo are listed, each with its id, region, position and time zone, and no source was called
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var results = (await response.Content.ReadFromJsonAsync<JsonElement>()).EnumerateArray().ToList();
        Assert.Equal(["Milan", "Milazzo"], results.Select(r => r.GetProperty("city").GetProperty("name").GetString()));
        var milan = results[0];
        Assert.Equal("3173435", milan.GetProperty("cityId").GetString());
        Assert.Equal("Lombardy", milan.GetProperty("city").GetProperty("region").GetString());
        Assert.Equal("Europe/Rome", milan.GetProperty("city").GetProperty("timeZoneId").GetString());
        Assert.Equal(45.46427, milan.GetProperty("city").GetProperty("position").GetProperty("latitude").GetDouble(), 4);
        Assert.Empty(api.PostalCodeSource.Requests);
    }

    [Fact]
    public async Task At_most_eight_cities_are_listed()
    {
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateClient();

        var results = await (await client.PostAsJsonAsync(Searches, new { countryCode = "US", text = "s" }))
            .Content.ReadFromJsonAsync<JsonElement>();

        Assert.Equal(8, results.GetArrayLength());
    }

    [Fact]
    public async Task A_search_through_an_invite_link_that_matches_no_team_is_refused()
    {
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateClient();

        using var response = await client.PostAsJsonAsync("/api/invites/guess-1/city-searches", new { countryCode = "IT", text = "Mil" });

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("invite_not_found", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
    }

    [Theory]
    [InlineData("FR", "Paris")]
    [InlineData("IT", "")]
    [InlineData("IT", "   ")]
    [InlineData("IT", "Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod")]
    public async Task An_unsupported_country_or_a_text_empty_or_over_60_characters_is_refused_as_invalid(string country, string text)
    {
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateClient();

        using var response = await client.PostAsJsonAsync(Searches, new { countryCode = country, text });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("validation_failed", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
    }

    [Fact]
    public async Task The_31st_search_in_a_minute_is_refused_with_rate_limited()
    {
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateClient();
        for (var search = 1; search <= 30; search++)
        {
            using var allowed = await client.PostAsJsonAsync(Searches, new { countryCode = "IT", text = "Mil" });
            Assert.Equal(HttpStatusCode.OK, allowed.StatusCode);
        }

        using var response = await client.PostAsJsonAsync(Searches, new { countryCode = "IT", text = "Mil" });

        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.True(response.Headers.RetryAfter?.Delta > TimeSpan.Zero);
    }
}
