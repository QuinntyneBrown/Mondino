namespace Mondino.Api.Telemetry;

/// <summary>
/// What telemetry keeps (L2-051, docs/adr/0031). Anything not named here is dropped: a name, an
/// email, a postal code, a city, a position, a token, a path, a query string and a body are never
/// named, and an attribute a new instrumentation adds is dropped until it is.
/// </summary>
internal static class TelemetryRedaction
{
    /// <summary>The attributes a span keeps: the method, the status, the route template, the error's type, an outside source's host and name.</summary>
    public static readonly IReadOnlySet<string> AllowedSpanAttributes = new HashSet<string>(StringComparer.Ordinal)
    {
        "http.request.method",
        "http.response.status_code",
        "http.route",
        "error.type",
        "server.address",
        "mondino.source",
        "mondino.source.outcome",
    };

    /// <summary>The attributes a log record keeps: its message template, and the values <c>LogMessages</c> takes.</summary>
    public static readonly IReadOnlySet<string> AllowedLogAttributes = new HashSet<string>(StringComparer.Ordinal)
    {
        "{OriginalFormat}",
        "errorType",
        "correlationId",
    };

    /// <summary>The tags a metric keeps.</summary>
    public static readonly IReadOnlySet<string> AllowedMetricTags = new HashSet<string>(StringComparer.Ordinal)
    {
        "http.request.method",
        "http.response.status_code",
        "http.route",
        "error.type",
        "server.address",
        "source",
        "outcome",
    };
}
