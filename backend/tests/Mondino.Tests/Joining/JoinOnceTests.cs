// Acceptance Test
// Traces to: L2-005, L2-001, L2-045
// Description: A double-click makes one pin, a full team takes no one and says so, and one client joins at most 5 times a minute

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Joining;

public sealed class JoinOnceTests
{
    private const string Invite = "/api/invites/northwind-7Kq2";
    private const string Join = "/api/invites/northwind-7Kq2/teammates";

    [Fact]
    public async Task Two_requests_of_one_double_click_make_exactly_one_pin()
    {
        // Given Sofia's join request, sent twice at once by a double-click
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();
        var request = Sofia(Guid.NewGuid());

        // When both arrive
        var responses = await Task.WhenAll(client.PostAsJsonAsync(Join, request), client.PostAsJsonAsync(Join, request));

        // Then one made her (201), the other was told of her (200), and both name the same teammate
        Assert.Equal(
            [HttpStatusCode.OK, HttpStatusCode.Created],
            responses.Select(response => response.StatusCode).Order());
        var ids = await Task.WhenAll(responses.Select(async response =>
            (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("teammateId").GetGuid()));
        Assert.Equal(ids[0], ids[1]);

        // And the team has exactly one more teammate
        Assert.Equal(13, await api.TeammateCountAsync("northwind-7Kq2"));
        foreach (var response in responses)
        {
            response.Dispose();
        }
    }

    [Fact]
    public async Task A_join_tried_again_after_its_answer_was_lost_makes_no_second_pin()
    {
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();
        var request = Sofia(Guid.NewGuid());

        using var first = await client.PostAsJsonAsync(Join, request);
        using var again = await client.PostAsJsonAsync(Join, request);

        Assert.Equal(HttpStatusCode.Created, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, again.StatusCode);
        Assert.Equal(
            (await first.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("teammateId").GetGuid(),
            (await again.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("teammateId").GetGuid());
        Assert.Contains(again.Headers.GetValues("Set-Cookie"), cookie => cookie.StartsWith("__Host-mondino-session=", StringComparison.Ordinal));
        Assert.Equal(13, await api.TeammateCountAsync("northwind-7Kq2"));
    }

    [Fact]
    public async Task A_team_of_500_refuses_a_join_with_team_full_and_makes_no_pin()
    {
        // Given Northwind has filled while Sofia was on the Join form
        await using var api = new MondinoApi();
        await api.SeedAsync();
        await api.FillTeamAsync("northwind-7Kq2", 500);
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();

        // When her join arrives
        using var response = await client.PostAsJsonAsync(Join, Sofia(Guid.NewGuid()));

        // Then it is refused with 409 and the code team_full, no pin is made and no session issued
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal("team_full", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        Assert.Equal(500, await api.TeammateCountAsync("northwind-7Kq2"));
        Assert.False(response.Headers.Contains("Set-Cookie"));
    }

    [Fact]
    public async Task A_team_with_499_teammates_takes_one_more()
    {
        await using var api = new MondinoApi();
        await api.SeedAsync();
        await api.FillTeamAsync("northwind-7Kq2", 499);
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();

        using var response = await client.PostAsJsonAsync(Join, Sofia(Guid.NewGuid()));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.Equal(500, await api.TeammateCountAsync("northwind-7Kq2"));
    }

    [Fact]
    public async Task The_invite_link_of_a_full_team_answers_its_name_and_nothing_else_about_it()
    {
        // Given a team that has reached 500 teammates
        await using var api = new MondinoApi();
        await api.SeedAsync();
        await api.FillTeamAsync("northwind-7Kq2", 500);
        using var client = api.CreateClient();

        // When a person opens its invite link
        using var response = await client.GetAsync(Invite);
        var invite = await response.Content.ReadFromJsonAsync<JsonElement>();

        // Then the answer says it is full and names it, with no count, positions or avatars
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(invite.GetProperty("full").GetBoolean());
        Assert.Equal("Northwind", invite.GetProperty("teamName").GetString());
        Assert.Equal(0, invite.GetProperty("teammateCount").GetInt32());
        Assert.Empty(invite.GetProperty("positions").EnumerateArray());
        Assert.Empty(invite.GetProperty("avatars").EnumerateArray());
    }

    [Fact]
    public async Task The_invite_link_of_a_team_with_room_is_not_full()
    {
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateClient();

        var invite = await client.GetFromJsonAsync<JsonElement>(Invite);

        Assert.False(invite.GetProperty("full").GetBoolean());
    }

    [Fact]
    public async Task The_6th_join_in_a_minute_from_one_client_is_refused_with_rate_limited_and_Retry_After()
    {
        // Given one client that has sent 5 join requests in a minute
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();
        for (var join = 1; join <= 5; join++)
        {
            using var allowed = await client.PostAsJsonAsync(Join, Sofia(Guid.NewGuid()));
            Assert.Equal(HttpStatusCode.Created, allowed.StatusCode);
        }

        // When it sends one more
        using var response = await client.PostAsJsonAsync(Join, Sofia(Guid.NewGuid()));

        // Then it is refused with 429, a Retry-After header and the code rate_limited, and no pin is made
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.True(response.Headers.RetryAfter?.Delta > TimeSpan.Zero);
        Assert.Equal("rate_limited", (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString());
        Assert.Equal(17, await api.TeammateCountAsync("northwind-7Kq2"));
    }

    private static object Sofia(Guid joinRequestId) => new
    {
        name = "Sofia Bianchi",
        countryCode = "IT",
        postalCode = "20121",
        joinRequestId,
    };
}
