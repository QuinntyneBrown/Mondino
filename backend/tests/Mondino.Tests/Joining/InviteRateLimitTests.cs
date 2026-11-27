// Acceptance Test
// Traces to: L2-045, L2-001
// Description: One client opens at most 30 invite links a minute; the next is refused with 429 and Retry-After

using System.Net;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Joining;

public sealed class InviteRateLimitTests
{
    [Fact]
    public async Task The_31st_open_in_a_minute_is_refused_with_rate_limited_and_Retry_After()
    {
        // Given Northwind, and one client that has opened invite links 30 times in a minute,
        // some of them guesses
        await using var api = new MondinoApi();
        await api.SeedAsync();
        using var client = api.CreateClient();
        for (var open = 1; open <= 30; open++)
        {
            using var allowed = await client.GetAsync(open % 2 == 0 ? "/api/invites/northwind-7Kq2" : $"/api/invites/guess-{open}");
            Assert.NotEqual(HttpStatusCode.TooManyRequests, allowed.StatusCode);
        }

        // When it opens one more, even a link that works
        using var response = await client.GetAsync("/api/invites/northwind-7Kq2");
        var body = await response.Content.ReadAsStringAsync();

        // Then it is refused with 429, a Retry-After header and the code "rate_limited", and names no team
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);
        Assert.NotNull(response.Headers.RetryAfter?.Delta);
        Assert.True(response.Headers.RetryAfter!.Delta > TimeSpan.Zero);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var problem = JsonDocument.Parse(body);
        Assert.Equal("rate_limited", problem.RootElement.GetProperty("code").GetString());
        Assert.DoesNotContain("Northwind", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Liveness_is_not_held_to_the_invite_limit()
    {
        // Given one client that has used up its invite opens for the minute
        await using var api = new MondinoApi();
        using var client = api.CreateClient();
        for (var open = 1; open <= 31; open++)
        {
            using var _ = await client.GetAsync($"/api/invites/guess-{open}");
        }

        // When it asks whether the backend is running
        using var response = await client.GetAsync("/health/live");

        // Then the answer is not refused
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
