// Acceptance Test
// Traces to: L2-003, L2-004, L2-045, L2-050
// Description: A postal code is looked up for its country through the invite link; a malformed one never reaches the source

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Joining;

public sealed class LookUpPostalCodeTests
{
    private const string Lookups = "/api/invites/northwind-7Kq2/postal-code-lookups";

    [Fact]
    public async Task A_found_postal_code_answers_the_city_its_region_position_and_time_zone_and_not_the_postal_code()
    {
        // Given Northwind, and a source that knows 20121 in Italy is in Milan
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateClient();

        // When 20121 in Italy is looked up through Northwind's invite link
        using var response = await client.PostAsJsonAsync(Lookups, new { countryCode = "IT", postalCode = "20121" });
        var body = await response.Content.ReadAsStringAsync();

        // Then the answer is Milan, Lombardy, at the city's position and in its time zone
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var result = JsonDocument.Parse(body);
        var city = result.RootElement.GetProperty("city");
        Assert.Equal("Milan", city.GetProperty("name").GetString());
        Assert.Equal("Lombardy", city.GetProperty("region").GetString());
        Assert.Equal("IT", city.GetProperty("countryCode").GetString());
        Assert.Equal(45.46427, city.GetProperty("position").GetProperty("latitude").GetDouble(), 5);
        Assert.Equal(9.18951, city.GetProperty("position").GetProperty("longitude").GetDouble(), 5);
        Assert.Equal("Europe/Rome", city.GetProperty("timeZoneId").GetString());

        // And it does not echo the postal code
        Assert.DoesNotContain("20121", body, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("L5B 3C1", "Mississauga")]
    [InlineData("l5b3c1", "Mississauga")]
    [InlineData(" l5b-3c1 ", "Mississauga")]
    [InlineData("M5V 2T6", "Toronto")]
    public async Task A_postal_code_typed_with_or_without_its_space_and_in_any_case_finds_its_city(string typed, string expected)
    {
        // Given a source that knows L5B 3C1 is in Mississauga and M5V 2T6 is in Toronto
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.Knows("CA", "L5B 3C1", KnownCities.Mississauga);
        api.PostalCodes.Knows("CA", "M5V 2T6", KnownCities.Toronto);
        using var client = api.CreateClient();

        // When the postal code is looked up in Canada as it was typed
        var result = await client.PostAsJsonAsync(Lookups, new { countryCode = "CA", postalCode = typed });

        // Then the city found is the one it lies in
        Assert.Equal(HttpStatusCode.OK, result.StatusCode);
        var city = (await result.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("city");
        Assert.Equal(expected, city.GetProperty("name").GetString());
    }

    [Theory]
    [InlineData("IT", "2012")]
    [InlineData("CA", "L5B 3C")]
    [InlineData("CA", "123 ABC")]
    [InlineData("CA", "D5B 3C1")]
    public async Task A_postal_code_in_the_wrong_form_is_refused_and_never_sent_to_the_source(string country, string typed)
    {
        // Given a source that would answer anything
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateClient();

        // When a postal code that does not fit the country's form is looked up
        using var response = await client.PostAsJsonAsync(Lookups, new { countryCode = country, postalCode = typed });

        // Then it is refused with postal_code_not_found, and the source was never asked
        await AssertRefusedAsync(response, HttpStatusCode.UnprocessableEntity, "postal_code_not_found");
        Assert.Empty(api.PostalCodes.Asked);
    }

    [Fact]
    public async Task A_postal_code_in_the_right_form_that_the_source_does_not_know_is_refused_the_same_way()
    {
        // Given a source that does not know 00199 in Italy
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateClient();

        // When it is looked up
        using var response = await client.PostAsJsonAsync(Lookups, new { countryCode = "IT", postalCode = "00199" });

        // Then it is refused as a postal code in the wrong form is, after the source was asked
        await AssertRefusedAsync(response, HttpStatusCode.UnprocessableEntity, "postal_code_not_found");
        Assert.Equal(["IT 00199"], api.PostalCodes.Asked);
    }

    [Fact]
    public async Task A_source_that_does_not_answer_is_refused_with_postal_code_unavailable()
    {
        // Given a source that is down
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.IsDown = true;
        using var client = api.CreateClient();

        // When a postal code is looked up
        using var response = await client.PostAsJsonAsync(Lookups, new { countryCode = "IT", postalCode = "20121" });

        // Then the answer says the lookup is unavailable, not that the postal code is wrong
        await AssertRefusedAsync(response, HttpStatusCode.ServiceUnavailable, "postal_code_unavailable");
    }

    [Fact]
    public async Task A_lookup_through_an_invite_link_that_matches_no_team_is_refused_and_asks_no_source()
    {
        // Given no team holds the invite token
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateClient();

        // When a postal code is looked up through it
        using var response = await client.PostAsJsonAsync(
            "/api/invites/guess-1/postal-code-lookups", new { countryCode = "IT", postalCode = "20121" });

        // Then it is refused with invite_not_found
        await AssertRefusedAsync(response, HttpStatusCode.NotFound, "invite_not_found");
        Assert.Empty(api.PostalCodes.Asked);
    }

    [Theory]
    [InlineData("FR", "75001")]
    [InlineData("IT", "")]
    [InlineData("IT", "1234567890123")]
    [InlineData(null, "20121")]
    public async Task An_unsupported_country_or_a_postal_code_empty_or_over_12_characters_is_refused_as_invalid(string? country, string typed)
    {
        // Given Northwind
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateClient();

        // When such a lookup is asked for
        using var response = await client.PostAsJsonAsync(Lookups, new { countryCode = country, postalCode = typed });

        // Then it is refused with validation_failed
        await AssertRefusedAsync(response, HttpStatusCode.BadRequest, "validation_failed");
        Assert.Empty(api.PostalCodes.Asked);
    }

    [Fact]
    public async Task The_11th_lookup_in_a_minute_is_refused_with_rate_limited_before_the_source_is_asked()
    {
        // Given one client that has looked up 10 postal codes in a minute
        await using var api = new MondinoApi();
        await api.SeedAsync();
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
        await AssertRefusedAsync(response, HttpStatusCode.TooManyRequests, "rate_limited");
        Assert.True(response.Headers.RetryAfter?.Delta > TimeSpan.Zero);
        Assert.Equal(10, api.PostalCodes.Asked.Count);
    }

    [Fact]
    public async Task The_invite_gives_each_country_the_form_its_postal_codes_take()
    {
        // Given Northwind
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateClient();

        // When its invite link is opened
        var invite = await client.GetFromJsonAsync<JsonElement>("/api/invites/northwind-7Kq2");

        // Then each country carries its name in a sentence and its form, with an example
        var countries = invite.GetProperty("countries").EnumerateArray().ToDictionary(c => c.GetProperty("code").GetString()!);
        Assert.Equal("Italian postal codes have five digits, like 20121.", countries["IT"].GetProperty("postalCodeForm").GetString());
        Assert.Equal("Canadian postal codes look like A1A 1A1.", countries["CA"].GetProperty("postalCodeForm").GetString());
        Assert.Equal("Italy", countries["IT"].GetProperty("nameInText").GetString());
        Assert.Equal("the United States", countries["US"].GetProperty("nameInText").GetString());
    }

    private static async Task AssertRefusedAsync(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        Assert.Equal(status, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(code, problem.GetProperty("code").GetString());
    }
}
