using System.Diagnostics;
using OpenTelemetry;

namespace Mondino.Api.Telemetry;

/// <summary>
/// The first span processor: removes every attribute <see cref="TelemetryRedaction.AllowedSpanAttributes"/>
/// does not name, the status description, the trace state and the baggage, and names an HTTP span
/// by its method and, for a request, its route template, written from the root with each
/// parameter named and nothing else (<see cref="RouteTemplates"/>).
/// </summary>
internal sealed class SpanRedaction : BaseProcessor<Activity>
{
    public override void OnEnd(Activity data)
    {
        ArgumentNullException.ThrowIfNull(data);
        foreach (var key in data.TagObjects.Select(tag => tag.Key).Where(key => !TelemetryRedaction.AllowedSpanAttributes.Contains(key)).ToList())
        {
            data.SetTag(key, null);
        }

        foreach (var key in data.Baggage.Select(pair => pair.Key).ToList())
        {
            data.SetBaggage(key, null);
        }

        if (data.GetTagItem("http.route") is string template)
        {
            data.SetTag("http.route", RouteTemplates.Normalise(template));
        }

        data.SetStatus(data.Status);
        data.TraceStateString = null;

        if (data.GetTagItem("http.request.method") is string method)
        {
            data.DisplayName = data.Kind == ActivityKind.Server && data.GetTagItem("http.route") is string route
                ? $"{method} {route}"
                : method;
        }
    }
}
