using Mondino.Domain.Moments;

namespace Mondino.Infrastructure.Moments;

/// <summary>
/// The public holiday source behind a 5-second timeout (L2-049), a cache and a breaker
/// (docs/adr/0019). A country's year is kept 24 hours, at most 1,000; concurrent reads of one share
/// one call; a failure is not kept. After 5 failures in a row the breaker opens for 30 seconds and
/// the source gives nothing without a call. Serving an older year while it fails is journey 26's.
/// </summary>
internal sealed class CachedOpenHolidays(OpenHolidaysCalendar source, TimeProvider time)
{
    public static readonly TimeSpan Timeout = TimeSpan.FromSeconds(5);
    public static readonly TimeSpan FreshFor = TimeSpan.FromHours(24);
    public static readonly TimeSpan BreakerOpenFor = TimeSpan.FromSeconds(30);
    public const int FailuresToOpen = 5;
    public const int MaxEntries = 1_000;

    private static readonly Task<IReadOnlyList<CalendarEntry>> None = Task.FromResult<IReadOnlyList<CalendarEntry>>([]);

    private readonly Dictionary<(string Country, int Year), (Task<IReadOnlyList<CalendarEntry>> Reading, DateTimeOffset Expires)> cache = [];
    private readonly Lock gate = new();
    private int failures;
    private DateTimeOffset openUntil = DateTimeOffset.MinValue;

    public Task<IReadOnlyList<CalendarEntry>> YearAsync(string countryCode, int year)
    {
        if (!OpenHolidaysCalendar.Covers.Contains(countryCode))
        {
            return None;
        }

        var key = (countryCode.ToUpperInvariant(), year);
        TaskCompletionSource<IReadOnlyList<CalendarEntry>> pending;
        lock (gate)
        {
            var now = time.GetUtcNow();
            if (cache.TryGetValue(key, out var kept) && kept.Expires > now)
            {
                return kept.Reading;
            }

            if (now < openUntil)
            {
                return None;
            }

            if (cache.Count >= MaxEntries)
            {
                foreach (var stale in cache.Where(entry => entry.Value.Expires <= now).Select(entry => entry.Key).ToList())
                {
                    cache.Remove(stale);
                }

                if (cache.Count >= MaxEntries)
                {
                    cache.Remove(cache.MinBy(entry => entry.Value.Expires).Key);
                }
            }

            // Stored before the read starts, so a fast answer finds it (lessons, journey 13).
            pending = new TaskCompletionSource<IReadOnlyList<CalendarEntry>>(TaskCreationOptions.RunContinuationsAsynchronously);
            cache[key] = (pending.Task, now + FreshFor);
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
            lock (gate)
            {
                if (entries is null)
                {
                    // A failure is not kept, and counts towards the breaker.
                    if (cache.TryGetValue(key, out var kept) && kept.Reading == pending.Task)
                    {
                        cache.Remove(key);
                    }

                    if (++failures >= FailuresToOpen)
                    {
                        openUntil = time.GetUtcNow() + BreakerOpenFor;
                        failures = 0;
                    }
                }
                else
                {
                    failures = 0;
                }
            }

            pending.TrySetResult(entries ?? []);
        }
    }
}
