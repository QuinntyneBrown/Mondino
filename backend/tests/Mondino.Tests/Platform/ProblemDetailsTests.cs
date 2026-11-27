// Acceptance Test
// Traces to: L2-044, L2-051
// Description: An error is ProblemDetails with a code a client branches on, and carries no request data

using System.Net;
using System.Text.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.Platform;

public sealed class ProblemDetailsTests
{
    [Fact]
    public async Task An_address_the_API_does_not_have_is_refused_with_a_code()
    {
        // Given the backend
        await using var api = new MondinoApi();
        using var client = api.CreateClient();

        // When an address it does not have is asked for
        using var response = await client.GetAsync("/api/nowhere");

        // Then the answer is ProblemDetails with the code "not_found"
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var problem = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("not_found", problem.RootElement.GetProperty("code").GetString());
        Assert.Equal(404, problem.RootElement.GetProperty("status").GetInt32());
    }

    [Fact]
    public async Task An_unhandled_error_is_ProblemDetails_with_a_correlation_id_and_no_request_data()
    {
        // Given an endpoint that fails with an error that carries a name and a postal code
        await using var api = new MondinoApi();
        using var client = api.CreateClient();

        // When it is called
        using var response = await client.GetAsync("/api/test-only/unhandled");
        var body = await response.Content.ReadAsStringAsync();

        // Then the answer is ProblemDetails with the code "unexpected" and a correlation id
        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        using var problem = JsonDocument.Parse(body);
        Assert.Equal("unexpected", problem.RootElement.GetProperty("code").GetString());
        Assert.False(string.IsNullOrWhiteSpace(problem.RootElement.GetProperty("traceId").GetString()));

        // And it carries neither the error's text nor a stack trace
        Assert.DoesNotContain(TestOnlyController.Secret, body, StringComparison.Ordinal);
        Assert.DoesNotContain("InvalidOperationException", body, StringComparison.Ordinal);
        Assert.DoesNotContain(" at ", body, StringComparison.Ordinal);
    }
}
