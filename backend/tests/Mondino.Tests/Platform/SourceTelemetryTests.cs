// Acceptance Test
// Traces to: L2-051, L2-049
// Description: Each outside source has a count of calls, failures and time-outs and a latency histogram, labelled by source and outcome only

using System.Net;
using System.Net.Http.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Platform;

[Collection(nameof(TelemetryAlone))]
public sealed class SourceTelemetryTests
{
    private const string Calls = "mondino.source.calls";
    private const string Duration = "mondino.source.duration";
    private const string Lookups = "/api/invites/northwind-7Kq2/postal-code-lookups";

    [Fact]
    public async Task The_postal_code_source_counts_its_calls_failures_time_outs_and_calls_left_alone()
    {
        // Given the API exporting to memory, with the real postal code source, whose breaker opens after 2 failures
        await using var api = new MondinoApi { CapturesTelemetry = true, UsesPostalCodeSource = true };
        api.Settings["OutsideSources:FailuresToOpen"] = "2";
        await api.SeedAsync();
        api.PostalCodeSource.Knows("IT", "20121", "Milano", "Lombardia", 45.46427, 9.18951);
        using var client = api.CreateClient();

        // When one lookup is answered, one fails, one is not answered in 5 seconds, and the next is not made
        await LookUpAsync(client, "20121", HttpStatusCode.OK);
        api.PostalCodeSource.Behaviour = SourceBehaviour.Fails;
        await LookUpAsync(client, "20122", HttpStatusCode.ServiceUnavailable);
        api.PostalCodeSource.Behaviour = SourceBehaviour.Hangs;
        var pending = LookUpAsync(client, "20123", HttpStatusCode.ServiceUnavailable);
        await api.PostalCodeSource.WaitForCallAsync();
        api.Time.Advance(TimeSpan.FromSeconds(5));
        await pending.WaitAsync(TimeSpan.FromSeconds(10));
        await LookUpAsync(client, "20124", HttpStatusCode.ServiceUnavailable);

        // Then each is counted by its outcome, and each call made is timed
        var points = api.CollectMetrics();
        AssertLabelledBySourceAndOutcomeOnly(points);
        Assert.Equal(1, Count(points, Calls, "postal_code", "success"));
        Assert.Equal(1, Count(points, Calls, "postal_code", "failure"));
        Assert.Equal(1, Count(points, Calls, "postal_code", "timeout"));
        Assert.Equal(1, Count(points, Calls, "postal_code", "circuit_open"));
        Assert.Equal(1, Count(points, Duration, "postal_code", "success"));
        Assert.Equal(1, Count(points, Duration, "postal_code", "failure"));
        Assert.Equal(1, Count(points, Duration, "postal_code", "timeout"));
        Assert.Equal(0, Count(points, Duration, "postal_code", "circuit_open"));

        // And each call made is a span, labelled the same way
        var span = await api.Telemetry.WaitForSpanAsync(s => s.Attributes.GetValueOrDefault("mondino.source.outcome") == "timeout", "a timed-out call");
        Assert.Equal("source postal_code", span.Name);
        Assert.Equal("postal_code", span.Attributes["mondino.source"]);
    }

    [Fact]
    public async Task The_weather_source_counts_its_calls_failures_and_time_outs()
    {
        // Given the API exporting to memory, with the real weather source, and Sofia on Northwind
        await using var api = new MondinoApi { CapturesTelemetry = true, UsesWeatherSource = true };
        api.Settings["OutsideSources:FailuresToOpen"] = "1000";
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When the pins are read with the source answering, then failing, then not answering for 5 seconds
        await PinsAsync(client, sofia);
        var answered = api.OpenMeteo.Requests.Count;
        api.Time.Advance(TimeSpan.FromMinutes(16));
        api.OpenMeteo.Behaviour = SourceBehaviour.Fails;
        await PinsAsync(client, sofia);
        var failed = api.OpenMeteo.Requests.Count - answered;
        api.OpenMeteo.Behaviour = SourceBehaviour.Hangs;
        var reading = PinsAsync(client, sofia);
        await api.OpenMeteo.WaitForRequestsAsync(answered + failed + failed);
        api.Time.Advance(TimeSpan.FromSeconds(5));
        await reading;

        // Then every call is counted and timed by its outcome
        var points = api.CollectMetrics();
        AssertLabelledBySourceAndOutcomeOnly(points);
        Assert.True(failed > 1);
        Assert.Equal(answered, Count(points, Calls, "weather", "success"));
        Assert.Equal(failed, Count(points, Calls, "weather", "failure"));
        Assert.Equal(failed, Count(points, Calls, "weather", "timeout"));
        Assert.Equal(answered, Count(points, Duration, "weather", "success"));
        Assert.Equal(failed, Count(points, Duration, "weather", "failure"));
        Assert.Equal(failed, Count(points, Duration, "weather", "timeout"));
    }

    [Fact]
    public async Task The_holiday_calendar_counts_its_calls_failures_and_time_outs()
    {
        // Given the API exporting to memory, with the real calendars, and Sofia on Northwind
        await using var api = new MondinoApi { CapturesTelemetry = true, UsesCalendars = true };
        api.Settings["OutsideSources:FailuresToOpen"] = "1000";
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When the moments are read with the source answering, then failing, then not answering for 5 seconds.
        // A call for a country's year asks for its holidays and then its subdivisions, two requests; one
        // that is not answered stops at the first.
        await MomentsAsync(client, sofia);
        var years = api.OpenHolidays.Requests.Count / 2;
        api.Time.Advance(TimeSpan.FromHours(25));
        api.OpenHolidays.Behaviour = SourceBehaviour.Fails;
        await MomentsAsync(client, sofia);
        var failed = (api.OpenHolidays.Requests.Count / 2) - years;
        api.OpenHolidays.Behaviour = SourceBehaviour.Hangs;
        var reading = MomentsAsync(client, sofia);
        await api.OpenHolidays.WaitForRequestsAsync((2 * (years + failed)) + years);
        api.Time.Advance(TimeSpan.FromSeconds(5));
        await reading;

        // Then every call is counted and timed by its outcome; Mondino's own calendar makes none
        var points = api.CollectMetrics();
        AssertLabelledBySourceAndOutcomeOnly(points);
        Assert.True(years > 1);
        Assert.True(failed >= years);
        Assert.Equal(years, Count(points, Calls, "holiday_calendar", "success"));
        Assert.Equal(failed, Count(points, Calls, "holiday_calendar", "failure"));
        Assert.Equal(years, Count(points, Calls, "holiday_calendar", "timeout"));
        Assert.Equal(years, Count(points, Duration, "holiday_calendar", "success"));
        Assert.Equal(failed, Count(points, Duration, "holiday_calendar", "failure"));
        Assert.Equal(years, Count(points, Duration, "holiday_calendar", "timeout"));
        Assert.DoesNotContain(points, point => point.Tags.GetValueOrDefault("source") is "race_calendar" or "event_calendar");
    }

    [Fact]
    public async Task The_email_source_counts_its_calls_failures_and_time_outs()
    {
        // Given the API exporting to memory, with the real Email source, and Sofia's Northwind
        await using var api = new MondinoApi { CapturesTelemetry = true, UsesEmailSource = true };
        using var client = api.CreateSecureClient();
        await api.MakeTeamAsync(client, "Northwind", "sofia@northwind.co");

        // When a sign-in link is mailed, then the source fails, then it does not answer for 5 seconds
        await AskForLinkAsync(client);
        await api.EmailSource.NextAsync();
        await WaitForEmailAsync(api, "success");
        api.EmailSource.Behaviour = SourceBehaviour.Fails;
        await AskForLinkAsync(client);
        await WaitForEmailAsync(api, "failure");
        api.EmailSource.Behaviour = SourceBehaviour.Hangs;
        await AskForLinkAsync(client);
        await api.EmailSource.NextAsync();
        api.Time.Advance(TimeSpan.FromSeconds(5));
        await WaitForEmailAsync(api, "timeout");

        // Then each is counted and timed by its outcome
        var points = api.CollectMetrics();
        AssertLabelledBySourceAndOutcomeOnly(points);
        Assert.Equal(1, Count(points, Calls, "email", "success"));
        Assert.Equal(1, Count(points, Calls, "email", "failure"));
        Assert.Equal(1, Count(points, Calls, "email", "timeout"));
        Assert.Equal(1, Count(points, Duration, "email", "timeout"));
    }

    private static void AssertLabelledBySourceAndOutcomeOnly(IReadOnlyList<CapturedPoint> points)
    {
        var sources = points.Where(point => point.Metric is Calls or Duration).ToList();
        Assert.NotEmpty(sources);
        Assert.All(sources, point => Assert.Equal(["outcome", "source"], point.Tags.Keys.Order(StringComparer.Ordinal)));
    }

    private static long Count(IReadOnlyList<CapturedPoint> points, string metric, string source, string outcome) =>
        points.Where(point => point.Metric == metric
                && point.Tags.GetValueOrDefault("source") == source
                && point.Tags.GetValueOrDefault("outcome") == outcome)
            .Sum(point => point.Count);

    private static async Task LookUpAsync(HttpClient client, string postalCode, HttpStatusCode expected)
    {
        using var response = await client.PostAsJsonAsync(Lookups, new { countryCode = "IT", postalCode });
        Assert.Equal(expected, response.StatusCode);
    }

    private static async Task PinsAsync(HttpClient client, Session session)
    {
        using var request = session.Request(HttpMethod.Get, $"/api/teams/{session.TeamId}/pins");
        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static async Task MomentsAsync(HttpClient client, Session session)
    {
        using var request = session.Request(HttpMethod.Get, $"/api/teams/{session.TeamId}/moments");
        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static async Task AskForLinkAsync(HttpClient client)
    {
        using var response = await client.PostAsJsonAsync("/api/sign-in-links", new { email = "sofia@northwind.co" });
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

    private static Task<CapturedSpan> WaitForEmailAsync(MondinoApi api, string outcome) =>
        api.Telemetry.WaitForSpanAsync(
            span => span.Attributes.GetValueOrDefault("mondino.source") == "email" && span.Attributes.GetValueOrDefault("mondino.source.outcome") == outcome,
            $"a call to the Email source with the outcome {outcome}");
}
