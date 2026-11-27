using Microsoft.Extensions.Options;
using Mondino.Domain.Moments;
using Mondino.Infrastructure.OutsideSources;

namespace Mondino.Infrastructure.Moments;

/// <summary>
/// The public holiday source behind a 5-second timeout (L2-049), a cache and a breaker
/// (docs/adr/0019, docs/adr/0026). A country's year is fresh 24 hours; concurrent reads of one
/// share one call, and none is queued. While the source fails, times out or its breaker is open,
/// the last year it gave is given, whatever its age, and otherwise nothing. At most 1,000 years
/// are held; one goes only for room, the one read longest ago first.
/// </summary>
internal sealed class CachedOpenHolidays(
    OpenHolidaysCalendar source, IOptions<OutsideSourceOptions> options, TimeProvider time)
{
    public static readonly TimeSpan Timeout = TimeSpan.FromSeconds(5);
    public static readonly TimeSpan FreshFor = TimeSpan.FromHours(24);
    public const int MaxEntries = 1_000;

    private static readonly IReadOnlyList<CalendarEntry> Nothing = [];

    private readonly Dictionary<(string Country, int Year), Entry> cache = [];
    private readonly Lock gate = new();
    private readonly SourceBreaker breaker = new(options, time);

    public Task<IReadOnlyList<CalendarEntry>> YearAsync(string countryCode, int year)
    {
        if (!OpenHolidaysCalendar.Covers.Contains(countryCode))
        {
            return Task.FromResult(Nothing);
        }

        var key = (countryCode.ToUpperInvariant(), year);
        TaskCompletionSource<IReadOnlyList<CalendarEntry>> pending;
        lock (gate)
        {
            var now = time.GetUtcNow();
            cache.TryGetValue(key, out var entry);
            if (entry?.Reading is { } reading && entry.FreshUntil > now)
            {
                return reading;
            }

            if (breaker.IsOpen)
            {
                return Task.FromResult(entry?.Kept ?? Nothing);
            }

            if (entry is null)
            {
                MakeRoom();
                entry = new Entry();
                cache[key] = entry;
            }

            // Stored before the read starts, so a fast answer finds it (lessons, journey 13).
            pending = new TaskCompletionSource<IReadOnlyList<CalendarEntry>>(TaskCreationOptions.RunContinuationsAsynchronously);
            entry.Reading = pending.Task;
            entry.FreshUntil = now + FreshFor;
        }

        _ = ReadAsync(key, pending);
        return pending.Task;
    }

    private async Task ReadAsync((string Country, int Year) key, TaskCompletionSource<IReadOnlyList<CalendarEntry>> pending)
    {
        IReadOnlyList<CalendarEntry>? entries = null;
        try
        {
            using var timeout = new CancellationTokenSource(Timeout, time);
            try
            {
                entries = await source.YearAsync(key.Country, key.Year, timeout.Token);
            }
            catch (OperationCanceledException) when (timeout.IsCancellationRequested)
            {
                entries = null;
            }
        }
        finally
        {
            IReadOnlyList<CalendarEntry> answer;
            lock (gate)
            {
                cache.TryGetValue(key, out var entry);
                if (entries is not null)
                {
                    breaker.Succeeded();
                    if (entry is not null)
                    {
                        entry.Kept = entries;
                        entry.KeptAt = time.GetUtcNow();
                    }

                    answer = entries;
                }
                else
                {
                    // A failure is not fresh, and counts towards the breaker; the last year read stands in.
                    breaker.Failed();
                    if (entry is not null && entry.Reading == pending.Task)
                    {
                        entry.Reading = null;
                    }

                    answer = entry?.Kept ?? Nothing;
                }
            }

            pending.TrySetResult(answer);
        }
    }

    /// <summary>Keeps the years under <see cref="MaxEntries"/>: the one with nothing kept, or read longest ago, goes.</summary>
    private void MakeRoom()
    {
        if (cache.Count < MaxEntries)
        {
            return;
        }

        var idle = cache.Where(pair => pair.Value.Reading is not { IsCompleted: false }).ToList();
        if (idle.Count > 0)
        {
            cache.Remove(idle.MinBy(pair => pair.Value.Kept is null ? DateTimeOffset.MinValue : pair.Value.KeptAt).Key);
        }
    }

    /// <summary>A country's year: the read in flight or fresh, and the last year given with when it was read.</summary>
    private sealed class Entry
    {
        public Task<IReadOnlyList<CalendarEntry>>? Reading { get; set; }

        public DateTimeOffset FreshUntil { get; set; }

        public IReadOnlyList<CalendarEntry>? Kept { get; set; }

        public DateTimeOffset KeptAt { get; set; }
    }
}
