using OpenTelemetry;
using OpenTelemetry.Logs;

namespace Mondino.Api.Telemetry;

/// <summary>
/// The first log processor: keeps a record's message template and the attributes
/// <see cref="TelemetryRedaction.AllowedLogAttributes"/> names, and of an exception only its type.
/// The formatted message, a body that is not a template and every other attribute are dropped.
/// </summary>
internal sealed class LogRedaction : BaseProcessor<LogRecord>
{
    private const string Template = "{OriginalFormat}";

    public override void OnEnd(LogRecord data)
    {
        ArgumentNullException.ThrowIfNull(data);
        var attributes = data.Attributes ?? [];
        var kept = attributes.Where(pair => TelemetryRedaction.AllowedLogAttributes.Contains(pair.Key)).ToList();
        if (data.Exception is { } exception)
        {
            kept.Add(new("exception.type", exception.GetType().FullName));
            data.Exception = null;
        }

        data.Body = attributes.FirstOrDefault(pair => pair.Key == Template).Value as string;
        data.FormattedMessage = null;
        data.Attributes = kept;
    }
}
