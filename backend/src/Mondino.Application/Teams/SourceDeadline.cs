using Mondino.Domain.Teams;

namespace Mondino.Application.Teams;

/// <summary>
/// One limit of 6 seconds for the outside sources a request asks one after another (L2-049,
/// docs/adr/0026): started before the postal code lookup, it is what the weather at the city found
/// may still wait. When it runs out the answer has no weather. Time comes from
/// <see cref="TimeProvider"/>.
/// </summary>
public sealed class SourceDeadline : IDisposable
{
    public static readonly TimeSpan Limit = TimeSpan.FromSeconds(6);

    private readonly CancellationTokenSource limit;
    private readonly CancellationTokenSource linked;
    private readonly CancellationToken request;

    public SourceDeadline(TimeProvider time, CancellationToken request)
    {
        this.request = request;
        limit = new CancellationTokenSource(Limit, time);
        linked = CancellationTokenSource.CreateLinkedTokenSource(request, limit.Token);
    }

    /// <summary>The weather at a place, or none once the limit is reached.</summary>
    public async Task<Weather?> WeatherAtAsync(IWeatherSource source, Position place)
    {
        ArgumentNullException.ThrowIfNull(source);
        try
        {
            return await source.GetCurrentAsync(place, linked.Token);
        }
        catch (OperationCanceledException) when (!request.IsCancellationRequested)
        {
            return null;
        }
    }

    public void Dispose()
    {
        linked.Dispose();
        limit.Dispose();
    }
}
