// Acceptance Test
// Traces to: L2-052, L2-043, L2-044, L2-045
// Description: Asking for a sign-in link answers 202 with no body whatever the email, mails only a teammate's email, refuses text that is not an email, and mails one email at most 3 times in 15 minutes

using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.SignIn;

public sealed class RequestSignInLinkTests
{
    private const string Path = "/api/sign-in-links";

    [Fact]
    public async Task A_teammates_email_is_answered_202_with_no_body_and_mailed_a_link_to_Sign_In()
    {
        // Given Sofia, who made Northwind with sofia@northwind.co
        await using var api = new MondinoApi();
        using var client = api.CreateSecureClient();
        await api.MakeTeamAsync(client, "Northwind", "sofia@northwind.co");

        // When a sign-in link is asked for her email, typed with spaces and capitals
        using var response = await client.PostAsJsonAsync(Path, new { email = "  Sofia@Northwind.co " });

        // Then the answer is 202 with no body and no session
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        Assert.Equal(string.Empty, await response.Content.ReadAsStringAsync());
        Assert.False(response.Headers.Contains("Set-Cookie"));

        // And one mail goes to her address, with a link to Sign In that carries the token in its fragment
        var mail = Assert.Single(api.SignInMails.Mails);
        Assert.Equal("sofia@northwind.co", mail.Email.Value);
        Assert.Equal(MondinoApi.AppAddress + "/sign-in", mail.Link.GetLeftPart(UriPartial.Path));
        Assert.Equal(string.Empty, mail.Link.Query);
        Assert.Matches("^#[A-Za-z0-9_-]{43}$", mail.Link.Fragment);
    }

    [Fact]
    public async Task An_email_on_no_team_gets_the_same_answer_and_no_mail()
    {
        // Given Northwind, made with sofia@northwind.co
        await using var api = new MondinoApi();
        using var client = api.CreateSecureClient();
        await api.MakeTeamAsync(client, "Northwind", "sofia@northwind.co");
        using var known = await client.PostAsJsonAsync(Path, new { email = "sofia@northwind.co" });

        // When a sign-in link is asked for an email that is on no team
        using var unknown = await client.PostAsJsonAsync(Path, new { email = "stranger@elsewhere.co" });

        // Then the status, the headers and the body are those of a teammate's email
        Assert.Equal(known.StatusCode, unknown.StatusCode);
        Assert.Equal(await known.Content.ReadAsStringAsync(), await unknown.Content.ReadAsStringAsync());
        Assert.Equal(HeadersOf(known), HeadersOf(unknown));

        // And no mail is sent to it
        Assert.DoesNotContain(api.SignInMails.Mails, mail => mail.Email.Value == "stranger@elsewhere.co");
    }

    [Theory]
    [InlineData("sofia@northwind")]
    [InlineData("sofia")]
    [InlineData("@northwind.co")]
    [InlineData("sofia bianchi@northwind.co")]
    [InlineData("")]
    [InlineData(null)]
    public async Task Text_that_is_not_an_email_is_refused_with_400_and_no_mail(string? email)
    {
        // Given the API
        await using var api = new MondinoApi();
        using var client = api.CreateSecureClient();

        // When a sign-in link is asked for text that is not an email address
        using var response = await client.PostAsJsonAsync(Path, new { email });

        // Then it is refused with 400 and the code validation_failed, and no mail is sent
        await AssertRefusedAsync(response, HttpStatusCode.BadRequest, "validation_failed");
        Assert.Empty(api.SignInMails.Mails);
    }

    [Fact]
    public async Task An_email_over_254_characters_is_refused_with_400()
    {
        await using var api = new MondinoApi();
        using var client = api.CreateSecureClient();

        using var response = await client.PostAsJsonAsync(Path, new { email = new string('a', 243) + "@northwind.co" });

        await AssertRefusedAsync(response, HttpStatusCode.BadRequest, "validation_failed");
        Assert.Empty(api.SignInMails.Mails);
    }

    [Fact]
    public async Task Past_3_links_for_one_email_in_15_minutes_no_mail_is_sent_and_the_answer_is_the_same()
    {
        // Given Sofia, for whom 3 sign-in links were asked in the last 15 minutes, from two clients
        await using var api = new MondinoApi();
        using var first = api.CreateSecureClient();
        using var second = api.CreateSecureClient();
        await api.MakeTeamAsync(first, "Northwind", "sofia@northwind.co");
        foreach (var client in new[] { first, second, first })
        {
            using var allowed = await client.PostAsJsonAsync(Path, new { email = "sofia@northwind.co" });
            Assert.Equal(HttpStatusCode.Accepted, allowed.StatusCode);
            api.Time.Advance(TimeSpan.FromMinutes(4));
        }

        Assert.Equal(3, api.SignInMails.Mails.Count);

        // When a fourth is asked, 12 minutes after the first
        using var fourth = await second.PostAsJsonAsync(Path, new { email = "sofia@northwind.co" });

        // Then the answer is the same 202, and no mail is sent
        Assert.Equal(HttpStatusCode.Accepted, fourth.StatusCode);
        Assert.Equal(string.Empty, await fourth.Content.ReadAsStringAsync());
        Assert.Equal(3, api.SignInMails.Mails.Count);

        // And once the first is more than 15 minutes old, a link is mailed again
        api.Time.Advance(TimeSpan.FromMinutes(3) + TimeSpan.FromSeconds(1));
        using var later = await second.PostAsJsonAsync(Path, new { email = "sofia@northwind.co" });
        Assert.Equal(HttpStatusCode.Accepted, later.StatusCode);
        Assert.Equal(4, api.SignInMails.Mails.Count);
    }

    [Fact]
    public async Task Past_5_requests_from_one_client_in_15_minutes_the_next_is_refused_with_429_and_no_mail()
    {
        // Given two teammates' emails, and one client that has asked for 5 links for them
        await using var api = new MondinoApi();
        using var client = api.CreateSecureClient();
        await api.MakeTeamAsync(client, "Northwind", "sofia@northwind.co");
        await api.MakeTeamAsync(client, "Harbour Lights", "liam@southwind.co");
        foreach (var email in new[] { "sofia@northwind.co", "liam@southwind.co", "sofia@northwind.co", "liam@southwind.co", "sofia@northwind.co" })
        {
            using var allowed = await client.PostAsJsonAsync(Path, new { email });
            Assert.Equal(HttpStatusCode.Accepted, allowed.StatusCode);
        }

        Assert.Equal(5, api.SignInMails.Mails.Count);

        // When it asks once more
        using var refused = await client.PostAsJsonAsync(Path, new { email = "liam@southwind.co" });

        // Then it is refused with 429 and a Retry-After header, and no mail is sent
        await AssertRefusedAsync(refused, HttpStatusCode.TooManyRequests, "rate_limited");
        Assert.True(refused.Headers.RetryAfter?.Delta > TimeSpan.FromMinutes(10));
        Assert.Equal(5, api.SignInMails.Mails.Count);
    }

    [Fact]
    public async Task A_request_from_another_site_is_refused_and_no_mail_is_sent()
    {
        // Given Sofia's Northwind
        await using var api = new MondinoApi();
        using var client = api.CreateSecureClient();
        await api.MakeTeamAsync(client, "Northwind", "sofia@northwind.co");

        // When another site's page asks for a sign-in link
        using var request = new HttpRequestMessage(HttpMethod.Post, Path)
        {
            Content = JsonContent.Create(new { email = "sofia@northwind.co" }),
        };
        request.Headers.Add("Sec-Fetch-Site", "cross-site");
        using var response = await client.SendAsync(request);

        // Then it is refused with 403, and no mail is sent
        await AssertRefusedAsync(response, HttpStatusCode.Forbidden, "cross_site_request");
        Assert.Empty(api.SignInMails.Mails);
    }

    private static string HeadersOf(HttpResponseMessage response) =>
        string.Join(
            '\n',
            response.Headers.Concat(response.Content.Headers)
                .Where(header => header.Key is not ("Date" or "Content-Security-Policy"))
                .OrderBy(header => header.Key, StringComparer.Ordinal)
                .Select(header => $"{header.Key}: {string.Join(',', header.Value)}"));

    private static async Task AssertRefusedAsync(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        Assert.Equal(status, response.StatusCode);
        using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal(code, problem.RootElement.GetProperty("code").GetString());
    }
}
