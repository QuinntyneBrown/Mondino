// Acceptance Test
// Traces to: L2-043, L2-045
// Description: No endpoint is open by omission: every endpoint the API maps refuses a request with no session but those marked open, and each open one but making a team (docs/adr/0016) is rate limited

using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.Extensions.DependencyInjection;
using Mondino.Tests.Support;

namespace Mondino.Tests.Platform;

public sealed partial class OpenEndpointsTests
{
    /// <summary>What is open to anyone (L2-043, L2-045), and the test's own failing endpoint.</summary>
    private static readonly HashSet<string> Open =
    [
        "GET api/invites/{inviteToken}",
        "POST api/invites/{inviteToken}/postal-code-lookups",
        "POST api/invites/{inviteToken}/city-searches",
        "POST api/invites/{inviteToken}/teammates",
        "POST api/postal-code-lookups",
        "POST api/city-searches",
        "POST api/teams",
        "POST api/sign-in-links",
        "POST api/sign-in-links/redemptions",
        "ANY /health/live",
        "ANY /health/ready",
        "ANY /api/{**rest}",
        "ANY {*path:nonfile}",
        "GET api/test-only/unhandled",
    ];

    [Fact]
    public async Task Every_endpoint_not_marked_open_refuses_a_request_with_no_session_and_every_open_one_answers_it()
    {
        // Given the API, and a browser with no session
        await using var api = new MondinoApi();
        using var client = api.CreateSecureClient();
        var endpoints = api.Services.GetRequiredService<EndpointDataSource>().Endpoints.OfType<RouteEndpoint>()
            .SelectMany(endpoint => (endpoint.Metadata.GetMetadata<HttpMethodMetadata>()?.HttpMethods ?? ["ANY"])
                .Select(method => (Method: method, Pattern: endpoint.RoutePattern.RawText!)))
            .ToList();
        Assert.Contains(endpoints, e => e.Pattern.EndsWith("/pins", StringComparison.Ordinal));

        // When each is called
        var openByOmission = new List<string>();
        var closedThoughOpen = new List<string>();
        foreach (var (method, pattern) in endpoints)
        {
            using var request = new HttpRequestMessage(new HttpMethod(method == "ANY" ? "GET" : method), "/" + Path(pattern).TrimStart('/'));
            if (method is "POST" or "PUT" or "PATCH")
            {
                request.Content = new StringContent("{}", Encoding.UTF8, "application/json");
            }

            using var response = await client.SendAsync(request);
            var isOpen = Open.Contains($"{method} {pattern}");
            if (!isOpen && response.StatusCode != HttpStatusCode.Unauthorized)
            {
                openByOmission.Add($"{method} {pattern}: {(int)response.StatusCode}");
            }
            else if (isOpen && response.StatusCode == HttpStatusCode.Unauthorized)
            {
                closedThoughOpen.Add($"{method} {pattern}");
            }
        }

        // Then each one not marked open is refused with 401, and each one marked open answers
        Assert.Empty(openByOmission);
        Assert.Empty(closedThoughOpen);
    }

    [Theory]
    [InlineData("GET", "/api/invites/northwind-7Kq2", 30)]
    [InlineData("POST", "/api/invites/northwind-7Kq2/postal-code-lookups", 10)]
    [InlineData("POST", "/api/postal-code-lookups", 10)]
    [InlineData("POST", "/api/invites/northwind-7Kq2/city-searches", 30)]
    [InlineData("POST", "/api/city-searches", 30)]
    [InlineData("POST", "/api/invites/northwind-7Kq2/teammates", 5)]
    [InlineData("POST", "/api/sign-in-links", 5)]
    [InlineData("POST", "/api/sign-in-links/redemptions", 10)]
    public async Task Each_open_endpoint_refuses_one_client_past_its_limit_with_429_and_Retry_After(string method, string path, int limit)
    {
        // Given one client that has used an open endpoint as often as its limit allows
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        for (var i = 0; i < limit; i++)
        {
            using var allowed = await client.SendAsync(Request(method, path));
            Assert.NotEqual(HttpStatusCode.TooManyRequests, allowed.StatusCode);
        }

        // When it uses it once more
        using var refused = await client.SendAsync(Request(method, path));

        // Then it is refused with 429 and a Retry-After header
        Assert.Equal(HttpStatusCode.TooManyRequests, refused.StatusCode);
        Assert.True(refused.Headers.RetryAfter?.Delta > TimeSpan.Zero);
    }

    [Fact]
    public async Task The_open_requests_that_do_not_join_or_make_a_team_issue_no_session()
    {
        // Given Northwind, and a source that knows 20121 in Italy
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.PostalCodes.Knows("IT", "20121", KnownCities.Milan);
        using var client = api.CreateSecureClient();
        var lookup = new { countryCode = "IT", postalCode = "20121" };
        var search = new { countryCode = "IT", text = "Mil" };

        // When an invite link is opened, a postal code looked up and a city searched for, with and without it
        var answers = new List<HttpResponseMessage>
        {
            await client.GetAsync("/api/invites/northwind-7Kq2"),
            await client.PostAsJsonAsync("/api/invites/northwind-7Kq2/postal-code-lookups", lookup),
            await client.PostAsJsonAsync("/api/postal-code-lookups", lookup),
            await client.PostAsJsonAsync("/api/invites/northwind-7Kq2/city-searches", search),
            await client.PostAsJsonAsync("/api/city-searches", search),
        };

        // Then each is answered, and none issues a session or a token
        foreach (var answer in answers)
        {
            using (answer)
            {
                Assert.Equal(HttpStatusCode.OK, answer.StatusCode);
                Assert.False(answer.Headers.Contains("Set-Cookie"), answer.RequestMessage?.RequestUri?.ToString());
            }
        }
    }

    private static HttpRequestMessage Request(string method, string path) => new(new HttpMethod(method), path)
    {
        Content = method == "POST" ? new StringContent("{}", Encoding.UTF8, "application/json") : null,
    };

    /// <summary>An address the pattern matches: a random id for a guid, "x" for anything else.</summary>
    private static string Path(string pattern) =>
        Parameter().Replace(pattern, match => match.Value.Contains(":guid", StringComparison.Ordinal) ? Guid.NewGuid().ToString() : "x");

    [GeneratedRegex(@"\{[^}]+\}")]
    private static partial Regex Parameter();
}
