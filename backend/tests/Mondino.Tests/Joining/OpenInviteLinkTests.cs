// Acceptance Test
// Traces to: L2-001
// Description: An invite link answers its team's name, count, bare positions and five avatars, and nothing more

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Joining;

public sealed class OpenInviteLinkTests
{
    private const string Northwind = "/api/invites/northwind-7Kq2";

    [Fact]
    public async Task A_valid_invite_link_answers_the_teams_name_count_and_a_bare_position_for_each_teammate()
    {
        // Given Northwind, seeded with its twelve teammates
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateClient();

        // When its invite link is opened
        using var response = await client.GetAsync(Northwind);

        // Then the answer names the team, counts twelve and carries twelve bare positions
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var invite = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = invite.RootElement;
        Assert.Equal("Northwind", root.GetProperty("teamName").GetString());
        Assert.Equal(12, root.GetProperty("teammateCount").GetInt32());
        Assert.False(root.GetProperty("alreadyJoined").GetBoolean());
        var positions = root.GetProperty("positions").EnumerateArray().ToList();
        Assert.Equal(12, positions.Count);
        Assert.All(positions, position => Assert.Equal(
            ["latitude", "longitude"],
            position.EnumerateObject().Select(property => property.Name).Order()));

        // And Milan is among them, at the city's position
        Assert.Contains(positions, position =>
            Math.Abs(position.GetProperty("latitude").GetDouble() - 45.4642) < 0.001 &&
            Math.Abs(position.GetProperty("longitude").GetDouble() - 9.19) < 0.001);
    }

    [Fact]
    public async Task The_avatars_are_the_initials_and_colours_of_the_five_who_joined_most_recently()
    {
        // Given Northwind, whose five most recent teammates are Mara, Liam, Lena, Kwame and Ahmed
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateClient();

        // When its invite link is opened
        var invite = await client.GetFromJsonAsync<JsonElement>(Northwind);

        // Then the avatars are their initials and colours, most recent first, and nothing else
        var avatars = invite.GetProperty("avatars").EnumerateArray().ToList();
        Assert.Equal(
            ["ML teammate-2", "LO teammate-3", "LF teammate-4", "KM teammate-5", "AA teammate-6"],
            avatars.Select(avatar => $"{avatar.GetProperty("initials").GetString()} {avatar.GetProperty("colour").GetString()}"));
        Assert.All(avatars, avatar => Assert.Equal(
            ["colour", "initials"],
            avatar.EnumerateObject().Select(property => property.Name).Order()));
    }

    [Fact]
    public async Task The_answer_carries_no_teammate_id_name_city_time_zone_weather_or_postal_code()
    {
        // Given Northwind
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateClient();

        // When its invite link is opened
        var answer = System.Text.Json.Nodes.JsonNode.Parse(await client.GetStringAsync(Northwind))!.AsObject();

        // Then, beside the supported countries and the form of their postal codes, nothing in the
        // answer names a teammate, a city, a time zone, the weather or a postal code
        Assert.True(answer.Remove("countries"));
        var body = answer.ToJsonString();
        foreach (var secret in new[]
                 {
                     "Mara", "Lindqvist", "Kwame", "Stockholm", "Milan", "Accra", "Europe/", "Africa/",
                     "\"id\"", "teammateId", "timeZone", "weather", "postal", "20121", "inviteToken",
                 })
        {
            Assert.DoesNotContain(secret, body, StringComparison.OrdinalIgnoreCase);
        }
    }

    [Fact]
    public async Task The_answer_lists_the_supported_countries_in_alphabetical_order()
    {
        // Given Northwind
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateClient();

        // When its invite link is opened
        var invite = await client.GetFromJsonAsync<JsonElement>(Northwind);

        // Then the Join form's countries are the thirteen supported, in alphabetical order
        Assert.Equal(
            [
                "AU Australia", "BR Brazil", "CA Canada", "DE Germany", "GH Ghana", "IN India", "IE Ireland",
                "IT Italy", "JP Japan", "MX Mexico", "SE Sweden", "AE United Arab Emirates", "US United States",
            ],
            invite.GetProperty("countries").EnumerateArray()
                .Select(country => $"{country.GetProperty("code").GetString()} {country.GetProperty("name").GetString()}"));
    }

    [Theory]
    [InlineData("/api/invites/northwind-0000")]
    [InlineData("/api/invites/NORTHWIND-7KQ2")]
    public async Task An_invite_link_that_matches_no_team_is_refused_with_invite_not_found_and_names_no_team(string address)
    {
        // Given Northwind
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateClient();

        // When an invite link that matches no team is opened
        using var response = await client.GetAsync(address);
        var body = await response.Content.ReadAsStringAsync();

        // Then it is refused with 404 and the code "invite_not_found", and says nothing of any team
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var problem = JsonDocument.Parse(body);
        Assert.Equal("invite_not_found", problem.RootElement.GetProperty("code").GetString());
        Assert.DoesNotContain("Northwind", body, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("positions", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task A_teammate_already_in_the_team_is_told_so_and_learns_nothing_more()
    {
        // Given Northwind, and a browser whose session belongs to one of its teammates
        await using var api = new MondinoApi();
        await api.SeedAsync();
        await api.SignInAsTeammateOfAsync("northwind-7Kq2");
        using var client = api.CreateClient();

        // When that browser opens the team's invite link
        var invite = await client.GetFromJsonAsync<JsonElement>(Northwind);

        // Then the answer says they are already in the team, and carries no positions or avatars
        Assert.True(invite.GetProperty("alreadyJoined").GetBoolean());
        Assert.Empty(invite.GetProperty("positions").EnumerateArray());
        Assert.Empty(invite.GetProperty("avatars").EnumerateArray());
    }

    [Fact]
    public async Task A_session_on_another_team_is_not_already_in_this_one()
    {
        // Given Northwind, and a browser whose session belongs to a teammate of another team
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.SignInAsTeammateOfAnotherTeam();
        using var client = api.CreateClient();

        // When that browser opens Northwind's invite link
        var invite = await client.GetFromJsonAsync<JsonElement>(Northwind);

        // Then it sees the Join screen's answer, as anyone would
        Assert.False(invite.GetProperty("alreadyJoined").GetBoolean());
        Assert.Equal(12, invite.GetProperty("positions").GetArrayLength());
    }

    [Fact]
    public async Task Seeding_twice_leaves_one_Northwind_with_its_twelve_teammates()
    {
        // Given the seed has run once
        await using var api = new MondinoApi();
        await api.SeedAsync();

        // When it runs again
        await api.SeedAsync();

        // Then Northwind still counts twelve teammates
        using var client = api.CreateClient();
        var invite = await client.GetFromJsonAsync<JsonElement>(Northwind);
        Assert.Equal(12, invite.GetProperty("teammateCount").GetInt32());
        Assert.Equal(12, invite.GetProperty("positions").GetArrayLength());
    }
}
