// Acceptance Test
// Traces to: L2-051, L2-044
// Description: An unhandled error is logged with its type and a correlation id that is also in the ProblemDetails returned, and with no request data

using System.Net;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Platform;

[Collection(nameof(TelemetryAlone))]
public sealed class UnhandledErrorTelemetryTests
{
    [Fact]
    public async Task An_unhandled_error_is_logged_with_its_type_and_the_correlation_id_of_its_ProblemDetails_and_nothing_of_the_request()
    {
        // Given the API exporting to memory, logging at every level, and an endpoint that fails with
        // an error whose message carries a name and a postal code
        await using var api = new MondinoApi { CapturesTelemetry = true };
        using var client = api.CreateClient();

        // When it is called with a query string
        using var response = await client.GetAsync("/api/test-only/unhandled?name=Sofia+Bianchi&postalCode=20121");

        // Then the answer is ProblemDetails with the code "unexpected" and a correlation id, the request's trace id
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("unexpected", problem.RootElement.GetProperty("code").GetString());
        var correlationId = problem.RootElement.GetProperty("correlationId").GetString();
        Assert.Matches("^[0-9a-f]{32}$", correlationId);
        Assert.False(problem.RootElement.TryGetProperty("traceId", out _));

        // And one error was logged, with the error's type and the same correlation id, in the same trace
        await api.Telemetry.WaitForSpanAsync(span => span.TraceId == correlationId, "the failed request's");
        var error = Assert.Single(api.Telemetry.Logs, log => log.Attributes.ContainsKey("correlationId"));
        Assert.Equal("System.InvalidOperationException", error.Attributes["errorType"]);
        Assert.Equal(correlationId, error.Attributes["correlationId"]);
        Assert.Equal(correlationId, error.TraceId);
        Assert.Equal("Mondino.Api.Errors.UnhandledExceptionHandler", error.Category);

        // And no log carries the error's message, the path, the query string or a stack trace
        Assert.DoesNotContain(api.Telemetry.Logs, log => log.Text.Contains(TestOnlyController.Secret, StringComparison.Ordinal));
        Assert.DoesNotContain(api.Telemetry.Logs, log => log.Text.Contains("Sofia", StringComparison.Ordinal));
        Assert.DoesNotContain(api.Telemetry.Logs, log => log.Text.Contains("20121", StringComparison.Ordinal));
        Assert.DoesNotContain(api.Telemetry.Logs, log => log.Text.Contains("/api/test-only", StringComparison.Ordinal));
        Assert.DoesNotContain(api.Telemetry.Logs, log => log.Text.Contains(" at Mondino", StringComparison.Ordinal));
    }
}
