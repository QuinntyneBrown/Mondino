using Mondino.Application.Teams;
using Mondino.Domain.Teams;

namespace Mondino.Infrastructure.WeatherSource;

/// <summary>
/// The weather source behind a 5-second timeout and a cache (docs/adr/0015). Weather is kept
/// 15 minutes per city, by its position rounded to two decimal places, so two teammates in one city
/// share one call (L2-018); concurrent reads of one city share one call. No weather is not kept,
/// so the next read asks again. At most 10,000 cities are held. The breaker, and an older answer
/// while the source fails, come with journey 26 (L2-049).
/// </summary>
internal sealed class CachedWeatherSource(OpenMeteoWeatherSource source, TimeProvider time) : IWeatherSource
{
    public static readonly TimeSpan Timeout = TimeSpan.FromSeconds(5);
    public static readonly TimeSpan FreshFor = TimeSpan.FromMinutes(15);
    public const int MaxEntries = 10_000;

    private readonly Dictionary<Position, (Task<Weather?> Reading, DateTimeOffset Expires)> cache = [];
    private readonly Lock gate = new();

    public Task<Weather?> GetCurrentAsync(Position position, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(position);
        var key = WeatherPlaces.Of(position.Latitude, position.Longitude);
        TaskCompletionSource<Weather?> pending;
        lock (gate)
        {
            var now = time.GetUtcNow();
            if (cache.TryGetValue(key, out var kept) && kept.Expires > now)
            {
                return kept.Reading;
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

            // Shared by every read of the city until it answers; no caller's cancellation ends it.
            pending = new TaskCompletionSource<Weather?>(TaskCreationOptions.RunContinuationsAsynchronously);
            cache[key] = (pending.Task, now + FreshFor);
        }

        _ = ReadAsync(key, pending);
        return pending.Task;
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
            // No weather is not kept: the next read asks again.
            if (weather is null)
            {
                lock (gate)
                {
                    if (cache.TryGetValue(key, out var kept) && kept.Reading == pending.Task)
                    {
                        cache.Remove(key);
                    }
                }
            }

            pending.TrySetResult(weather);
        }
    }
}
