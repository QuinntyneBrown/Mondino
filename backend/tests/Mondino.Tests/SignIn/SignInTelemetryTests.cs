// Acceptance Test
// Traces to: L2-052, L2-051
// Description: Asking for a sign-in link, mailing it and opening it write neither the email nor the token to any log, at any level

using System.Net;
using System.Net.Http.Json;
using Mondino.Tests.Support;

namespace Mondino.Tests.SignIn;

public sealed class SignInTelemetryTests
{
    [Fact]
    public async Task No_log_line_carries_the_email_or_the_sign_in_token()
    {
        // Given the API logging everything, and Sofia's Northwind
        await using var api = new MondinoApi { UsesEmailSource = true, CapturesLogs = true };
        using var client = api.CreateSecureClient();
        await api.MakeTeamAsync(client, "Northwind", "sofia@northwind.co");

        // When a sign-in link is asked for her, mailed through Postmark, and opened
        using (var asked = await client.PostAsJsonAsync("/api/sign-in-links", new { email = "sofia@northwind.co" }))
        {
            Assert.Equal(HttpStatusCode.Accepted, asked.StatusCode);
        }

        var sent = await api.EmailSource.NextAsync();
        var token = System.Text.RegularExpressions.Regex.Match(sent.Body, "sign-in#([A-Za-z0-9_-]{43})").Groups[1].Value;
        Assert.NotEmpty(token);
        using (var opened = await api.CreateSecureClient().PostAsJsonAsync("/api/sign-in-links/redemptions", new { signInToken = token }))
        {
            Assert.Equal(HttpStatusCode.OK, opened.StatusCode);
        }

        // Then the API logged, and no line carries the email or the token
        Assert.NotEmpty(api.Logs.Lines);

        Assert.DoesNotContain(api.Logs.Lines, line => line.Contains("sofia@northwind.co", StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(api.Logs.Lines, line => line.Contains(token, StringComparison.Ordinal));
    }
}
