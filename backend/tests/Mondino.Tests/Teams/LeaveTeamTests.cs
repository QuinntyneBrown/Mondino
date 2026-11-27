// Acceptance Test
// Traces to: L2-036, L2-043
// Description: Leaving deletes the asker's own teammate row, their sign-in links and their session, takes their pin off every teammate's next read, keeps a team whose last teammate left, and changes nothing for another team or a request without its antiforgery token

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Teams;

public sealed class LeaveTeamTests
{
    [Fact]
    public async Task Leaving_deletes_the_teammate_and_takes_their_pin_off_for_every_teammate()
    {
        // Given Sofia and Marco in Northwind
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        var marco = await api.JoinNorthwindAsync(client, "Marco Rossi");
        var before = await api.TeammateCountAsync("northwind-7Kq2");

        // When Sofia leaves
        using var response = await client.SendAsync(Leave(sofia));

        // Then it answers 204 with no body, and expires her session and antiforgery cookies
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Empty(await response.Content.ReadAsStringAsync());
        var cookies = response.Headers.GetValues("Set-Cookie").ToList();
        Assert.Contains(cookies, c => c.StartsWith(Sessions.SessionCookie + "=;", StringComparison.Ordinal) && c.Contains("expires=Thu, 01 Jan 1970", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(cookies, c => c.StartsWith(Sessions.AntiforgeryCookie + "=;", StringComparison.Ordinal) && c.Contains("expires=Thu, 01 Jan 1970", StringComparison.OrdinalIgnoreCase));

        // And her row, with her name, postal code, city and settings, is gone; only she is
        Assert.False(await api.TeammateExistsAsync(sofia.TeammateId));
        Assert.True(await api.TeammateExistsAsync(marco.TeammateId));
        Assert.Equal(before - 1, await api.TeammateCountAsync("northwind-7Kq2"));

        // And Marco's next read of the team carries no pin of hers
        using var pins = await client.SendAsync(marco.Request(HttpMethod.Get, $"/api/teams/{marco.TeamId}/pins"));
        var body = await pins.Content.ReadAsStringAsync();
        Assert.Equal(HttpStatusCode.OK, pins.StatusCode);
        using var team = JsonDocument.Parse(body);
        Assert.DoesNotContain(team.RootElement.GetProperty("pins").EnumerateArray(), p => p.GetProperty("teammateId").GetGuid() == sofia.TeammateId);
        Assert.DoesNotContain("Sofia Bianchi", body, StringComparison.Ordinal);

        // And her old session is refused with 401 on every request, leaving again among them
        foreach (var (method, path) in new[]
        {
            (HttpMethod.Get, $"/api/teams/{sofia.TeamId}/pins"),
            (HttpMethod.Get, $"/api/teams/{sofia.TeamId}/me"),
            (HttpMethod.Get, $"/api/teams/{sofia.TeamId}/moments"),
            (HttpMethod.Delete, $"/api/teams/{sofia.TeamId}/me"),
        })
        {
            using var reused = sofia.Request(method, path);
            using var answer = await client.SendAsync(reused);
            Assert.True(answer.StatusCode == HttpStatusCode.Unauthorized, $"{method} {path}: {answer.StatusCode}");
        }
    }

    [Fact]
    public async Task The_last_teammate_leaving_deletes_their_email_and_sign_in_links_and_keeps_the_team()
    {
        // Given Liam made Southwind with his email, alone in it, and asked for a sign-in link
        await using var api = new MondinoApi();
        using var client = api.CreateSecureClient();
        var liam = await api.MakeTeamAsync(client);
        using (var asked = await client.PostAsJsonAsync("/api/sign-in-links", new { email = "liam@southwind.co" }))
        {
            Assert.Equal(HttpStatusCode.Accepted, asked.StatusCode);
        }

        var token = api.SignInMails.TokenSentTo("liam@southwind.co");
        var fingerprint = (await api.TeammateAsync(liam.TeammateId)).EmailFingerprint!;
        Assert.Equal(1, await api.SignInLinkCountAsync(fingerprint));

        // When he leaves
        using var response = await client.SendAsync(Leave(liam));

        // Then nothing about him remains: no teammate row, so no email fingerprint, and no sign-in link
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.False(await api.TeammateExistsAsync(liam.TeammateId));
        Assert.Equal(0, await api.SignInLinkCountAsync(fingerprint));

        // And the link he was mailed signs no one in
        using var opened = await api.CreateSecureClient().PostAsJsonAsync("/api/sign-in-links/redemptions", new { signInToken = token });
        Assert.Equal(HttpStatusCode.Gone, opened.StatusCode);

        // And Southwind is kept, with no teammate, its invite link still opening it
        Assert.Equal(1, await api.TeamCountAsync());
        var inviteToken = await api.InviteTokenAsync(liam.TeamId);
        using var invite = await client.GetAsync($"/api/invites/{inviteToken}");
        Assert.Equal(HttpStatusCode.OK, invite.StatusCode);
        Assert.Equal(0, JsonDocument.Parse(await invite.Content.ReadAsStringAsync()).RootElement.GetProperty("teammateCount").GetInt32());
    }

    [Fact]
    public async Task An_email_still_on_another_team_keeps_its_sign_in_links()
    {
        // Given Liam made Southwind and Harbour Lights with one email, and asked for a sign-in link
        await using var api = new MondinoApi();
        using var client = api.CreateSecureClient();
        var southwind = await api.MakeTeamAsync(client);
        api.Time.Advance(TimeSpan.FromDays(1));
        await api.MakeTeamAsync(client, "Harbour Lights");
        using (await client.PostAsJsonAsync("/api/sign-in-links", new { email = "liam@southwind.co" }))
        {
        }

        var fingerprint = (await api.TeammateAsync(southwind.TeammateId)).EmailFingerprint!;

        // When he leaves Southwind
        using var response = await client.SendAsync(Leave(southwind));

        // Then his link stays, for Harbour Lights
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(1, await api.SignInLinkCountAsync(fingerprint));
    }

    [Fact]
    public async Task Leaving_through_another_teams_address_or_without_the_antiforgery_token_changes_nothing()
    {
        // Given Sofia in Northwind, and Liam in Southwind
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        var liam = await api.MakeTeamAsync(client);

        // When Sofia leaves through Southwind's address, then it is refused as a team she is not on
        using var elsewhere = sofia.Request(HttpMethod.Delete, $"/api/teams/{liam.TeamId}/me");
        using var refused = await client.SendAsync(elsewhere);
        Assert.Equal(HttpStatusCode.NotFound, refused.StatusCode);
        Assert.Equal("team_not_found", JsonDocument.Parse(await refused.Content.ReadAsStringAsync()).RootElement.GetProperty("code").GetString());

        // When she leaves without the antiforgery token, then it is refused as a cross-site request
        using var unprotected = sofia.Request(HttpMethod.Delete, $"/api/teams/{sofia.TeamId}/me", withToken: false);
        using var forged = await client.SendAsync(unprotected);
        Assert.Equal(HttpStatusCode.Forbidden, forged.StatusCode);

        // And both of them are still on their teams
        Assert.True(await api.TeammateExistsAsync(sofia.TeammateId));
        Assert.True(await api.TeammateExistsAsync(liam.TeammateId));
    }

    private static HttpRequestMessage Leave(Session session) =>
        session.Request(HttpMethod.Delete, $"/api/teams/{session.TeamId}/me");
}
