using Microsoft.Extensions.Options;
using Mondino.Application.Teams;
using Mondino.Domain.Teams;
using Mondino.Infrastructure.OutsideSources;

namespace Mondino.Infrastructure.WeatherSource;

/// <summary>
/// The weather source behind a 5-second timeout, a cache and a breaker (docs/adr/0015,
/// docs/adr/0026). Weather is fresh 15 minutes per city, by its position rounded to two decimal
/// places, so two teammates in one city share one call (L2-050); concurrent reads of one city share
/// one call, and none is queued. While the source fails, times out or its breaker is open, the
/// city's last good answer is given if it was read under 3 hours ago, and otherwise none (L2-049).
/// A caller whose token is cancelled stops waiting; the call goes on for the others. At most
/// 10,000 cities are held.
/// </summary>
internal sealed class CachedWeatherSource(
    OpenMeteoWeatherSource source, IOptions<OutsideSourceOptions> options, TimeProvider time) : IWeatherSource
{
    public static readonly TimeSpan Timeout = TimeSpan.FromSeconds(5);
    public static readonly TimeSpan FreshFor = TimeSpan.FromMinutes(15);
    public static readonly TimeSpan ServedFor = TimeSpan.FromHours(3);
    public const int MaxEntries = 10_000;

    private readonly Dictionary<Position, Entry> cache = [];
    private readonly Lock gate = new();
    private readonly SourceBreaker breaker = new(options, time);

    public Task<Weather?> GetCurrentAsync(Position position, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(position);
        var key = WeatherPlaces.Of(position.Latitude, position.Longitude);
        TaskCompletionSource<Weather?> pending;
        lock (gate)
        {
            var now = time.GetUtcNow();
            cache.TryGetValue(key, out var entry);
            if (entry?.Reading is { } reading && entry.FreshUntil > now)
            {
                return reading.WaitAsync(cancellationToken);
            }

            if (breaker.IsOpen)
            {
                return Task.FromResult(Older(entry, now));
            }

            if (entry is null)
            {
                MakeRoom(now);
                entry = new Entry();
                cache[key] = entry;
            }

            // Shared by every read of the city until it answers; no caller's cancellation ends it.
            pending = new TaskCompletionSource<Weather?>(TaskCreationOptions.RunContinuationsAsynchronously);
            entry.Reading = pending.Task;
            entry.FreshUntil = now + FreshFor;
        }

        _ = ReadAsync(key, pending);
        return pending.Task.WaitAsync(cancellationToken);
    }

    private async Task ReadAsync(Position key, TaskCompletionSource<Weather?> pending)
    {
        Weather? weather = null;
        try
        {
            using var timeout = new CancellationTokenSource(Timeout, time);
            try
            {
                weather = await source.GetCurrentAsync(key, timeout.Token);
            }
            catch (OperationCanceledException) when (timeout.IsCancellationRequested)
            {
                weather = null;
            }
        }
        finally
        {
            Weather? answer;
            lock (gate)
            {
                var now = time.GetUtcNow();
                cache.TryGetValue(key, out var entry);
                if (weather is not null)
                {
                    breaker.Succeeded();
                    if (entry is not null)
                    {
                        entry.Kept = weather;
                        entry.KeptAt = now;
                    }

                    answer = weather;
                }
                else
                {
                    // No weather is not fresh: the next read asks again, unless the breaker opens.
                    breaker.Failed();
                    if (entry is not null && entry.Reading == pending.Task)
                    {
                        entry.Reading = null;
                    }

                    answer = Older(entry, now);
                }
            }

            pending.TrySetResult(answer);
        }
    }

    /// <summary>The city's last good answer, if it was read under 3 hours ago.</summary>
    private static Weather? Older(Entry? entry, DateTimeOffset now) =>
        entry?.Kept is { } kept && now - entry.KeptAt < ServedFor ? kept : null;

    /// <summary>Whether a city's read is in flight or still fresh.</summary>
    private static bool InUse(Entry entry, DateTimeOffset now) =>
        entry.Reading is { } reading && (!reading.IsCompleted || entry.FreshUntil > now);

    /// <summary>
    /// Keeps the cities under <see cref="MaxEntries"/>: first those with nothing worth giving, then
    /// the one held longest without use.
    /// </summary>
    private void MakeRoom(DateTimeOffset now)
    {
        if (cache.Count < MaxEntries)
        {
            return;
        }

        foreach (var stale in cache.Where(pair => !InUse(pair.Value, now) && Older(pair.Value, now) is null)
                     .Select(pair => pair.Key).ToList())
        {
            cache.Remove(stale);
        }

        if (cache.Count >= MaxEntries)
        {
            cache.Remove(cache.MinBy(pair => pair.Value.FreshUntil).Key);
        }
    }

    /// <summary>A city's read: the one in flight or fresh, and the last good answer with when it was read.</summary>
    private sealed class Entry
    {
        public Task<Weather?>? Reading { get; set; }

        public DateTimeOffset FreshUntil { get; set; }

        public Weather? Kept { get; set; }

        public DateTimeOffset KeptAt { get; set; }
    }
}
