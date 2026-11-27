// Acceptance Test
// Traces to: L2-043
// Description: A teammate reads only their own team: no session is 401, another team is 404 like no team, a left teammate's session is 401

using System.Net;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Teams;

public sealed class TeamScopeTests
{
    [Fact]
    public async Task A_teammate_reads_their_own_teams_pins()
    {
        // Given Sofia has joined Northwind
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When she reads Northwind's pins with her session
        using var request = sofia.Request(HttpMethod.Get, $"/api/teams/{sofia.TeamId}/pins");
        using var response = await client.SendAsync(request);

        // Then she is answered with her team and its thirteen pins, hers marked as the viewer's
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(sofia.TeamId, body.RootElement.GetProperty("teamId").GetGuid());
        Assert.Equal("Northwind", body.RootElement.GetProperty("teamName").GetString());
        Assert.Equal(sofia.TeammateId, body.RootElement.GetProperty("viewerTeammateId").GetGuid());
        var pins = body.RootElement.GetProperty("pins").EnumerateArray().ToList();
        Assert.Equal(13, pins.Count);
        var own = Assert.Single(pins, pin => pin.GetProperty("isViewer").GetBoolean());
        Assert.Equal(sofia.TeammateId, own.GetProperty("teammateId").GetGuid());
    }

    [Theory]
    [InlineData("pins")]
    [InlineData("me")]
    public async Task A_request_for_a_teams_data_with_no_session_is_refused_with_401_and_carries_no_team_data(string what)
    {
        // Given Northwind and a browser with no session
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var teamId = await api.TeamIdAsync("northwind-7Kq2");

        // When it asks for Northwind's data by its id
        using var response = await client.GetAsync($"/api/teams/{teamId}/{what}");
        var body = await response.Content.ReadAsStringAsync();

        // Then it is refused with 401 and learns nothing of the team
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("unauthorized", JsonDocument.Parse(body).RootElement.GetProperty("code").GetString());
        Assert.DoesNotContain("Northwind", body, StringComparison.Ordinal);
        Assert.DoesNotContain("Mexico City", body, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("pins")]
    [InlineData("me")]
    public async Task A_teammate_of_another_team_is_answered_404_as_for_a_team_that_does_not_exist(string what)
    {
        // Given Sofia in Northwind, and Liam who made Southwind
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        var liam = await api.MakeTeamAsync(client);

        // When Liam asks for Northwind's data by its id, and for a team that does not exist
        using var other = liam.Request(HttpMethod.Get, $"/api/teams/{sofia.TeamId}/{what}");
        using var refused = await client.SendAsync(other);
        using var none = liam.Request(HttpMethod.Get, $"/api/teams/{Guid.NewGuid()}/{what}");
        using var missing = await client.SendAsync(none);

        // Then both are refused with 404 and the code team_not_found, alike
        var refusedBody = await refused.Content.ReadAsStringAsync();
        var missingBody = await missing.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.NotFound, refused.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
        Assert.Equal("team_not_found", JsonDocument.Parse(refusedBody).RootElement.GetProperty("code").GetString());
        Assert.Equal("team_not_found", JsonDocument.Parse(missingBody).RootElement.GetProperty("code").GetString());
        Assert.DoesNotContain("Northwind", refusedBody, StringComparison.Ordinal);
        Assert.DoesNotContain("Sofia", refusedBody, StringComparison.Ordinal);
    }

    [Fact]
    public async Task A_teammate_who_has_left_is_refused_with_401_on_every_request()
    {
        // Given Sofia joined Northwind, then left it
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        await api.RemoveTeammateAsync(sofia.TeammateId);

        // When she reuses her old session
        using var pins = sofia.Request(HttpMethod.Get, $"/api/teams/{sofia.TeamId}/pins");
        using var pinsAnswer = await client.SendAsync(pins);
        using var me = sofia.Request(HttpMethod.Get, $"/api/teams/{sofia.TeamId}/me");
        using var meAnswer = await client.SendAsync(me);

        // Then every request is refused with 401
        Assert.Equal(HttpStatusCode.Unauthorized, pinsAnswer.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, meAnswer.StatusCode);
    }

    [Fact]
    public async Task There_is_no_way_to_change_or_remove_another_teammates_pin_or_settings()
    {
        // Given Sofia and Marco, both in Northwind
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        var marco = await api.JoinNorthwindAsync(client, "Marco Rossi");
        var before = await api.TeammateAsync(marco.TeammateId);

        // When Sofia sends requests to change or remove Marco's pin or settings, naming him by id
        var change = new { name = "Changed", countryCode = "CA", postalCode = "M5V 2T6", teammateId = marco.TeammateId };
        var attempts = new[]
        {
            sofia.Request(HttpMethod.Put, $"/api/teams/{sofia.TeamId}/teammates/{marco.TeammateId}", change),
            sofia.Request(HttpMethod.Patch, $"/api/teams/{sofia.TeamId}/teammates/{marco.TeammateId}/settings", change),
            sofia.Request(HttpMethod.Delete, $"/api/teams/{sofia.TeamId}/teammates/{marco.TeammateId}"),
            sofia.Request(HttpMethod.Put, $"/api/teams/{sofia.TeamId}/me", change),
            sofia.Request(HttpMethod.Delete, $"/api/teams/{sofia.TeamId}/me/{marco.TeammateId}"),
        };

        // Then each is refused
        foreach (var attempt in attempts)
        {
            using (attempt)
            {
                using var answer = await client.SendAsync(attempt);
                Assert.True((int)answer.StatusCode is 403 or 404 or 405, $"{attempt.Method} {attempt.RequestUri}: {answer.StatusCode}");
            }
        }

        // And nothing of Marco's changed
        var after = await api.TeammateAsync(marco.TeammateId);
        Assert.Equal(before.Name, after.Name);
        Assert.Equal(before.CityId, after.CityId);
        Assert.Equal(before.PostalCode, after.PostalCode);
        Assert.Equal(before.Colour, after.Colour);
    }
}
