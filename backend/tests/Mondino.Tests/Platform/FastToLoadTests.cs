// Acceptance Test
// Traces to: L2-046
// Description: The app's files are compressed and cached by their content-hashed names, and a team of 500 is read in one small compressed answer that asks the weather once per city (its 300 ms read time is in the performance sweep)

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

public sealed class TeamOf500ReadTests
{
    /// <summary>The most a team of 500's pins may weigh compressed, as the reference phone's 4G carries it in a fraction of a second.</summary>
    private const int MaxCompressedBytes = 24 * 1024;

    [Fact]
    public async Task A_team_of_500_is_read_in_one_compressed_answer_that_asks_the_weather_once_per_city()
    {
        // Given Northwind with 500 teammates, and the weather of every city in the cache's place
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.Weather.ReportsEverywhere(14, WeatherCondition.Cloudy);
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        await api.FillTeamAsync("northwind-7Kq2", Team.MaxTeammates);
        var askedBefore = api.Weather.Asked.Count;

        // When Sofia's browser reads the team
        using var answer = await TeamOf500.ReadAsync(client, sofia);
        var compressed = await answer.Content.ReadAsByteArrayAsync();

        // Then the answer is compressed, small, and holds all 500 pins
        Assert.Equal(HttpStatusCode.OK, answer.StatusCode);
        Assert.Equal(["br"], answer.Content.Headers.ContentEncoding);
        Assert.True(compressed.Length <= MaxCompressedBytes, $"The answer was {compressed.Length} bytes compressed");
        await using var body = new BrotliStream(new MemoryStream(compressed), CompressionMode.Decompress);
        using var pins = await JsonDocument.ParseAsync(body);
        var cities = pins.RootElement.GetProperty("pins").EnumerateArray()
            .Select(pin => pin.GetProperty("cityName").GetString())
            .Distinct()
            .Count();
        Assert.Equal(Team.MaxTeammates, pins.RootElement.GetProperty("pins").GetArrayLength());

        // And the weather is asked once for each city, not once for each of the 500 pins
        var asked = api.Weather.Asked.Skip(askedBefore).ToList();
        Assert.Equal(asked.Count, asked.Distinct().Count());
        Assert.True(asked.Count <= cities, $"The weather was asked {asked.Count} times for {cities} cities");
    }
}

/// <summary>
/// Timed alone: tests running beside it would hold the thread pool and the processor and time
/// them instead of the read. It is in the performance sweep, run only when a person asks
/// (`dotnet test --filter Category=Performance`), never by verify.mjs or CI: a wall clock on a
/// shared machine is not a deterministic check, and EF Core InMemory is not the production
/// database it would have to prove (docs/adr/0030).
/// </summary>
[CollectionDefinition(nameof(TimedAlone), DisableParallelization = true)]
public sealed class TimedAlone;

[Collection(nameof(TimedAlone))]
[Trait("Category", "Performance")]
public sealed class TeamOf500ReadTimeTests
{
    [Fact]
    public async Task A_team_of_500_is_read_within_300_ms_at_the_95th_percentile()
    {
        // Given Northwind with 500 teammates, and the weather of every city in the cache's place
        await using var api = new MondinoApi();
        await api.SeedAsync();
        api.Weather.ReportsEverywhere(14, WeatherCondition.Cloudy);
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);
        await api.FillTeamAsync("northwind-7Kq2", Team.MaxTeammates);
        using (var first = await TeamOf500.ReadAsync(client, sofia))
        {
            first.EnsureSuccessStatusCode();
        }

        // When Sofia's browser reads the team 40 times
        var times = new List<TimeSpan>();
        for (var read = 0; read < 40; read++)
        {
            var watch = Stopwatch.StartNew();
            using var answer = await TeamOf500.ReadAsync(client, sofia);
            await answer.Content.LoadIntoBufferAsync();
            times.Add(watch.Elapsed);
        }

        // Then 95 reads in 100 answer within 300 ms
        var p95 = times.Order().ElementAt((int)Math.Ceiling(times.Count * 0.95) - 1);
        Assert.True(p95 < TimeSpan.FromMilliseconds(300), $"The 95th percentile was {p95.TotalMilliseconds} ms");
    }
}

internal static class TeamOf500
{
    public static Task<HttpResponseMessage> ReadAsync(HttpClient client, Session session)
    {
        using var request = session.Request(HttpMethod.Get, $"/api/teams/{session.TeamId}/pins");
        request.Headers.Add("Accept-Encoding", "br, gzip");
        return client.SendAsync(request);
    }
}
