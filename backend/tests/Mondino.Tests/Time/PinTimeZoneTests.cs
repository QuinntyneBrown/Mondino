// Acceptance Test
// Traces to: L2-014, L2-015
// Description: A pin carries its city's IANA time zone and no local time, and whether its status is shared: a teammate who hides it is shown none, but still sees their own

using System.Net;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Time;

public sealed class PinTimeZoneTests
{
    [Fact]
    public async Task Each_pin_carries_its_time_zone_as_an_IANA_name_and_no_local_time()
    {
        // Given Sofia has joined Northwind, whose teammates live from Mexico City to Melbourne
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When she reads the team's pins
        var pins = await PinsAsync(client, sofia);

        // Then each pin carries its city's time zone by its IANA name
        Assert.Equal("America/Mexico_City", TimeZoneOf(pins, "Mexico City"));
        Assert.Equal("Asia/Kolkata", TimeZoneOf(pins, "Bengaluru"));
        Assert.Equal("Australia/Melbourne", TimeZoneOf(pins, "Melbourne"));
        Assert.Equal("Europe/Rome", TimeZoneOf(pins, "Milan"));

        // And no pin carries a local time, an hour, an offset or a status: the browser works them out
        foreach (var pin in pins)
            Assert.DoesNotContain(
                pin.EnumerateObject().Select(p => p.Name),
                name => name.Contains("time", StringComparison.OrdinalIgnoreCase) && name != "timeZoneId"
                    || name.Contains("hour", StringComparison.OrdinalIgnoreCase)
                    || name.Contains("offset", StringComparison.OrdinalIgnoreCase)
                    || name == "status");
    }

    [Fact]
    public async Task A_teammate_who_hides_their_status_is_shown_without_one_and_still_sees_their_own()
    {
        // Given Sofia and Marco have joined Northwind, and Marco does not share whether he is working or asleep
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        var marco = await api.JoinNorthwindAsync(client, "Marco Rossi");
        await api.HideStatusAsync(marco.TeammateId);

        // When Sofia reads the team's pins
        var sofiasPins = await PinsAsync(client, sofia);

        // Then Marco's pin says his status is not shared, and every other pin, hers too, says it is
        Assert.False(SharesStatus(sofiasPins, marco.TeammateId));
        Assert.All(
            sofiasPins.Where(pin => pin.GetProperty("teammateId").GetGuid() != marco.TeammateId),
            pin => Assert.True(pin.GetProperty("sharesStatus").GetBoolean()));

        // And when Marco reads them, his own pin still carries his status
        var marcosPins = await PinsAsync(client, marco);
        Assert.True(SharesStatus(marcosPins, marco.TeammateId));
    }

    private static async Task<List<JsonElement>> PinsAsync(HttpClient client, Session session)
    {
        using var request = session.Request(HttpMethod.Get, $"/api/teams/{session.TeamId}/pins");
        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        return body.RootElement.GetProperty("pins").EnumerateArray().ToList();
    }

    private static string? TimeZoneOf(List<JsonElement> pins, string city) =>
        pins.First(pin => pin.GetProperty("cityName").GetString() == city).GetProperty("timeZoneId").GetString();

    private static bool SharesStatus(List<JsonElement> pins, Guid teammateId) =>
        pins.Single(pin => pin.GetProperty("teammateId").GetGuid() == teammateId).GetProperty("sharesStatus").GetBoolean();
}
