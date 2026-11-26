// Acceptance Test
// Traces to: L2-051
// Description: The backend reports that it is running, and exposes nothing else

using System.Net;
using Mondino.Tests.Support;

namespace Mondino.Tests.Platform;

public sealed class LivenessTests
{
    [Fact]
    public async Task Liveness_reports_that_the_process_is_running()
    {
        // Given the backend
        await using var api = new MondinoApi();
        using var client = api.CreateClient();

        // When its liveness endpoint is called
        using var response = await client.GetAsync("/health/live");

        // Then it says the process is running, and is never cached
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync());
        Assert.True(response.Headers.CacheControl?.NoStore);
    }

    [Fact]
    public async Task Liveness_checks_nothing_else()
    {
        // Given a backend whose database is down
        await using var api = new MondinoApi { DatabaseFails = true };
        using var client = api.CreateClient();

        // When its liveness endpoint is called
        using var response = await client.GetAsync("/health/live");

        // Then it still reports that the process is running
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Liveness_exposes_no_configuration_and_no_versions()
    {
        // Given the backend
        await using var api = new MondinoApi();
        using var client = api.CreateClient();

        // When its liveness endpoint is called
        using var response = await client.GetAsync("/health/live");

        // Then the answer is the one word, with no header that names the server or its versions
        Assert.Equal("text/plain", response.Content.Headers.ContentType?.MediaType);
        Assert.False(response.Headers.Contains("Server"));
        Assert.False(response.Headers.Contains("X-Powered-By"));
        Assert.False(response.Headers.Contains("X-AspNet-Version"));
    }

    [Fact]
    public async Task Starting_the_API_applies_no_migration()
    {
        // Given the backend
        await using var api = new MondinoApi();
        using var client = api.CreateClient();

        // When it starts and answers a request
        using var response = await client.GetAsync("/health/live");

        // Then no migration was asked for: a CLI command applies them
        Assert.Equal(0, api.Migrator.Calls);
    }
}
