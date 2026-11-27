using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace Mondino.Infrastructure.OutsideSources;

/// <summary>
/// The instruments each outside source records its calls with (L2-051, docs/adr/0031): the
/// counter <c>mondino.source.calls</c> and the histogram <c>mondino.source.duration</c>, labelled
/// by <c>source</c> and <c>outcome</c> and nothing else, and a span for each call made. A call is
/// timed by <see cref="TimeProvider"/>. Nothing about what was asked is recorded: neither a postal
/// code, a position, a country, nor an address.
/// </summary>
public sealed class SourceTelemetry : IDisposable
{
    /// <summary>The name of the <see cref="ActivitySource"/> and the <see cref="Meter"/>.</summary>
    public const string Name = "Mondino";

    public const string PostalCode = "postal_code";
    public const string Weather = "weather";
    public const string HolidayCalendar = "holiday_calendar";
    public const string Email = "email";

    private readonly ActivitySource spans = new(Name);
    private readonly Counter<long> calls;
    private readonly Histogram<double> duration;
    private readonly TimeProvider time;

    public SourceTelemetry(IMeterFactory meters, TimeProvider time)
    {
        ArgumentNullException.ThrowIfNull(meters);
        var meter = meters.Create(Name);
        calls = meter.CreateCounter<long>("mondino.source.calls", "{call}", "Calls to an outside source, by source and outcome.");
        duration = meter.CreateHistogram<double>("mondino.source.duration", "s", "How long a call to an outside source took, by source and outcome.");
        this.time = time;
    }

    /// <summary>Begins a call to <paramref name="source"/>; the caller ends it with its outcome.</summary>
    public SourceCall Start(string source) =>
        new(this, source, spans.StartActivity($"source {source}", ActivityKind.Client), time.GetTimestamp());

    /// <summary>Counts a call that was not made because the source's breaker is open.</summary>
    public void LeftAlone(string source) => calls.Add(1, Labels(source, SourceOutcome.CircuitOpen));

    public void Dispose() => spans.Dispose();

    private void End(SourceCall call, SourceOutcome outcome)
    {
        var labels = Labels(call.Source, outcome);
        calls.Add(1, labels);
        duration.Record(time.GetElapsedTime(call.Started).TotalSeconds, labels);
        if (call.Span is { } span)
        {
            span.SetTag("mondino.source", call.Source);
            span.SetTag("mondino.source.outcome", Label(outcome));
            if (outcome != SourceOutcome.Success)
            {
                span.SetStatus(ActivityStatusCode.Error);
            }

            span.Dispose();
        }
    }

    private static TagList Labels(string source, SourceOutcome outcome) =>
        new() { { "source", source }, { "outcome", Label(outcome) } };

    private static string Label(SourceOutcome outcome) => outcome switch
    {
        SourceOutcome.Success => "success",
        SourceOutcome.Failure => "failure",
        SourceOutcome.Timeout => "timeout",
        SourceOutcome.CircuitOpen => "circuit_open",
        _ => throw new ArgumentOutOfRangeException(nameof(outcome)),
    };

    /// <summary>One call to an outside source, ended once with its outcome.</summary>
    public sealed class SourceCall
    {
        private readonly SourceTelemetry owner;
        private int ended;

        internal SourceCall(SourceTelemetry owner, string source, Activity? span, long started) =>
            (this.owner, Source, Span, Started) = (owner, source, span, started);

        internal string Source { get; }

        internal Activity? Span { get; }

        internal long Started { get; }

        public void End(SourceOutcome outcome)
        {
            if (Interlocked.Exchange(ref ended, 1) == 0)
            {
                owner.End(this, outcome);
            }
        }
    }
}
