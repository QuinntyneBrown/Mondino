// Acceptance Test
// Traces to: L2-053, L2-006, L2-043, L2-044, L2-045
// Description: Making a team makes one team with its maker's pin at the city, an invite token and a session, keeps only a fingerprint of the email, and makes no second team for a repeated request

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Teams;

public sealed class CreateTeamTests
{
    private const string Teams = "/api/teams";

    [Fact]
    public async Task Making_a_team_makes_it_with_its_maker_at_the_city_an_invite_token_and_a_session()
    {
        // Given a source that knows 20121 in Italy is in Milan
        await using var api = new MondinoApi();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();

        // When Sofia makes Northwind
        using var response = await client.PostAsJsonAsync(Teams, CreateTeamRefusedTests.Northwind());
        var body = await response.Content.ReadAsStringAsync();

        // Then the team is made, named by random ids, with an invite token of at least 128 bits
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var result = JsonDocument.Parse(body);
        var teamId = result.RootElement.GetProperty("teamId").GetGuid();
        var teammateId = result.RootElement.GetProperty("teammateId").GetGuid();
        var inviteToken = result.RootElement.GetProperty("inviteToken").GetString()!;
        Assert.Equal("Northwind", result.RootElement.GetProperty("teamName").GetString());
        Assert.Equal(4, teamId.Version);
        Assert.Equal(4, teammateId.Version);
        Assert.Matches("^[A-Za-z0-9_-]{22,}$", inviteToken);

        // And the answer echoes neither the postal code nor the email
        Assert.DoesNotContain("20121", body, StringComparison.Ordinal);
        Assert.DoesNotContain("sofia@", body, StringComparison.OrdinalIgnoreCase);

        // And its one teammate is Sofia, at Milan, with the first teammate colour
        Assert.Equal(1, await api.TeamCountAsync());
        Assert.Equal(1, await api.TeammateCountAsync(inviteToken));
        var sofia = await api.TeammateAsync(teammateId);
        Assert.Equal(teamId, sofia.TeamId);
        Assert.Equal("Sofia Bianchi", sofia.Name);
        Assert.Equal("Milan", sofia.City.Name);
        Assert.Equal(KnownCities.Milan.Latitude, sofia.City.Latitude, 5);
        Assert.Equal("teammate-1", sofia.Colour);
        Assert.Equal("20121", sofia.PostalCode);

        // And her email is kept only as a fingerprint, never as the address
        Assert.Matches("^[0-9a-f]{64}$", sofia.EmailFingerprint!);
        Assert.DoesNotContain("sofia", sofia.EmailFingerprint!, StringComparison.OrdinalIgnoreCase);

        // And she is signed in: the invite link knows she is already in the team
        var cookie = Assert.Single(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith("__Host-mondino-session=", StringComparison.Ordinal));
        Assert.StartsWith("__Host-mondino-session=", cookie, StringComparison.Ordinal);
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        using var open = new HttpRequestMessage(HttpMethod.Get, $"/api/invites/{inviteToken}");
        open.Headers.Add("Cookie", cookie.Split(';')[0]);
        using var invite = await client.SendAsync(open);
        Assert.True((await invite.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("alreadyJoined").GetBoolean());
    }

    [Fact]
    public async Task One_email_gives_one_fingerprint_whatever_its_case_and_spaces()
    {
        await using var api = new MondinoApi();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();

        var first = await MakeAsync(client, CreateTeamRefusedTests.Northwind(email: "sofia@northwind.co"));
        var second = await MakeAsync(client, CreateTeamRefusedTests.Northwind(teamName: "Southwind", email: "  Sofia@Northwind.CO "));

        Assert.Equal((await api.TeammateAsync(first)).EmailFingerprint, (await api.TeammateAsync(second)).EmailFingerprint);
    }

    [Fact]
    public async Task An_email_already_on_another_team_makes_a_team_like_any_other()
    {
        // Given Sofia has made Northwind with her email
        await using var api = new MondinoApi();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();
        using var first = await client.PostAsJsonAsync(Teams, CreateTeamRefusedTests.Northwind());

        // When a team is made with the same email
        using var second = await client.PostAsJsonAsync(Teams, CreateTeamRefusedTests.Northwind(teamName: "Southwind"));

        // Then it is made, and the answer has the same shape: it says nothing of the email
        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.Created, second.StatusCode);
        Assert.Equal(
            (await first.Content.ReadFromJsonAsync<JsonElement>()).EnumerateObject().Select(p => p.Name),
            (await second.Content.ReadFromJsonAsync<JsonElement>()).EnumerateObject().Select(p => p.Name));
        Assert.Equal(2, await api.TeamCountAsync());
    }

    [Fact]
    public async Task Two_requests_of_one_double_click_make_exactly_one_team()
    {
        await using var api = new MondinoApi();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();
        var request = CreateTeamRefusedTests.Northwind();

        var responses = await Task.WhenAll(client.PostAsJsonAsync(Teams, request), client.PostAsJsonAsync(Teams, request));

        Assert.Equal([HttpStatusCode.OK, HttpStatusCode.Created], responses.Select(r => r.StatusCode).Order());
        var ids = await Task.WhenAll(responses.Select(async r => (await r.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("teamId").GetGuid()));
        Assert.Equal(ids[0], ids[1]);
        Assert.Equal(1, await api.TeamCountAsync());
        foreach (var response in responses)
        {
            Assert.Contains(response.Headers.GetValues("Set-Cookie"), c => c.StartsWith("__Host-mondino-session=", StringComparison.Ordinal));
            response.Dispose();
        }
    }

    [Fact]
    public async Task A_team_made_while_the_lookup_is_down_is_placed_at_the_city_chosen()
    {
        await using var api = new MondinoApi();
        api.PostalCodes.IsDown = true;
        using var client = api.CreateSecureClient();

        using var response = await client.PostAsJsonAsync(Teams, new
        {
            teamName = "Northwind",
            name = "Sofia Bianchi",
            email = "sofia@northwind.co",
            countryCode = "IT",
            cityId = KnownCities.Milan.CityId,
            createRequestId = Guid.NewGuid(),
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var sofia = await api.TeammateAsync((await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("teammateId").GetGuid());
        Assert.Equal("Milan", sofia.City.Name);
        Assert.Null(sofia.PostalCode);
        Assert.Empty(api.PostalCodes.Asked);
    }

    [Fact]
    public async Task Names_are_stored_trimmed_and_without_control_characters_and_unknown_fields_are_ignored()
    {
        await using var api = new MondinoApi();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();
        var chosenId = Guid.NewGuid();

        using var response = await client.PostAsJsonAsync(Teams, new
        {
            teamName = "  North\u0007wind\n ",
            name = " Sofia Bianchi ",
            email = "sofia@northwind.co",
            countryCode = "IT",
            postalCode = "20121",
            createRequestId = Guid.NewGuid(),
            teamId = chosenId,
            inviteToken = "chosen-token",
            colour = "teammate-9",
        });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal("Northwind", result.GetProperty("teamName").GetString());
        Assert.NotEqual(chosenId, result.GetProperty("teamId").GetGuid());
        Assert.NotEqual("chosen-token", result.GetProperty("inviteToken").GetString());
        var sofia = await api.TeammateAsync(result.GetProperty("teammateId").GetGuid());
        Assert.Equal("Sofia Bianchi", sofia.Name);
        Assert.Equal("teammate-1", sofia.Colour);
    }

    [Fact]
    public async Task A_team_cannot_be_made_while_the_email_key_is_not_set_and_nothing_is_stored()
    {
        await using var api = new MondinoApi { EmailKey = null };
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();

        using var response = await client.PostAsJsonAsync(Teams, CreateTeamRefusedTests.Northwind());

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal(0, await api.TeamCountAsync());
        Assert.False(response.Headers.Contains("Set-Cookie"));
    }

    [Fact]
    public async Task The_sixth_team_in_an_hour_from_one_client_is_refused_with_rate_limited_and_Retry_After()
    {
        // Given one client that has made five teams this hour
        await using var api = new MondinoApi();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();
        for (var made = 1; made <= 5; made++)
        {
            using var allowed = await client.PostAsJsonAsync(Teams, CreateTeamRefusedTests.Northwind(teamName: $"Team {made}"));
            Assert.Equal(HttpStatusCode.Created, allowed.StatusCode);
        }

        // When it asks for a sixth
        using var response = await client.PostAsJsonAsync(Teams, CreateTeamRefusedTests.Northwind(teamName: "Team 6"));

        // Then it is refused with 429, a Retry-After header and the code rate_limited, and no team is made
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.True(response.Headers.RetryAfter?.Delta > TimeSpan.FromMinutes(1));
        Assert.Equal("rate_limited", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        Assert.Equal(5, await api.TeamCountAsync());
    }

    private static async Task<Guid> MakeAsync(HttpClient client, object request)
    {
        using var response = await client.PostAsJsonAsync(Teams, request);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("teammateId").GetGuid();
    }
}
