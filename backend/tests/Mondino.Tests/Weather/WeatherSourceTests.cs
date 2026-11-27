// Acceptance Test
// Traces to: L2-018, L2-049, L2-050
// Description: The weather source is given a city's position rounded to two decimals and nothing else; its answer is mapped to one of the eight conditions, kept 15 minutes per city, and given up after 5 seconds

using System.Net;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Weather;

public sealed class WeatherSourceTests
{
    [Fact]
    public async Task The_source_is_given_the_citys_position_rounded_to_two_decimals_and_nothing_else()
    {
        // Given the weather source reports 13 °C and fog (WMO 45) at Milan
        await using var api = new MondinoApi { UsesWeatherSource = true };
        await api.SeedAsync();
        api.OpenMeteo.Reports("45.46", "9.19", 13.2, 45);
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When Sofia reads the team's pins
        var pins = await PinsAsync(client, sofia);

        // Then Milan's pins carry 13.2 °C and fog
        var luca = pins.Single(pin => pin.GetProperty("name").GetString() == "Luca Ferri");
        Assert.Equal(13.2, luca.GetProperty("weather").GetProperty("temperatureC").GetDouble());
        Assert.Equal("fog", luca.GetProperty("weather").GetProperty("condition").GetString());

        // And the source was asked once per city, for the current reading at a rounded position and nothing else
        Assert.Equal(12, api.OpenMeteo.Requests.Count);
        var milan = api.OpenMeteo.Requests.Single(request => request.RequestUri!.Query.Contains("latitude=45.46", StringComparison.Ordinal));
        Assert.Equal(
            "https://api.open-meteo.com/v1/forecast?latitude=45.46&longitude=9.19&current=temperature_2m,weather_code,wind_speed_10m",
            milan.RequestUri!.ToString());
        Assert.DoesNotContain(milan.Headers, header => header.Key is "Cookie" or "Authorization");
        Assert.All(api.OpenMeteo.Requests, request =>
        {
            var address = Uri.UnescapeDataString(request.RequestUri!.ToString());
            Assert.DoesNotContain("Sofia", address, StringComparison.Ordinal);
            Assert.DoesNotContain("Northwind", address, StringComparison.OrdinalIgnoreCase);
            Assert.DoesNotContain(sofia.TeamId.ToString(), address, StringComparison.OrdinalIgnoreCase);
        });
    }

    [Fact]
    public async Task Weather_read_for_a_city_less_than_15_minutes_ago_is_not_asked_for_again()
    {
        // Given Sofia read the team's pins, so the weather of every city was fetched
        await using var api = new MondinoApi { UsesWeatherSource = true };
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        await PinsAsync(client, sofia);
        Assert.Equal(12, api.OpenMeteo.Requests.Count);

        // When Marco, also in Milan, reads them 14 minutes later
        api.Time.Advance(TimeSpan.FromMinutes(14));
        var marco = await api.JoinNorthwindAsync(client, "Marco Rossi");
        await PinsAsync(client, marco);

        // Then the source is not called again: not for the lookup, nor for any city
        Assert.Equal(12, api.OpenMeteo.Requests.Count);

        // And at 15 minutes every city is asked for again
        api.Time.Advance(TimeSpan.FromMinutes(1));
        await PinsAsync(client, marco);
        Assert.Equal(24, api.OpenMeteo.Requests.Count);
    }

    [Fact]
    public async Task A_source_that_does_not_answer_in_5_seconds_leaves_the_pins_without_weather()
    {
        // Given the weather source does not answer
        await using var api = new MondinoApi { UsesWeatherSource = true };
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        api.OpenMeteo.Behaviour = SourceBehaviour.Hangs;

        // When Sofia reads the team's pins and 5 seconds pass
        var reading = PinsAsync(client, sofia);
        await api.OpenMeteo.WaitForRequestsAsync(12);
        api.Time.Advance(TimeSpan.FromSeconds(5));
        var pins = await reading;

        // Then every pin is there, with its time zone and its weather unavailable
        Assert.Equal(13, pins.Count);
        Assert.All(pins, pin =>
        {
            Assert.Equal("Unavailable", pin.GetProperty("weatherState").GetString());
            Assert.False(string.IsNullOrEmpty(pin.GetProperty("timeZoneId").GetString()));
        });
    }

    [Fact]
    public async Task A_failed_answer_is_not_kept_so_the_next_read_asks_again()
    {
        // Given the weather source fails
        await using var api = new MondinoApi { UsesWeatherSource = true };
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        api.OpenMeteo.Behaviour = SourceBehaviour.Fails;
        var pins = await PinsAsync(client, sofia);
        Assert.All(pins, pin => Assert.Equal("Unavailable", pin.GetProperty("weatherState").GetString()));
        var asked = api.OpenMeteo.Requests.Count;

        // When it answers again and Sofia reads the pins a minute later
        api.OpenMeteo.Behaviour = SourceBehaviour.Answers;
        api.Time.Advance(TimeSpan.FromMinutes(1));
        pins = await PinsAsync(client, sofia);

        // Then the source was asked again, and the weather is back
        Assert.Equal(asked + 12, api.OpenMeteo.Requests.Count);
        Assert.All(pins, pin => Assert.Equal("Available", pin.GetProperty("weatherState").GetString()));
    }

    [Fact]
    public async Task A_code_that_is_not_one_of_the_eight_is_shown_as_the_nearest_and_a_strong_wind_as_windy()
    {
        // Given the source reports a code outside the table (4, haze) at Milan, and a clear sky with
        // a 45 km/h wind at Melbourne
        await using var api = new MondinoApi { UsesWeatherSource = true };
        await api.SeedAsync();
        api.OpenMeteo.Reports("45.46", "9.19", 13, 4);
        api.OpenMeteo.Reports("-37.81", "144.96", 18, 0, wind: 45);
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When Sofia reads the team's pins
        var pins = await PinsAsync(client, sofia);

        // Then Milan's weather is cloudy, never empty, and Melbourne's windy
        Assert.Equal("cloudy", ConditionIn(pins, "Milan"));
        Assert.Equal("wind", ConditionIn(pins, "Melbourne"));
    }

    private static string? ConditionIn(List<JsonElement> pins, string city) =>
        pins.First(pin => pin.GetProperty("cityName").GetString() == city)
            .GetProperty("weather").GetProperty("condition").GetString();

    private static async Task<List<JsonElement>> PinsAsync(HttpClient client, Session session)
    {
        using var request = session.Request(HttpMethod.Get, $"/api/teams/{session.TeamId}/pins");
        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return body.RootElement.GetProperty("pins").EnumerateArray().ToList();
    }
}
