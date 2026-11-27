// Acceptance Test
// Traces to: L2-051, L2-057
// Description: The backend reports whether it can reach its database, to anyone, and exposes nothing else

using System.Net;
using Mondino.Tests.Support;

namespace Mondino.Tests.Platform;

public sealed class ReadinessTests
{
    [Fact]
    public async Task Readiness_reports_healthy_to_anyone_while_the_database_can_be_reached()
    {
        // Given the backend with its database, and a caller with no session
        await using var api = new MondinoApi();
        using var client = api.CreateClient();

        // When its readiness endpoint is called
        using var response = await client.GetAsync("/health/ready");

        // Then it says it is ready, in one word, and is never cached
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
        Assert.Equal("text/plain", response.Content.Headers.ContentType?.MediaType);
        Assert.True(response.Headers.CacheControl?.NoStore);
    }

    [Fact]
    public async Task Readiness_reports_unhealthy_while_the_database_cannot_be_reached()
    {
        // Given a backend whose database is down
        await using var api = new MondinoApi { DatabaseFails = true };
        using var client = api.CreateClient();

        // When its readiness endpoint is called
        using var response = await client.GetAsync("/health/ready");

        // Then it says it is not ready, in one word, and is never cached
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.Equal("Unhealthy", await response.Content.ReadAsStringAsync());
        Assert.Equal("text/plain", response.Content.Headers.ContentType?.MediaType);
        Assert.True(response.Headers.CacheControl?.NoStore);
    }

    [Fact]
    public async Task Readiness_exposes_nothing_of_the_failure_in_its_answer_or_in_a_log()
    {
        // Given a backend whose database is down, with every log line captured
        await using var api = new MondinoApi { DatabaseFails = true, CapturesLogs = true };
        using var client = api.CreateClient();

        // When its readiness endpoint is called
        using var response = await client.GetAsync("/health/ready");

        // Then the answer carries no header that names the server or its versions,
        // and no log line carries what the database said
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        Assert.False(response.Headers.Contains("Server"));
        Assert.False(response.Headers.Contains("X-Powered-By"));
        Assert.False(response.Headers.Contains("X-AspNet-Version"));
        Assert.DoesNotContain(api.Logs.Lines, line => line.Contains("The database is down.", StringComparison.Ordinal));
    }

    [Fact]
    public async Task Liveness_still_checks_nothing_while_the_database_is_down()
    {
        // Given a backend whose database is down
        await using var api = new MondinoApi { DatabaseFails = true };
        using var client = api.CreateClient();

        // When its liveness endpoint is called
        using var response = await client.GetAsync("/health/live");

        // Then it still reports that the process is running
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
    }
}
