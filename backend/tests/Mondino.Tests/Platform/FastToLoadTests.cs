// Acceptance Test
// Traces to: L2-046
// Description: The app's files are compressed and cached by their content-hashed names, and a team of 500 is read within 300 ms at the 95th percentile, compressed

using System.Diagnostics;
using System.IO.Compression;
using System.Net;
using System.Text.Json;
using Mondino.Domain.Teams;
using Mondino.Tests.Support;

namespace Mondino.Tests.Platform;

public sealed class FastToLoadTests
{
    [Theory]
    [InlineData("/chunk-Ab3_xY-9.js")]
    [InlineData("/media/globe-low-X5QDMBZT.glb")]
    public async Task A_file_named_by_its_hash_is_cached_for_a_year_and_compressed(string path)
    {
        // Given the API serving the app, and a browser that takes Brotli
        await using var api = new MondinoApi { ServesApp = true };
        using var client = api.CreateSecureClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.Add("Accept-Encoding", "br, gzip");

        // When it asks for a file whose name ends in its content's hash
        using var response = await client.SendAsync(request);

        // Then the browser may keep it for a year without asking again, and it comes compressed
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("public, max-age=31536000, immutable", response.Headers.CacheControl?.ToString());
        Assert.Equal(["br"], response.Content.Headers.ContentEncoding);
    }

    [Theory]
    [InlineData("/favicon.svg")]
    [InlineData("/")]
    [InlineData("/globe")]
    public async Task Anything_else_is_asked_for_again_each_time(string path)
    {
        // Given the API serving the app
        await using var api = new MondinoApi { ServesApp = true };
        using var client = api.CreateSecureClient();
        using var request = new HttpRequestMessage(HttpMethod.Get, path);
        request.Headers.Add("Accept-Encoding", "gzip");

        // When a browser asks for a file with no hash in its name, or the page itself
        using var response = await client.SendAsync(request);

        // Then it must ask the API again before using a copy, and the text comes compressed
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("no-cache", response.Headers.CacheControl?.ToString());
        Assert.Equal(["gzip"], response.Content.Headers.ContentEncoding);
    }
}

/// <summary>
/// Timed alone: tests running beside it would hold the thread pool and the processor and time
/// them instead of the read.
/// </summary>
[CollectionDefinition(nameof(TimedAlone), DisableParallelization = true)]
public sealed class TimedAlone;

[Collection(nameof(TimedAlone))]
public sealed class TeamOf500ReadTests
{
    [Fact]
    public async Task A_team_of_500_is_read_within_300_ms_at_the_95th_percentile_and_compressed()
    {
        // Given Northwind with 500 teammates, and the weather of every city in the cache's place
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.Weather.ReportsEverywhere(14, WeatherCondition.Cloudy);
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        await api.FillTeamAsync("northwind-7Kq2", Team.MaxTeammates);
        using (var first = await ReadAsync(client, sofia))
        {
            first.EnsureSuccessStatusCode();
        }

        // When Sofia's browser reads the team 40 times
        var times = new List<TimeSpan>();
        HttpResponseMessage? last = null;
        for (var read = 0; read < 40; read++)
        {
            last?.Dispose();
            var watch = Stopwatch.StartNew();
            last = await ReadAsync(client, sofia);
            await last.Content.LoadIntoBufferAsync();
            times.Add(watch.Elapsed);
        }

        // Then 95 reads in 100 answer within 300 ms
        using var answer = last!;
        var p95 = times.Order().ElementAt((int)Math.Ceiling(times.Count * 0.95) - 1);
        Assert.True(p95 < TimeSpan.FromMilliseconds(300), $"The 95th percentile was {p95.TotalMilliseconds} ms");

        // And the answer is compressed, and holds all 500 pins
        Assert.Equal(["br"], answer.Content.Headers.ContentEncoding);
        await using var body = new BrotliStream(await answer.Content.ReadAsStreamAsync(), CompressionMode.Decompress);
        using var pins = await JsonDocument.ParseAsync(body);
        Assert.Equal(Team.MaxTeammates, pins.RootElement.GetProperty("pins").GetArrayLength());
    }

    private static Task<HttpResponseMessage> ReadAsync(HttpClient client, Session session)
    {
        using var request = session.Request(HttpMethod.Get, $"/api/teams/{session.TeamId}/pins");
        request.Headers.Add("Accept-Encoding", "br, gzip");
        return client.SendAsync(request);
    }
}
