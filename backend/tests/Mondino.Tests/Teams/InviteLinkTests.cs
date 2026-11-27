// Acceptance Test
// Traces to: L2-054, L2-043
// Description: Any teammate of a team, whoever made it, reads its invite link with the team's pins; a request with no session, or from a teammate of another team, is refused and carries no invite link

using System.Net;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Teams;

public sealed class InviteLinkTests
{
    [Fact]
    public async Task Any_teammate_reads_their_teams_invite_link_whoever_made_the_team()
    {
        // Given Sofia, who joined Northwind by its link, and Liam, who made Southwind
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        var liam = await api.MakeTeamAsync(client);

        // When each reads their own team
        var northwind = await InviteTokenAsync(client, sofia.Request(HttpMethod.Get, $"/api/teams/{sofia.TeamId}/pins"));
        var southwind = await InviteTokenAsync(client, liam.Request(HttpMethod.Get, $"/api/teams/{liam.TeamId}/pins"));

        // Then Sofia, who did not make Northwind, has its invite link, and Liam has Southwind's own
        Assert.Equal("northwind-7Kq2", northwind);
        Assert.False(string.IsNullOrWhiteSpace(southwind));
        Assert.NotEqual(northwind, southwind);
    }

    [Fact]
    public async Task No_session_and_a_teammate_of_another_team_are_refused_and_learn_no_invite_link()
    {
        // Given Northwind, Sofia on it, and Liam, who made Southwind
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        var liam = await api.MakeTeamAsync(client);

        // When a browser with no session, and Liam, ask for Northwind's pins
        using var anonymous = api.CreateSecureClient();
        using var noSession = await anonymous.GetAsync($"/api/teams/{sofia.TeamId}/pins");
        using var request = liam.Request(HttpMethod.Get, $"/api/teams/{sofia.TeamId}/pins");
        using var otherTeam = await client.SendAsync(request);

        // Then they are refused with 401 and 404, and neither answer carries the invite link
        Assert.Equal(HttpStatusCode.Unauthorized, noSession.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, otherTeam.StatusCode);
        Assert.DoesNotContain("northwind-7Kq2", await noSession.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        Assert.DoesNotContain("northwind-7Kq2", await otherTeam.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        Assert.DoesNotContain("inviteToken", await otherTeam.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    private static async Task<string?> InviteTokenAsync(HttpClient client, HttpRequestMessage request)
    {
        using (request)
        {
            using var response = await client.SendAsync(request);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
            return body.RootElement.GetProperty("inviteToken").GetString();
        }
    }
}
