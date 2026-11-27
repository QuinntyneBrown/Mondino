// Acceptance Test
// Traces to: L2-051
// Description: Joining, and asking for and opening a sign-in link, leave no name, postal code, city, position, email or token in any exported span, log record or metric

using System.Net;
using System.Net.Http.Json;
using System.Text.RegularExpressions;
using Mondino.Tests.Support;

namespace Mondino.Tests.Platform;

[Collection(nameof(TelemetryAlone))]
public sealed partial class NoTeammateInTelemetryTests
{
    private const string Join = "/api/invites/northwind-7Kq2/teammates";

    [Fact]
    public async Task A_join_leaves_neither_the_name_nor_the_postal_code_nor_the_city_nor_its_position_nor_the_invite_token()
    {
        // Given the API exporting to memory, logging at every level, with Northwind, and the real
        // postal code and weather sources, which know 20121 in Italy is Milan
        await using var api = new MondinoApi { CapturesTelemetry = true, UsesPostalCodeSource = true, UsesWeatherSource = true };
        await api.SeedAsync();
        api.PostalCodeSource.Knows("IT", "20121", "Milano", "Lombardia", 45.46427, 9.18951);
        api.OpenMeteo.Reports("45.46", "9.19", 13, 45);
        using var client = api.CreateSecureClient();

        // When Sofia Bianchi looks up 20121, joins with it, and reads her team's pins
        using (var lookup = await client.PostAsJsonAsync("/api/invites/northwind-7Kq2/postal-code-lookups", new { countryCode = "IT", postalCode = "20121" }))
        {
            Assert.Equal(HttpStatusCode.OK, lookup.StatusCode);
            Assert.Contains("Milan", await lookup.Content.ReadAsStringAsync(), StringComparison.Ordinal);
        }

        using var joined = await client.PostAsJsonAsync(Join, new
        {
            name = "Sofia Bianchi",
            countryCode = "IT",
            postalCode = "20121",
            joinRequestId = Guid.NewGuid(),
        });
        Assert.Equal(HttpStatusCode.Created, joined.StatusCode);
        var sofia = await Sessions.SessionOfAsync(joined);
        using (var read = sofia.Request(HttpMethod.Get, $"/api/teams/{sofia.TeamId}/pins"))
        using (var pins = await client.SendAsync(read))
        {
            Assert.Equal(HttpStatusCode.OK, pins.StatusCode);
        }

        // Then the three requests were traced, and metrics were collected
        await api.Telemetry.WaitForSpanAsync(span => span.Attributes.GetValueOrDefault("http.route") == "/api/teams/{teamId}/pins", "the pins' request");
        await api.Telemetry.WaitForSpanAsync(span => span.Attributes.GetValueOrDefault("http.route") == "/api/invites/{inviteToken}/teammates", "the join");
        Assert.NotEmpty(api.CollectMetrics());

        // And nothing exported carries the name, the postal code, the city, its position or the invite token
        AssertCarriesNone(api, "Sofia", "Bianchi", "20121", "Milan", "Milano", "Lombard", "45.46", "9.18", "9.19", "northwind-7Kq2", "7Kq2");
    }

    [Fact]
    public async Task Asking_for_and_opening_a_sign_in_link_leaves_neither_the_email_nor_the_token()
    {
        // Given the API exporting to memory, logging at every level, and Sofia's Northwind
        await using var api = new MondinoApi { CapturesTelemetry = true, UsesEmailSource = true };
        using var client = api.CreateSecureClient();
        await api.MakeTeamAsync(client, "Northwind", "sofia@northwind.co");

        // When a sign-in link is asked for her, mailed through the Email source, and opened
        using (var asked = await client.PostAsJsonAsync("/api/sign-in-links", new { email = "sofia@northwind.co" }))
        {
            Assert.Equal(HttpStatusCode.Accepted, asked.StatusCode);
        }

        var sent = await api.EmailSource.NextAsync();
        var token = SignInToken().Match(sent.Body).Groups[1].Value;
        Assert.NotEmpty(token);
        using (var opened = await api.CreateSecureClient().PostAsJsonAsync("/api/sign-in-links/redemptions", new { signInToken = token }))
        {
            Assert.Equal(HttpStatusCode.OK, opened.StatusCode);
        }

        // Then the requests were traced
        await api.Telemetry.WaitForSpanAsync(span => span.Attributes.GetValueOrDefault("http.route") == "/api/sign-in-links/redemptions", "the sign-in link's opening");
        Assert.NotEmpty(api.CollectMetrics());

        // And nothing exported carries the email, its domain or the sign-in token
        AssertCarriesNone(api, "sofia@", "northwind.co", token);
    }

    private static void AssertCarriesNone(MondinoApi api, params string[] values)
    {
        var everything = api.Telemetry.Everything.ToList();
        Assert.NotEmpty(everything);
        foreach (var value in values)
        {
            Assert.DoesNotContain(everything, text => text.Contains(value, StringComparison.OrdinalIgnoreCase));
        }
    }

    [GeneratedRegex("sign-in#([A-Za-z0-9_-]{43})")]
    private static partial Regex SignInToken();
}
