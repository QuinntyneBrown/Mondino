// Acceptance Test
// Traces to: L2-049, L2-050
// Description: While the weather source fails every pin keeps its city, position and time zone with weather unavailable, never zero; an answer under 3 hours old is given instead; a failing source is left alone for a while, and calls are never queued

using System.Net;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Weather;

public sealed class WeatherWhileFailingTests
{
    [Fact]
    public async Task While_the_source_fails_every_pin_has_its_city_position_and_time_zone_and_no_weather()
    {
        // Given the weather source is failing
        await using var api = new MondinoApi { UsesWeatherSource = true };
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        api.OpenMeteo.Behaviour = SourceBehaviour.Fails;

        // When Sofia reads her team
        var pins = await PinsAsync(client, sofia);

        // Then the read succeeds with every pin at its city, with its position and time zone
        Assert.Equal(13, pins.Count);
        var tomas = pins.Single(pin => pin.GetProperty("name").GetString() == "Tomás Herrera");
        Assert.Equal("Mexico City", tomas.GetProperty("cityName").GetString());
        Assert.Equal("America/Mexico_City", tomas.GetProperty("timeZoneId").GetString());
        Assert.Equal(19.43, Math.Round(tomas.GetProperty("position").GetProperty("latitude").GetDouble(), 2));
        Assert.All(pins, pin =>
        {
            Assert.False(string.IsNullOrEmpty(pin.GetProperty("cityName").GetString()));
            Assert.False(string.IsNullOrEmpty(pin.GetProperty("timeZoneId").GetString()));
            Assert.Equal(JsonValueKind.Number, pin.GetProperty("position").GetProperty("latitude").ValueKind);
            Assert.Equal(JsonValueKind.Number, pin.GetProperty("position").GetProperty("longitude").ValueKind);

            // And the weather is marked unavailable, and is no temperature at all rather than zero
            Assert.Equal("Unavailable", pin.GetProperty("weatherState").GetString());
            Assert.Equal(JsonValueKind.Null, pin.GetProperty("weather").ValueKind);
        });
    }

    [Fact]
    public async Task While_the_source_fails_an_answer_under_3_hours_old_is_given()
    {
        // Given Milan's weather was read at 14:05: 13.2 °C and fog
        await using var api = new MondinoApi { UsesWeatherSource = true };
        await api.SeedAsync();
        api.OpenMeteo.Reports("45.46", "9.19", 13.2, 45);
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        await PinsAsync(client, sofia);

        // When the source fails and the team is read again 2 hours 59 minutes later
        api.OpenMeteo.Behaviour = SourceBehaviour.Fails;
        api.Time.Advance(TimeSpan.FromMinutes(179));
        var asked = api.OpenMeteo.Requests.Count;
        var pins = await PinsAsync(client, sofia);

        // Then the source was asked again, and Milan's weather is the answer read before
        Assert.True(api.OpenMeteo.Requests.Count > asked);
        var luca = pins.Single(pin => pin.GetProperty("name").GetString() == "Luca Ferri");
        Assert.Equal("Available", luca.GetProperty("weatherState").GetString());
        Assert.Equal(13.2, luca.GetProperty("weather").GetProperty("temperatureC").GetDouble());
        Assert.Equal("fog", luca.GetProperty("weather").GetProperty("condition").GetString());

        // And once that answer is 3 hours old it is no longer given
        api.Time.Advance(TimeSpan.FromMinutes(1));
        pins = await PinsAsync(client, sofia);
        luca = pins.Single(pin => pin.GetProperty("name").GetString() == "Luca Ferri");
        Assert.Equal("Unavailable", luca.GetProperty("weatherState").GetString());
        Assert.Equal(JsonValueKind.Null, luca.GetProperty("weather").ValueKind);
    }

    [Fact]
    public async Task A_source_that_keeps_failing_is_left_alone_for_30_seconds_and_the_pins_are_still_read()
    {
        // Given the weather source fails, and a read of the team's twelve cities has failed five
        // times in a row, which opened the breaker, as a rule before the other seven were asked
        await using var api = new MondinoApi { UsesWeatherSource = true };
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        api.OpenMeteo.Behaviour = SourceBehaviour.Fails;
        var first = await PinsAsync(client, sofia);
        var asked = api.OpenMeteo.Requests.Count;
        Assert.InRange(asked, 5, 12);
        Assert.Equal(13, first.Count);

        // When the team is read again within 30 seconds
        api.Time.Advance(TimeSpan.FromSeconds(29));
        var pins = await PinsAsync(client, sofia);

        // Then the source is not called, and the read still answers every pin
        Assert.Equal(asked, api.OpenMeteo.Requests.Count);
        Assert.Equal(13, pins.Count);
        Assert.All(pins, pin => Assert.Equal("Unavailable", pin.GetProperty("weatherState").GetString()));

        // And once 30 seconds have passed it is asked again, and its answer is shown
        api.OpenMeteo.Behaviour = SourceBehaviour.Answers;
        api.Time.Advance(TimeSpan.FromSeconds(1));
        pins = await PinsAsync(client, sofia);
        Assert.Equal(asked + 12, api.OpenMeteo.Requests.Count);
        Assert.All(pins, pin => Assert.Equal("Available", pin.GetProperty("weatherState").GetString()));
    }

    [Fact]
    public async Task The_breakers_threshold_and_pause_are_settings()
    {
        // Given the breaker opens after 20 failures in a row, for 2 minutes
        await using var api = new MondinoApi { UsesWeatherSource = true };
        api.Settings["OutsideSources:FailuresToOpen"] = "20";
        api.Settings["OutsideSources:BreakerOpenFor"] = "00:02:00";
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        api.OpenMeteo.Behaviour = SourceBehaviour.Fails;

        // When the twelve cities fail, it stays closed: the next read asks again, up to the
        // twentieth failure in a row, and no further
        await PinsAsync(client, sofia);
        Assert.Equal(12, api.OpenMeteo.Requests.Count);
        await PinsAsync(client, sofia);
        var asked = api.OpenMeteo.Requests.Count;
        Assert.InRange(asked, 20, 24);

        // And then it stays open for 2 minutes, not 30 seconds
        api.Time.Advance(TimeSpan.FromSeconds(31));
        await PinsAsync(client, sofia);
        Assert.Equal(asked, api.OpenMeteo.Requests.Count);
        api.OpenMeteo.Behaviour = SourceBehaviour.Answers;
        api.Time.Advance(TimeSpan.FromSeconds(89));
        await PinsAsync(client, sofia);
        Assert.Equal(asked + 12, api.OpenMeteo.Requests.Count);
    }

    [Fact]
    public async Task Reads_while_the_source_stalls_share_one_call_per_city_and_none_is_queued()
    {
        // Given the weather source is slow to answer
        await using var api = new MondinoApi { UsesWeatherSource = true };
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        api.OpenMeteo.Behaviour = SourceBehaviour.Stalls;

        // When three reads of the team come while it stalls
        var reads = Enumerable.Range(0, 3).Select(_ => PinsAsync(client, sofia)).ToList();
        await api.OpenMeteo.WaitForRequestsAsync(12);

        // Then the source has one call for each of the twelve cities, not one per read
        Assert.Equal(12, api.OpenMeteo.Requests.Count);

        // And when it answers every read is given the weather, with no call made after it
        api.OpenMeteo.Release();
        var answered = await Task.WhenAll(reads).WaitAsync(TimeSpan.FromSeconds(10));
        Assert.All(answered, pins =>
        {
            Assert.Equal(13, pins.Count);
            Assert.All(pins, pin => Assert.Equal("Available", pin.GetProperty("weatherState").GetString()));
        });
        Assert.Equal(12, api.OpenMeteo.Requests.Count);
    }

    private static async Task<List<JsonElement>> PinsAsync(HttpClient client, Session session)
    {
        using var request = session.Request(HttpMethod.Get, $"/api/teams/{session.TeamId}/pins");
        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return [.. body.RootElement.GetProperty("pins").EnumerateArray().Select(pin => pin.Clone())];
    }
}
