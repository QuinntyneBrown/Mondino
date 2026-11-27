using Microsoft.Extensions.Options;
using Mondino.Application.Joining;
using Mondino.Infrastructure.OutsideSources;

namespace Mondino.Infrastructure.PostalCodes;

/// <summary>
/// The postal code source behind a 5-second timeout (L2-049), a cache and a breaker
/// (docs/adr/0006). <c>Found</c> is kept 30 days and <c>NotFound</c> 1 day, by country and postal
/// code, at most 10,000 entries; <c>Unavailable</c> is never kept. After 5 failures in a row the
/// breaker opens for 30 seconds (<c>OutsideSources:*</c>, docs/adr/0026), and the lookup is
/// <c>Unavailable</c> without a call. Each call, and each lookup left alone, is recorded by
/// <see cref="SourceTelemetry"/> as <c>postal_code</c> (docs/adr/0031).
/// </summary>
internal sealed class CachedPostalCodeLookup(
    GeoNamesPostalCodeLookup source, IOptions<OutsideSourceOptions> options, TimeProvider time, SourceTelemetry telemetry) : IPostalCodeLookup
{
    public static readonly TimeSpan Timeout = TimeSpan.FromSeconds(5);
    public static readonly TimeSpan FoundLifetime = TimeSpan.FromDays(30);
    public static readonly TimeSpan NotFoundLifetime = TimeSpan.FromDays(1);
    public const int MaxEntries = 10_000;

    private readonly Dictionary<string, (PostalCodeLookupOutcome Outcome, DateTimeOffset Expires)> cache = [];
    private readonly Lock gate = new();
    private readonly SourceBreaker breaker = new(options, time);

    public async Task<PostalCodeLookupOutcome> FindCityAsync(PostalCode postalCode, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(postalCode);
        if (!source.CanLookUp(postalCode.CountryCode))
        {
            return PostalCodeLookupOutcome.Unavailable;
        }

        var key = $"{postalCode.CountryCode} {postalCode.Value}";
        lock (gate)
        {
            var now = time.GetUtcNow();
            if (cache.TryGetValue(key, out var kept) && kept.Expires > now)
            {
                return kept.Outcome;
            }

            if (breaker.IsOpen)
            {
                telemetry.LeftAlone(SourceTelemetry.PostalCode);
                return PostalCodeLookupOutcome.Unavailable;
            }
        }

        PostalCodeLookupOutcome outcome;
        var call = telemetry.Start(SourceTelemetry.PostalCode);
        using (var timeout = new CancellationTokenSource(Timeout, time))
        using (var linked = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken, timeout.Token))
        {
            try
            {
                outcome = await source.FindCityAsync(postalCode, linked.Token);
                call.End(outcome.Status == PostalCodeLookupStatus.Unavailable ? SourceOutcome.Failure : SourceOutcome.Success);
            }
            catch (OperationCanceledException) when (timeout.IsCancellationRequested && !cancellationToken.IsCancellationRequested)
            {
                call.End(SourceOutcome.Timeout);
                outcome = PostalCodeLookupOutcome.Unavailable;
            }
            catch
            {
                call.End(SourceOutcome.Failure);
                throw;
            }
        }

        Record(key, outcome);
        return outcome;
    }

    private void Record(string key, PostalCodeLookupOutcome outcome)
    {
        lock (gate)
        {
            var now = time.GetUtcNow();
            if (outcome.Status == PostalCodeLookupStatus.Unavailable)
            {
                breaker.Failed();
                return;
            }

            breaker.Succeeded();
            if (cache.Count >= MaxEntries)
            {
                foreach (var expired in cache.Where(entry => entry.Value.Expires <= now).Select(entry => entry.Key).ToList())
                {
                    cache.Remove(expired);
                }

                if (cache.Count >= MaxEntries)
                {
                    cache.Remove(cache.MinBy(entry => entry.Value.Expires).Key);
                }
            }

            var lifetime = outcome.Status == PostalCodeLookupStatus.Found ? FoundLifetime : NotFoundLifetime;
            cache[key] = (outcome, now + lifetime);
        }
    }
}
