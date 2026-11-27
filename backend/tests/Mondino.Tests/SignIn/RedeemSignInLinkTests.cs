// Acceptance Test
// Traces to: L2-052, L2-043, L2-045
// Description: Opening a sign-in link within 15 minutes signs its teammate in, once; a used, expired or unknown link signs no one in, and an email on no team gets no session

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.SignIn;

public sealed class RedeemSignInLinkTests
{
    private const string Redemptions = "/api/sign-in-links/redemptions";

    [Fact]
    public async Task A_good_link_opened_for_the_first_time_signs_its_teammate_in_to_their_team()
    {
        // Given Sofia, who made Northwind, and a sign-in link mailed to her
        await using var api = new MondinoApi();
        using var maker = api.CreateSecureClient();
        var made = await api.MakeTeamAsync(maker, "Northwind", "sofia@northwind.co");
        var token = await AskForLinkAsync(api, maker, "sofia@northwind.co");

        // When it is opened 14 minutes later, on a new browser
        api.Time.Advance(TimeSpan.FromMinutes(14));
        using var browser = api.CreateSecureClient();
        using var response = await browser.PostAsJsonAsync(Redemptions, new { signInToken = token });

        // Then it answers Northwind, by ids and name, and no email
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        using var result = JsonDocument.Parse(body);
        var membership = result.RootElement.GetProperty("membership");
        Assert.Equal(made.TeamId, membership.GetProperty("teamId").GetGuid());
        Assert.Equal(made.TeammateId, membership.GetProperty("teammateId").GetGuid());
        Assert.Equal("Northwind", membership.GetProperty("teamName").GetString());
        Assert.Equal(JsonValueKind.Null, result.RootElement.GetProperty("email").ValueKind);
        Assert.DoesNotContain("sofia@", body, StringComparison.OrdinalIgnoreCase);

        // And the browser holds Sofia's session, which opens Northwind's pins
        var session = await SessionOfAsync(response);
        using var pins = await browser.SendAsync(session.Request(HttpMethod.Get, $"/api/teams/{made.TeamId}/pins"));
        Assert.Equal(HttpStatusCode.OK, pins.StatusCode);
    }

    [Fact]
    public async Task A_link_opened_a_second_time_signs_no_one_in()
    {
        // Given a sign-in link of Sofia's that has been opened once
        await using var api = new MondinoApi();
        using var client = api.CreateSecureClient();
        await api.MakeTeamAsync(client, "Northwind", "sofia@northwind.co");
        var token = await AskForLinkAsync(api, client, "sofia@northwind.co");
        using (var first = await api.CreateSecureClient().PostAsJsonAsync(Redemptions, new { signInToken = token }))
        {
            Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        }

        // When it is opened again
        using var again = await api.CreateSecureClient().PostAsJsonAsync(Redemptions, new { signInToken = token });

        // Then it is refused as unusable, and no session is issued
        await AssertUnusableAsync(again);
    }

    [Fact]
    public async Task A_link_opened_15_minutes_after_it_was_asked_for_signs_no_one_in()
    {
        await using var api = new MondinoApi();
        using var client = api.CreateSecureClient();
        await api.MakeTeamAsync(client, "Northwind", "sofia@northwind.co");
        var token = await AskForLinkAsync(api, client, "sofia@northwind.co");

        api.Time.Advance(TimeSpan.FromMinutes(15));
        using var response = await api.CreateSecureClient().PostAsJsonAsync(Redemptions, new { signInToken = token });

        await AssertUnusableAsync(response);
    }

    [Theory]
    [InlineData("eyJ0aGlzIjoibm90LWEtdG9rZW4ifQabcdefghijklm")]
    [InlineData("")]
    [InlineData(null)]
    public async Task A_link_that_was_never_issued_signs_no_one_in(string? token)
    {
        await using var api = new MondinoApi();

        using var response = await api.CreateSecureClient().PostAsJsonAsync(Redemptions, new { signInToken = token });

        await AssertUnusableAsync(response);
    }

    [Fact]
    public async Task A_good_link_for_an_email_on_no_team_names_the_email_and_issues_no_session()
    {
        // Given a sign-in link mailed to Sofia, who has since left Northwind
        await using var api = new MondinoApi();
        using var client = api.CreateSecureClient();
        var made = await api.MakeTeamAsync(client, "Northwind", "sofia@northwind.co");
        var token = await AskForLinkAsync(api, client, "sofia@northwind.co");
        await api.RemoveTeammateAsync(made.TeammateId);

        // When it is opened
        using var response = await api.CreateSecureClient().PostAsJsonAsync(Redemptions, new { signInToken = token });

        // Then it answers the email it was sent to and no team, and issues no session
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var result = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(JsonValueKind.Null, result.RootElement.GetProperty("membership").ValueKind);
        Assert.Equal("sofia@northwind.co", result.RootElement.GetProperty("email").GetString());
        Assert.False(response.Headers.Contains("Set-Cookie"));
    }

    [Fact]
    public async Task An_email_on_two_teams_opens_the_team_made_last()
    {
        // Given Sofia, who made Northwind and, a day later, Harbour Lights, with one email
        await using var api = new MondinoApi();
        using var client = api.CreateSecureClient();
        await api.MakeTeamAsync(client, "Northwind", "sofia@northwind.co");
        api.Time.Advance(TimeSpan.FromDays(1));
        var later = await api.MakeTeamAsync(client, "Harbour Lights", "sofia@northwind.co");
        var token = await AskForLinkAsync(api, client, "sofia@northwind.co");

        // When her sign-in link is opened
        using var response = await api.CreateSecureClient().PostAsJsonAsync(Redemptions, new { signInToken = token });

        // Then she is signed in to Harbour Lights
        using var result = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var membership = result.RootElement.GetProperty("membership");
        Assert.Equal(later.TeamId, membership.GetProperty("teamId").GetGuid());
        Assert.Equal("Harbour Lights", membership.GetProperty("teamName").GetString());
    }

    [Fact]
    public async Task One_link_opened_twice_at_once_starts_one_session()
    {
        // Given a sign-in link of Sofia's
        await using var api = new MondinoApi();
        using var client = api.CreateSecureClient();
        await api.MakeTeamAsync(client, "Northwind", "sofia@northwind.co");
        var token = await AskForLinkAsync(api, client, "sofia@northwind.co");

        // When two browsers open it at the same moment
        var answers = await Task.WhenAll(
            api.CreateSecureClient().PostAsJsonAsync(Redemptions, new { signInToken = token }),
            api.CreateSecureClient().PostAsJsonAsync(Redemptions, new { signInToken = token }));

        // Then one is signed in and the other refused
        Assert.Single(answers, answer => answer.StatusCode == HttpStatusCode.OK);
        Assert.Single(answers, answer => answer.StatusCode == HttpStatusCode.Gone);
        foreach (var answer in answers)
        {
            answer.Dispose();
        }
    }

    [Fact]
    public async Task An_opening_from_another_site_is_refused_and_leaves_the_link_good()
    {
        // Given a sign-in link of Sofia's
        await using var api = new MondinoApi();
        using var client = api.CreateSecureClient();
        await api.MakeTeamAsync(client, "Northwind", "sofia@northwind.co");
        var token = await AskForLinkAsync(api, client, "sofia@northwind.co");

        // When another site's page opens it
        using var request = new HttpRequestMessage(HttpMethod.Post, Redemptions)
        {
            Content = JsonContent.Create(new { signInToken = token }),
        };
        request.Headers.Add("Sec-Fetch-Site", "cross-site");
        using var refused = await api.CreateSecureClient().SendAsync(request);

        // Then it is refused with 403 and no session, and the link still works for Sofia
        Assert.Equal(HttpStatusCode.Forbidden, refused.StatusCode);
        Assert.False(refused.Headers.Contains("Set-Cookie"));
        using var opened = await api.CreateSecureClient().PostAsJsonAsync(Redemptions, new { signInToken = token });
        Assert.Equal(HttpStatusCode.OK, opened.StatusCode);
    }

    private static async Task<string> AskForLinkAsync(MondinoApi api, HttpClient client, string email)
    {
        using var response = await client.PostAsJsonAsync("/api/sign-in-links", new { email });
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        return api.SignInMails.TokenSentTo(email);
    }

    private static async Task AssertUnusableAsync(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.Gone, response.StatusCode);
        Assert.False(response.Headers.Contains("Set-Cookie"));
        using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("sign_in_link_unusable", problem.RootElement.GetProperty("code").GetString());
    }

    private static async Task<Session> SessionOfAsync(HttpResponseMessage response)
    {
        using var body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var membership = body.RootElement.GetProperty("membership");
        var cookies = response.Headers.GetValues("Set-Cookie").Select(cookie => cookie.Split(';')[0]).ToList();
        Assert.Contains(cookies, cookie => cookie.StartsWith(Sessions.SessionCookie + "=", StringComparison.Ordinal));
        return new Session(
            membership.GetProperty("teamId").GetGuid(),
            membership.GetProperty("teammateId").GetGuid(),
            string.Join("; ", cookies));
    }
}
