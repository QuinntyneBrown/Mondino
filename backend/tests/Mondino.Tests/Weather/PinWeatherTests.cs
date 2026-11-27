// Acceptance Test
// Traces to: L2-018, L2-003
// Description: Each pin carries its city's weather, asked once per city; a city with no weather is unavailable, a teammate who does not share it shows none, and the postal code lookup names the weather at the city found

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Mondino.Domain.Teams;
using Mondino.Tests.Support;

namespace Mondino.Tests.Weather;

public sealed class PinWeatherTests
{
    [Fact]
    public async Task Each_pin_carries_its_citys_weather_and_the_source_is_asked_once_per_city()
    {
        // Given the weather source reports 13 °C and fog for Milan, and Sofia and Luca both live there
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.Weather.ReportsEverywhere(20, WeatherCondition.Cloudy);
        api.Weather.Reports(45.46, 9.19, 13, WeatherCondition.Fog);
        api.Weather.Reports(19.43, -99.13, 22, WeatherCondition.PartlyCloudy);
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When she reads the team's pins
        var pins = await PinsAsync(client, sofia);

        // Then each of the two Milan pins carries 13 °C and fog, available
        var milan = pins.Where(pin => pin.GetProperty("cityName").GetString() == "Milan").ToList();
        Assert.Equal(2, milan.Count);
        foreach (var pin in milan)
        {
            Assert.Equal("Available", pin.GetProperty("weatherState").GetString());
            Assert.Equal(13, pin.GetProperty("weather").GetProperty("temperatureC").GetDouble());
            Assert.Equal("fog", pin.GetProperty("weather").GetProperty("condition").GetString());
        }

        var tomas = pins.Single(pin => pin.GetProperty("cityName").GetString() == "Mexico City");
        Assert.Equal("partly-cloudy", tomas.GetProperty("weather").GetProperty("condition").GetString());

        // And the source was asked once for each of the twelve cities, by its position alone
        Assert.Equal(12, api.Weather.Asked.Count);
        Assert.Single(api.Weather.Asked, position => Math.Round(position.Latitude, 2) == 45.46);
    }

    [Fact]
    public async Task A_city_the_source_has_no_weather_for_is_unavailable_and_its_pin_is_still_shown()
    {
        // Given the weather source has nothing for Mexico City
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.Weather.ReportsEverywhere(20, WeatherCondition.Clear);
        api.Weather.HasNothingAt(19.43, -99.13);
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When Sofia reads the team's pins
        var pins = await PinsAsync(client, sofia);

        // Then Tomás's pin is there, with its time zone, no weather and its weather unavailable
        var tomas = pins.Single(pin => pin.GetProperty("cityName").GetString() == "Mexico City");
        Assert.Equal("America/Mexico_City", tomas.GetProperty("timeZoneId").GetString());
        Assert.Equal(JsonValueKind.Null, tomas.GetProperty("weather").ValueKind);
        Assert.Equal("Unavailable", tomas.GetProperty("weatherState").GetString());

        // And every other pin has its weather
        Assert.All(
            pins.Where(pin => pin.GetProperty("cityName").GetString() != "Mexico City"),
            pin => Assert.Equal("Available", pin.GetProperty("weatherState").GetString()));
    }

    [Fact]
    public async Task A_teammate_who_does_not_share_their_weather_shows_none_and_still_sees_their_own()
    {
        // Given Sofia and Marco have joined Northwind from Milan, and Marco does not share his weather
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.Weather.ReportsEverywhere(13, WeatherCondition.Fog);
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        var marco = await api.JoinNorthwindAsync(client, "Marco Rossi");
        await api.HideWeatherAsync(marco.TeammateId);

        // When Sofia reads the team's pins
        var sofiasPins = await PinsAsync(client, sofia);

        // Then Marco's pin carries no weather and says it is not shared
        var marcos = sofiasPins.Single(pin => pin.GetProperty("teammateId").GetGuid() == marco.TeammateId);
        Assert.Equal(JsonValueKind.Null, marcos.GetProperty("weather").ValueKind);
        Assert.Equal("NotShared", marcos.GetProperty("weatherState").GetString());

        // And when Marco reads them, his own pin carries his weather
        var marcosPins = await PinsAsync(client, marco);
        var own = marcosPins.Single(pin => pin.GetProperty("teammateId").GetGuid() == marco.TeammateId);
        Assert.Equal("Available", own.GetProperty("weatherState").GetString());
        Assert.Equal(13, own.GetProperty("weather").GetProperty("temperatureC").GetDouble());
    }

    [Fact]
    public async Task The_city_a_postal_code_is_found_in_comes_with_its_weather()
    {
        // Given 20121 is in Milan, where it is 13 °C and foggy
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        api.Weather.Reports(45.46, 9.19, 13, WeatherCondition.Fog);
        using var client = api.CreateSecureClient();

        // When it is looked up through Northwind's invite link
        using var response = await client.PostAsJsonAsync(
            "/api/invites/northwind-7Kq2/postal-code-lookups", new { countryCode = "IT", postalCode = "20121" });

        // Then the answer names Milan and the weather there
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal("Milan", body.GetProperty("city").GetProperty("name").GetString());
        Assert.Equal(13, body.GetProperty("weather").GetProperty("temperatureC").GetDouble());
        Assert.Equal("fog", body.GetProperty("weather").GetProperty("condition").GetString());
    }

    [Fact]
    public async Task A_city_found_with_no_weather_is_still_found()
    {
        // Given 20121 is in Milan, and the weather source has nothing there
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();

        // When it is looked up
        using var response = await client.PostAsJsonAsync(
            "/api/invites/northwind-7Kq2/postal-code-lookups", new { countryCode = "IT", postalCode = "20121" });

        // Then the city is found, with no weather
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        Assert.Equal("Milan", body.GetProperty("city").GetProperty("name").GetString());
        Assert.Equal(JsonValueKind.Null, body.GetProperty("weather").ValueKind);
    }

    private static async Task<List<JsonElement>> PinsAsync(HttpClient client, Session session)
    {
        using var request = session.Request(HttpMethod.Get, $"/api/teams/{session.TeamId}/pins");
        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return body.RootElement.GetProperty("pins").EnumerateArray().ToList();
    }
}
