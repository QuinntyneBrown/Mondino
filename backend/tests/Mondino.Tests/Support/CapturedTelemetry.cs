using System.Collections.Concurrent;
using System.Diagnostics;
using System.Globalization;
using System.Text;
using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;

namespace Mondino.Tests.Support;

/// <summary>
/// Every span, log record and metric the API exports, written down as text at the moment it is
/// exported, after the API's own processors have run: what a telemetry product would receive.
/// </summary>
public sealed class CapturedTelemetry
{
    private readonly ConcurrentQueue<CapturedSpan> spans = new();
    private readonly ConcurrentQueue<CapturedLog> logs = new();
    private readonly Lock gate = new();
    private IReadOnlyList<CapturedPoint> points = [];
    private TaskCompletionSource exported = new(TaskCreationOptions.RunContinuationsAsynchronously);

    public IReadOnlyList<CapturedSpan> Spans => [.. spans];

    public IReadOnlyList<CapturedLog> Logs => [.. logs];

    /// <summary>The metric points of the last collection; <see cref="MondinoApi.CollectMetrics"/> collects them.</summary>
    public IReadOnlyList<CapturedPoint> Points
    {
        get
        {
            lock (gate)
            {
                return points;
            }
        }
    }

    /// <summary>Everything exported, as the text a search runs over.</summary>
    public IEnumerable<string> Everything =>
        Spans.Select(span => span.Text).Concat(Logs.Select(log => log.Text)).Concat(Points.Select(point => point.Text));

    public BaseExporter<Activity> SpanExporter() => new SpanCapture(this);

    public BaseExporter<LogRecord> LogExporter() => new LogCapture(this);

    public BaseExporter<Metric> MetricExporter() => new MetricCapture(this);

    /// <summary>Completes when a span <paramref name="matches"/>, or fails naming the spans that did arrive.</summary>
    public async Task<CapturedSpan> WaitForSpanAsync(Func<CapturedSpan, bool> matches, string what)
    {
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        while (true)
        {
            Task next;
            lock (gate)
            {
                next = exported.Task;
            }

            if (Spans.FirstOrDefault(matches) is { } span)
            {
                return span;
            }

            try
            {
                await next.WaitAsync(timeout.Token);
            }
            catch (OperationCanceledException)
            {
                throw new TimeoutException(
                    $"No span was {what}; the spans were: {string.Join(" | ", Spans.Select(s => s.Name))}");
            }
        }
    }

    private void Exported()
    {
        TaskCompletionSource was;
        lock (gate)
        {
            was = exported;
            exported = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        }

        was.TrySetResult();
    }

    private static string Text(object? value) => Convert.ToString(value, CultureInfo.InvariantCulture) ?? string.Empty;

    private sealed class SpanCapture(CapturedTelemetry owner) : BaseExporter<Activity>
    {
        public override ExportResult Export(in Batch<Activity> batch)
        {
            foreach (var activity in batch)
            {
                var attributes = activity.TagObjects.ToDictionary(tag => tag.Key, tag => Text(tag.Value));
                var text = new StringBuilder()
                    .Append(CultureInfo.InvariantCulture, $"span {activity.Source.Name} {activity.OperationName} {activity.DisplayName} {activity.Kind} {activity.Status} {activity.StatusDescription} {activity.TraceStateString} ")
                    .AppendJoin(' ', attributes.Select(pair => $"{pair.Key}={pair.Value}"))
                    .AppendJoin(' ', activity.Events.Select(e => $"event {e.Name} {string.Join(' ', e.Tags.Select(tag => $"{tag.Key}={tag.Value}"))}"))
                    .AppendJoin(' ', activity.Links.Select(link => $"link {string.Join(' ', link.Tags?.Select(tag => $"{tag.Key}={tag.Value}") ?? [])}"))
                    .AppendJoin(' ', activity.Baggage.Select(pair => $"baggage {pair.Key}={pair.Value}"))
                    .ToString();
                owner.spans.Enqueue(new CapturedSpan(activity.DisplayName, activity.Kind, activity.TraceId.ToHexString(), attributes, text));
            }

            owner.Exported();
            return ExportResult.Success;
        }
    }

    private sealed class LogCapture(CapturedTelemetry owner) : BaseExporter<LogRecord>
    {
        public override ExportResult Export(in Batch<LogRecord> batch)
        {
            foreach (var record in batch)
            {
                var attributes = (record.Attributes ?? []).ToDictionary(pair => pair.Key, pair => Text(pair.Value));
                var text = new StringBuilder()
                    .Append(CultureInfo.InvariantCulture, $"log {record.CategoryName} {record.LogLevel} {record.EventId} {record.Body} {record.FormattedMessage} {record.Exception} ")
                    .AppendJoin(' ', attributes.Select(pair => $"{pair.Key}={pair.Value}"));
                record.ForEachScope((scope, builder) => builder.Append(CultureInfo.InvariantCulture, $" scope {scope.Scope}"), text);
                owner.logs.Enqueue(new CapturedLog(record.CategoryName ?? string.Empty, record.Body, record.TraceId.ToHexString(), attributes, text.ToString()));
            }

            owner.Exported();
            return ExportResult.Success;
        }
    }

    private sealed class MetricCapture(CapturedTelemetry owner) : BaseExporter<Metric>
    {
        public override ExportResult Export(in Batch<Metric> batch)
        {
            var collected = new List<CapturedPoint>();
            foreach (var metric in batch)
            {
                foreach (ref readonly var point in metric.GetMetricPoints())
                {
                    var tags = new Dictionary<string, string>();
                    foreach (var tag in point.Tags)
                    {
                        tags[tag.Key] = Text(tag.Value);
                    }

                    var count = metric.MetricType switch
                    {
                        MetricType.Histogram => point.GetHistogramCount(),
                        MetricType.LongSum or MetricType.LongSumNonMonotonic => point.GetSumLong(),
                        _ => 0,
                    };
                    var text = $"metric {metric.MeterName} {metric.Name} {metric.Description} {metric.Unit} "
                        + string.Join(' ', tags.Select(pair => $"{pair.Key}={pair.Value}"));
                    collected.Add(new CapturedPoint(metric.Name, tags, count, text));
                }
            }

            lock (owner.gate)
            {
                owner.points = collected;
            }

            return ExportResult.Success;
        }
    }
}

public sealed record CapturedSpan(string Name, ActivityKind Kind, string TraceId, IReadOnlyDictionary<string, string> Attributes, string Text);

public sealed record CapturedLog(string Category, string? Body, string TraceId, IReadOnlyDictionary<string, string> Attributes, string Text);

/// <summary>A metric point: its tags and, for a counter its sum, for a histogram its count.</summary>
public sealed record CapturedPoint(string Metric, IReadOnlyDictionary<string, string> Tags, long Count, string Text);

/// <summary>
/// The telemetry tests run alone: an <c>ActivitySource</c> and a <c>Meter</c> are seen by every
/// host in the process, so another test's requests would be counted with theirs.
/// </summary>
[CollectionDefinition(nameof(TelemetryAlone), DisableParallelization = true)]
public sealed class TelemetryAlone;
