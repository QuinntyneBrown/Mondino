// Acceptance Test
// Traces to: L2-051
// Description: A request to a team's endpoint is recorded by its route template, with no id, query string or body

using System.Diagnostics;
using System.Net;
using Mondino.Api.Telemetry;
using Mondino.Tests.Support;

namespace Mondino.Tests.Platform;

[Collection(nameof(TelemetryAlone))]
public sealed class RouteTemplateTelemetryTests
{
    [Fact]
    public async Task A_teams_endpoint_is_recorded_as_its_template_with_no_id_query_or_body()
    {
        // Given the API exporting to memory, and Sofia on Northwind
        await using var api = new MondinoApi { CapturesTelemetry = true };
        await api.SeedAsync();
        using var client = api.CreateSecureClient();
        var sofia = await api.JoinNorthwindAsync(client);

        // When she reads her team's pins, with a query string
        using (var read = sofia.Request(HttpMethod.Get, $"/api/teams/{sofia.TeamId}/pins?near=Sofia+Bianchi"))
        using (var pins = await client.SendAsync(read))
        {
            Assert.Equal(HttpStatusCode.OK, pins.StatusCode);
        }

        // Then its span is named and routed by the template, and keeps only the method, the status and the route
        var span = await api.Telemetry.WaitForSpanAsync(s => s.Kind == ActivityKind.Server && s.Name.StartsWith("GET", StringComparison.Ordinal), "the pins' request");
        Assert.Equal("GET /api/teams/{teamId}/pins", span.Name);
        Assert.Equal(
            new Dictionary<string, string>
            {
                ["http.request.method"] = "GET",
                ["http.response.status_code"] = "200",
                ["http.route"] = "/api/teams/{teamId}/pins",
            },
            new Dictionary<string, string>(span.Attributes.Where(pair => pair.Key != "server.address")));

        // And no span, log or metric carries the team's id, the teammate's id or the query string
        var everything = api.Telemetry.Everything.Concat(api.CollectMetrics().Select(point => point.Text)).ToList();
        Assert.DoesNotContain(everything, text => text.Contains(sofia.TeamId.ToString(), StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(everything, text => text.Contains(sofia.TeammateId.ToString(), StringComparison.OrdinalIgnoreCase));
        Assert.DoesNotContain(everything, text => text.Contains("near=", StringComparison.Ordinal));
        Assert.DoesNotContain(everything, text => text.Contains("Sofia", StringComparison.Ordinal));

        // And the request's duration is a metric labelled by the template as ASP.NET Core declares it
        Assert.Contains(api.CollectMetrics(), point => point.Metric == "http.server.request.duration"
            && point.Tags.GetValueOrDefault("http.route") == "api/teams/{teamId:guid}/pins");
    }

    [Theory]
    [InlineData("api/teams/{teamId:guid}/pins", "/api/teams/{teamId}/pins")]
    [InlineData("api/invites/{inviteToken}/teammates", "/api/invites/{inviteToken}/teammates")]
    [InlineData("api/sign-in-links/redemptions", "/api/sign-in-links/redemptions")]
    [InlineData("/api/{**rest}", "/api/{**rest}")]
    [InlineData("api/things/{id:int:min(1)}/{kind=all}/{page?}", "/api/things/{id}/{kind}/{page}")]
    public void A_route_is_recorded_from_the_root_with_each_parameter_named_and_nothing_else(string template, string recorded) =>
        Assert.Equal(recorded, RouteTemplates.Normalise(template));

    [Fact]
    public void A_call_to_an_outside_source_keeps_its_host_method_and_status_and_drops_its_address()
    {
        // Given a call to the postal code source, with the postal code in its address
        using var source = new ActivitySource("Mondino.Tests.Outgoing");
        using var listener = new ActivityListener
        {
            ShouldListenTo = s => s.Name == source.Name,
            Sample = (ref ActivityCreationOptions<ActivityContext> _) => ActivitySamplingResult.AllDataAndRecorded,
        };
        ActivitySource.AddActivityListener(listener);
        using var call = source.StartActivity("GET", ActivityKind.Client)!;
        call.SetTag("http.request.method", "GET");
        call.SetTag("url.full", "https://secure.geonames.org/postalCodeSearchJSON?postalcode=20121&country=IT&username=mondino");
        call.SetTag("server.address", "secure.geonames.org");
        call.SetTag("http.response.status_code", 200);
        call.SetBaggage("teammate", "Sofia Bianchi");
        call.SetStatus(ActivityStatusCode.Error, "postal code 20121 not found");
        call.TraceStateString = "mondino=20121";

        // When it ends and passes the redaction
        call.Stop();
        using var redaction = new SpanRedaction();
        redaction.OnEnd(call);

        // Then it keeps the source's host, the method and the status, and nothing else
        Assert.Equal("GET", call.DisplayName);
        Assert.Equal(
            new Dictionary<string, object?>
            {
                ["http.request.method"] = "GET",
                ["server.address"] = "secure.geonames.org",
                ["http.response.status_code"] = 200,
            },
            new Dictionary<string, object?>(call.TagObjects));
        Assert.DoesNotContain(call.Baggage, pair => pair.Value is not null);
        Assert.Null(call.StatusDescription);
        Assert.Null(call.TraceStateString);
    }
}
