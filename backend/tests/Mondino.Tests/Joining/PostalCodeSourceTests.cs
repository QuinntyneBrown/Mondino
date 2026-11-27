// Acceptance Test
// Traces to: L2-003, L2-006, L2-049, L2-050
// Description: A postal code is resolved through the outside source to a city Mondino holds, at the city's own position, within 5 seconds

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Joining;

public sealed class PostalCodeSourceTests
{
    private const string Lookups = "/api/invites/northwind-7Kq2/postal-code-lookups";

    private static async Task<MondinoApi> ApiWithSourceAsync(Action<MondinoApi>? arrange = null)
    {
        var api = new MondinoApi { UsesPostalCodeSource = true };
        arrange?.Invoke(api);
        await api.SeedAsync();
        api.PostalCodeSource.Knows("CA", "L5B", "Mississauga City Centre", "Ontario", 43.5933, -79.6441);
        api.PostalCodeSource.Knows("CA", "M5V", "Toronto (Harbourfront)", "Ontario", 43.6395, -79.3988);
        api.PostalCodeSource.Knows("CA", "M5S", "Toronto (Queen's Park)", "Ontario", 43.6629, -79.3957);
        api.PostalCodeSource.Knows("CA", "L7E", "Mono Mills", "Ontario", 43.9200, -79.9500);
        api.PostalCodeSource.Knows("IT", "20121", "Milano", "Lombardia", 45.4668, 9.1905);
        return api;
    }

    private static async Task<JsonElement> CityOfAsync(HttpClient client, string country, string postalCode)
    {
        using var response = await client.PostAsJsonAsync(Lookups, new { countryCode = country, postalCode });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("city");
    }

    private static (double, double) PositionOf(JsonElement city) =>
        (city.GetProperty("position").GetProperty("latitude").GetDouble(),
         city.GetProperty("position").GetProperty("longitude").GetDouble());

    [Fact]
    public async Task L5B_3C1_finds_Mississauga_and_M5V_2T6_finds_Toronto_each_at_its_own_position()
    {
        // Given the source knows where L5B and M5V are
        await using var api = await ApiWithSourceAsync();
        using var client = api.CreateClient();

        // When each is looked up in Canada
        var mississauga = await CityOfAsync(client, "CA", "l5b3c1");
        var toronto = await CityOfAsync(client, "CA", "M5V 2T6");

        // Then they are two cities, each with its region, its time zone and its own position
        Assert.Equal("Mississauga", mississauga.GetProperty("name").GetString());
        Assert.Equal("Ontario", mississauga.GetProperty("region").GetString());
        Assert.Equal("America/Toronto", mississauga.GetProperty("timeZoneId").GetString());
        Assert.Equal("Toronto", toronto.GetProperty("name").GetString());
        Assert.NotEqual(PositionOf(mississauga), PositionOf(toronto));
    }

    [Fact]
    public async Task Two_postal_codes_in_Toronto_give_one_position_the_citys_and_never_the_postal_codes()
    {
        // Given the source places M5V and M5S at two different points in Toronto
        await using var api = await ApiWithSourceAsync();
        using var client = api.CreateClient();

        // When both are looked up
        var harbourfront = await CityOfAsync(client, "CA", "M5V 2T6");
        var queensPark = await CityOfAsync(client, "CA", "M5S 1A1");

        // Then both carry the same position, Toronto's own, which is neither postal code's
        Assert.Equal(PositionOf(harbourfront), PositionOf(queensPark));
        Assert.Equal((43.65333, -79.38389), PositionOf(harbourfront));
        Assert.NotEqual((43.6395, -79.3988), PositionOf(harbourfront));
    }

    [Fact]
    public async Task A_rural_postal_code_lands_on_the_nearest_city_Mondino_holds_named_as_that_city()
    {
        // Given the source places L7E in Mono Mills, a hamlet of no city
        await using var api = await ApiWithSourceAsync();
        using var client = api.CreateClient();

        // When it is looked up
        var city = await CityOfAsync(client, "CA", "L7E 1A1");

        // Then the city is a nearby city Mondino holds, at that city's position
        Assert.NotEqual("Mono Mills", city.GetProperty("name").GetString());
        var (latitude, longitude) = PositionOf(city);
        Assert.NotEqual((43.92, -79.95), (latitude, longitude));
        Assert.InRange(latitude, 43.6, 44.2);
        Assert.InRange(longitude, -80.3, -79.5);
    }

    [Fact]
    public async Task The_source_is_given_the_country_and_the_postal_codes_area_and_nothing_else()
    {
        // Given the source
        await using var api = await ApiWithSourceAsync();
        using var client = api.CreateClient();
        client.DefaultRequestHeaders.Add("X-Forwarded-For", "203.0.113.7");

        // When L5B 3C1 is looked up by someone holding Northwind's invite link
        await CityOfAsync(client, "CA", "L5B 3C1");

        // Then the one request carries the country, the area (L5B), one row and the account, and nothing more
        var request = Assert.Single(api.PostalCodeSource.Requests);
        Assert.Equal(HttpMethod.Get, request.Method);
        Assert.Equal("secure.geonames.org", request.RequestUri!.Host);
        var query = System.Web.HttpUtility.ParseQueryString(request.RequestUri.Query);
        Assert.Equal(["country", "maxRows", "postalcode", "username"], query.AllKeys.Order());
        Assert.Equal(("CA", "L5B", "1", "mondino-tests"), (query["country"], query["postalcode"], query["maxRows"], query["username"]));
        var everything = request.RequestUri + string.Join(' ', request.Headers.Select(h => $"{h.Key}: {string.Join(',', h.Value)}"));
        foreach (var secret in new[] { "3C1", "northwind", "Northwind", "203.0.113.7", "Cookie" })
        {
            Assert.DoesNotContain(secret, everything, StringComparison.Ordinal);
        }
    }

    [Fact]
    public async Task A_postal_code_the_source_has_no_place_for_is_not_found()
    {
        await using var api = await ApiWithSourceAsync();
        using var client = api.CreateClient();

        using var response = await client.PostAsJsonAsync(Lookups, new { countryCode = "IT", postalCode = "00199" });

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal("postal_code_not_found", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
    }

    [Fact]
    public async Task A_source_that_does_not_answer_in_5_seconds_is_unavailable()
    {
        // Given a source that does not answer
        await using var api = await ApiWithSourceAsync();
        api.PostalCodeSource.Behaviour = SourceBehaviour.Hangs;
        using var client = api.CreateClient();

        // When a postal code is looked up and 5 seconds pass
        var pending = client.PostAsJsonAsync(Lookups, new { countryCode = "IT", postalCode = "20121" });
        await api.PostalCodeSource.WaitForCallAsync();
        api.Time.Advance(TimeSpan.FromSeconds(5));
        using var response = await pending.WaitAsync(TimeSpan.FromSeconds(10));

        // Then the lookup is unavailable
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("postal_code_unavailable", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
    }

    [Theory]
    [InlineData(SourceBehaviour.Fails)]
    [InlineData(SourceBehaviour.RefusesTheAccount)]
    public async Task A_source_that_fails_is_unavailable(SourceBehaviour behaviour)
    {
        await using var api = await ApiWithSourceAsync();
        api.PostalCodeSource.Behaviour = behaviour;
        using var client = api.CreateClient();

        using var response = await client.PostAsJsonAsync(Lookups, new { countryCode = "IT", postalCode = "20121" });

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
    }

    [Fact]
    public async Task A_postal_code_found_once_is_answered_from_the_cache()
    {
        await using var api = await ApiWithSourceAsync();
        using var client = api.CreateClient();

        await CityOfAsync(client, "IT", "20121");
        api.Time.Advance(TimeSpan.FromDays(29));
        var again = await CityOfAsync(client, "IT", "20121");

        Assert.Equal("Milan", again.GetProperty("name").GetString());
        Assert.Single(api.PostalCodeSource.Requests);
    }

    [Fact]
    public async Task After_five_failures_in_a_row_the_source_is_left_alone_for_30_seconds()
    {
        // Given a source that has failed five times in a row
        await using var api = await ApiWithSourceAsync();
        api.PostalCodeSource.Behaviour = SourceBehaviour.Fails;
        using var client = api.CreateClient();
        for (var attempt = 0; attempt < 5; attempt++)
        {
            using var failed = await client.PostAsJsonAsync(Lookups, new { countryCode = "IT", postalCode = "20121" });
            Assert.Equal(HttpStatusCode.ServiceUnavailable, failed.StatusCode);
        }

        Assert.Equal(5, api.PostalCodeSource.Requests.Count);

        // When a sixth lookup comes, the source is not asked and the lookup is unavailable
        api.PostalCodeSource.Behaviour = SourceBehaviour.Answers;
        using var sixth = await client.PostAsJsonAsync(Lookups, new { countryCode = "IT", postalCode = "20121" });
        Assert.Equal(HttpStatusCode.ServiceUnavailable, sixth.StatusCode);
        Assert.Equal(5, api.PostalCodeSource.Requests.Count);

        // And once 30 seconds have passed, it is asked again
        api.Time.Advance(TimeSpan.FromSeconds(30));
        await CityOfAsync(client, "IT", "20121");
        Assert.Equal(6, api.PostalCodeSource.Requests.Count);
    }

    [Theory]
    [InlineData("GH", "GA543")]
    [InlineData("AE", "12345")]
    public async Task A_country_the_source_does_not_cover_is_unavailable_without_a_call(string country, string postalCode)
    {
        await using var api = await ApiWithSourceAsync();
        using var client = api.CreateClient();

        using var response = await client.PostAsJsonAsync(Lookups, new { countryCode = country, postalCode });

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Empty(api.PostalCodeSource.Requests);
    }

    [Fact]
    public async Task Without_an_account_every_lookup_is_unavailable_without_a_call()
    {
        await using var api = await ApiWithSourceAsync(api => api.PostalCodeSourceUsername = null);
        using var client = api.CreateClient();

        using var response = await client.PostAsJsonAsync(Lookups, new { countryCode = "IT", postalCode = "20121" });

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Empty(api.PostalCodeSource.Requests);
    }
}
