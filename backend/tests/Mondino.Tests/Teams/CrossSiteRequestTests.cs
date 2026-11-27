// Acceptance Test
// Traces to: L2-043
// Description: A session is a cookie scripts cannot read, and a change made with it needs the antiforgery token the API gave it

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Teams;

public sealed class CrossSiteRequestTests
{
    [Fact]
    public async Task Joining_issues_the_session_and_an_antiforgery_token_scripts_can_read()
    {
        // Given Northwind
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);

        // When Sofia joins
        using var response = await client.PostAsJsonAsync("/api/invites/northwind-7Kq2/teammates", new
        {
            name = "Sofia Bianchi",
            countryCode = "IT",
            postalCode = "20121",
            joinRequestId = Guid.NewGuid(),
        });

        // Then her session is HttpOnly, Secure and SameSite=Lax
        var cookies = response.Headers.GetValues("Set-Cookie").ToList();
        var session = Assert.Single(cookies, c => c.StartsWith(Sessions.SessionCookie + "=", StringComparison.Ordinal));
        Assert.Contains("httponly", session, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", session, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=lax", session, StringComparison.OrdinalIgnoreCase);

        // And the antiforgery token is in a cookie scripts can read, sent only to Mondino itself
        var token = Assert.Single(cookies, c => c.StartsWith(Sessions.AntiforgeryCookie + "=", StringComparison.Ordinal));
        Assert.DoesNotContain("httponly", token, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", token, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", token, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("path=/", token, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Making_a_team_issues_the_antiforgery_token_too()
    {
        await using var api = new MondinoApi();
        using var client = api.CreateSecureClient();

        var liam = await api.MakeTeamAsync(client);

        Assert.False(string.IsNullOrEmpty(liam.AntiforgeryToken));
    }

    [Fact]
    public async Task A_change_with_the_session_and_its_token_is_made()
    {
        // Given Sofia, signed in
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When she makes a change with her session and her token
        using var request = sofia.Request(HttpMethod.Post, $"/api/test-only/teams/{sofia.TeamId}/changes", new { });
        using var response = await client.SendAsync(request);

        // Then it is made
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal(1, api.Changes.Made);
    }

    [Fact]
    public async Task A_change_with_the_session_and_no_token_is_refused_and_nothing_changes()
    {
        // Given Sofia, signed in: another site can make her browser send her session cookie, but
        // cannot read the token
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When a change arrives with her session and without the token
        using var request = sofia.Request(HttpMethod.Post, $"/api/test-only/teams/{sofia.TeamId}/changes", new { }, withToken: false);
        using var response = await client.SendAsync(request);

        // Then it is refused with 403 and cross_site_request, and nothing changes
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("cross_site_request", problem.RootElement.GetProperty("code").GetString());
        Assert.Equal(0, api.Changes.Made);
    }

    [Fact]
    public async Task A_change_with_another_teammates_token_is_refused()
    {
        // Given Sofia and Marco, both signed in
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        var marco = await api.JoinNorthwindAsync(client, "Marco Rossi");

        // When a change arrives with Sofia's session and Marco's token
        using var request = (sofia with { AntiforgeryToken = marco.AntiforgeryToken })
            .Request(HttpMethod.Post, $"/api/test-only/teams/{sofia.TeamId}/changes", new { });
        using var response = await client.SendAsync(request);

        // Then it is refused, and nothing changes
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal(0, api.Changes.Made);
    }

    [Fact]
    public async Task Reading_the_team_with_a_session_gives_the_token_again()
    {
        // Given Sofia's browser has her session but has lost the token's cookie
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        var sessionOnly = string.Join("; ", sofia.Cookies.Split("; ").Where(c => !c.StartsWith(Sessions.AntiforgeryCookie, StringComparison.Ordinal)));

        // When she reads her team
        using var read = new HttpRequestMessage(HttpMethod.Get, $"/api/teams/{sofia.TeamId}/pins");
        read.Headers.Add("Cookie", sessionOnly);
        using var answer = await client.SendAsync(read);

        // Then the answer gives a token, and a change made with it is accepted
        var cookies = answer.Headers.GetValues("Set-Cookie").Select(c => c.Split(';')[0]).ToList();
        var token = cookies.Single(c => c.StartsWith(Sessions.AntiforgeryCookie + "=", StringComparison.Ordinal))[(Sessions.AntiforgeryCookie.Length + 1)..];
        var renewed = new Session(sofia.TeamId, sofia.TeammateId, string.Join("; ", cookies.Prepend(sessionOnly)))
        {
            AntiforgeryToken = Uri.UnescapeDataString(token),
        };
        using var change = renewed.Request(HttpMethod.Post, $"/api/test-only/teams/{sofia.TeamId}/changes", new { });
        using var changed = await client.SendAsync(change);
        Assert.Equal(HttpStatusCode.NoContent, changed.StatusCode);
    }
}
