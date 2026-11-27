namespace Mondino.Api.Telemetry;

/// <summary>
/// Every message the API logs of its own (L2-051, docs/adr/0031): a fixed template that takes
/// values from a closed set only, never a name, an email, a postal code, a city, a position, a
/// token or an id of a team or a teammate. <see cref="TelemetryRedaction.AllowedLogAttributes"/>
/// names each value a message takes.
/// </summary>
internal static partial class LogMessages
{
    [LoggerMessage(EventId = 1, EventName = "UnhandledError", Level = LogLevel.Error,
        Message = "An unhandled {errorType} was answered with 500 (correlation id {correlationId}).")]
    public static partial void UnhandledError(this ILogger logger, string errorType, string correlationId);
}
