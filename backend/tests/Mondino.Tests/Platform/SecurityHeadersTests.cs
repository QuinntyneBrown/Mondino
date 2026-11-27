// Acceptance Test
// Traces to: L2-044
// Description: Every answer carries a CSP of the app's own origin, nosniff, no-referrer and HSTS; the app is served under a nonce made for each answer

using System.Net;
using System.Text.RegularExpressions;
using Mondino.Tests.Support;

namespace Mondino.Tests.Platform;

public sealed partial class SecurityHeadersTests
{
    [Theory]
    [InlineData("GET", "/health/live")]
    [InlineData("GET", "/api/invites/northwind-7Kq2")]
    [InlineData("GET", "/api/invites/no-such-invite")]
    [InlineData("GET", "/api/teams/6c1f4f0a-6a1c-4c55-9a43-8f0f3f7e2a10/pins")]
    [InlineData("GET", "/api/nowhere")]
    [InlineData("POST", "/api/teams")]
    [InlineData("GET", "/api/test-only/unhandled")]
    [InlineData("GET", "/")]
    [InlineData("GET", "/globe")]
    [InlineData("GET", "/main-TEST.js")]
    public async Task Every_answer_carries_the_security_headers(string method, string path)
    {
        // Given the API serving the app
        await using var api = new MondinoApi { ServesApp = true };
        await api.SeedAsync();
        using var client = api.CreateSecureClient();

        // When anything is asked of it, answered or refused
        using var request = new HttpRequestMessage(new HttpMethod(method), path);
        if (method == "POST")
        {
            request.Content = new StringContent("{}", System.Text.Encoding.UTF8, "application/json");
        }

        using var response = await client.SendAsync(request);

        // Then its answer allows scripts, styles, fonts, images and connections from its own origin only
        var policy = Header(response, "Content-Security-Policy");
        var directives = policy.Split(';', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries)
            .ToDictionary(d => d.Split(' ')[0], d => d.Split(' ').Skip(1).ToArray());
        Assert.Equal(["'self'"], directives["default-src"]);
        Assert.Equal(["'self'"], directives["font-src"]);
        Assert.Equal(["'self'"], directives["img-src"]);
        Assert.Equal(["'self'"], directives["connect-src"]);
        Assert.Equal(["'none'"], directives["object-src"]);
        Assert.Equal(["'none'"], directives["frame-ancestors"]);
        foreach (var kind in new[] { "script-src", "style-src" })
        {
            Assert.Equal("'self'", directives[kind][0]);
            Assert.Matches("^'nonce-[A-Za-z0-9+/]{22}==?'$", Assert.Single(directives[kind].Skip(1)));
        }

        Assert.DoesNotContain("unsafe", policy, StringComparison.Ordinal);
        Assert.DoesNotContain("*", policy, StringComparison.Ordinal);
        Assert.DoesNotContain("http", policy, StringComparison.Ordinal);

        // And it is never sniffed, never sends its address on, and is only ever reached over HTTPS
        Assert.Equal("nosniff", Header(response, "X-Content-Type-Options"));
        Assert.Equal("no-referrer", Header(response, "Referrer-Policy"));
        Assert.StartsWith("max-age=31536000", Header(response, "Strict-Transport-Security"), StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("/")]
    [InlineData("/index.html")]
    [InlineData("/globe")]
    [InlineData("/join/northwind-7Kq2")]
    public async Task The_app_is_open_to_anyone_and_served_with_the_nonce_of_its_own_answer(string path)
    {
        // Given the API serving the app, and a browser with no session
        await using var api = new MondinoApi { ServesApp = true };
        using var client = api.CreateSecureClient();

        // When the app is opened twice at an address of a screen
        using var first = await client.GetAsync(path);
        using var second = await client.GetAsync(path);
        var html = await first.Content.ReadAsStringAsync();

        // Then it is served, never cached, with every placeholder replaced by the nonce its CSP allows
        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal("text/html", first.Content.Headers.ContentType?.MediaType);
        Assert.True(first.Headers.CacheControl?.NoCache);
        var nonce = NonceIn(Header(first, "Content-Security-Policy"));
        Assert.DoesNotContain("MONDINO_CSP_NONCE", html, StringComparison.Ordinal);
        Assert.Equal(4, Regex.Count(html, Regex.Escape(nonce)));
        Assert.Contains($"ngCspNonce=\"{nonce}\"", html, StringComparison.Ordinal);

        // And each answer has a nonce of its own
        Assert.NotEqual(nonce, NonceIn(Header(second, "Content-Security-Policy")));
        Assert.Contains(NonceIn(Header(second, "Content-Security-Policy")), await second.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task The_apps_files_are_open_to_anyone()
    {
        await using var api = new MondinoApi { ServesApp = true };
        using var client = api.CreateSecureClient();

        using var response = await client.GetAsync("/main-TEST.js");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("the app", await response.Content.ReadAsStringAsync(), StringComparison.Ordinal);
    }

    private static string Header(HttpResponseMessage response, string name) =>
        response.Headers.TryGetValues(name, out var values) || response.Content.Headers.TryGetValues(name, out values)
            ? string.Join(", ", values)
            : throw new Xunit.Sdk.XunitException($"{name} is missing from {(int)response.StatusCode} {response.RequestMessage?.RequestUri}");

    private static string NonceIn(string policy) => NoncePattern().Match(policy).Groups[1].Value;

    [GeneratedRegex("script-src 'self' 'nonce-([^']+)'")]
    private static partial Regex NoncePattern();
}
