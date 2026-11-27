// Acceptance Test
// Traces to: L2-049
// Description: A request that asks the postal code source and then the weather source waits on them 6 seconds at most, and answers with what it has

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Joining;

public sealed class SourceDeadlineTests
{
    private static async Task<MondinoApi> ApiAsync()
    {
        var api = new MondinoApi { UsesPostalCodeSource = true, UsesWeatherSource = true };
        await api.SeedAsync();
        api.PostalCodeSource.Knows("IT", "20121", "Milano", "Lombardia", 45.4668, 9.1905);
        api.PostalCodeSource.Knows("CA", "M5V", "Toronto (Harbourfront)", "Ontario", 43.6395, -79.3988);
        return api;
    }

    [Fact]
    public async Task A_lookup_whose_postal_code_takes_4_seconds_and_whose_weather_stalls_answers_at_6_seconds()
    {
        // Given the postal code source takes 4 seconds and the weather source does not answer
        await using var api = await ApiAsync();
        api.PostalCodeSource.AnswersAfter(TimeSpan.FromSeconds(4), api.Time);
        api.OpenMeteo.Behaviour = SourceBehaviour.Hangs;
        using var client = api.CreateClient();

        // When a person joining looks 20121 up, and 4 seconds pass while Milan is found
        var pending = client.PostAsJsonAsync(
            "/api/invites/northwind-7Kq2/postal-code-lookups", new { countryCode = "IT", postalCode = "20121" });
        await api.PostalCodeSource.WaitForCallAsync();
        api.Time.Advance(TimeSpan.FromSeconds(4));
        await api.OpenMeteo.WaitForRequestsAsync(1);

        // And 2 seconds more pass, 6 in all, less than the weather's own 5
        api.Time.Advance(TimeSpan.FromSeconds(2));
        using var response = await pending.WaitAsync(TimeSpan.FromSeconds(10));

        // Then the lookup answers with Milan and no weather
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Milan", body.GetProperty("city").GetProperty("name").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("weather").ValueKind);
    }

    [Fact]
    public async Task Saving_a_new_postal_code_whose_lookup_takes_4_seconds_and_whose_weather_stalls_answers_at_6_seconds()
    {
        // Given Sofia's pin is in Milan, the postal code source takes 4 seconds and the weather source does not answer
        await using var api = await ApiAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        api.PostalCodeSource.AnswersAfter(TimeSpan.FromSeconds(4), api.Time);
        api.OpenMeteo.Behaviour = SourceBehaviour.Hangs;
        var asked = api.OpenMeteo.Requests.Count;

        // When she saves M5V 2T6, and 4 seconds pass while Toronto is found
        var pending = client.SendAsync(
            sofia.Request(HttpMethod.Put, $"/api/teams/{sofia.TeamId}/me", new { countryCode = "CA", postalCode = "M5V 2T6" }));
        await api.PostalCodeSource.WaitForCallAsync();
        api.Time.Advance(TimeSpan.FromSeconds(4));
        await api.OpenMeteo.WaitForRequestsAsync(asked + 1);

        // And 2 seconds more pass, 6 in all
        api.Time.Advance(TimeSpan.FromSeconds(2));
        using var response = await pending.WaitAsync(TimeSpan.FromSeconds(10));

        // Then her pin is in Toronto, with its weather unavailable
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var pin = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("pin");
        Assert.Equal("Toronto", pin.GetProperty("cityName").GetString());
        Assert.Equal("Unavailable", pin.GetProperty("weatherState").GetString());
    }
}
