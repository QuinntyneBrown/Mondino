using Microsoft.Extensions.Options;

namespace Mondino.Infrastructure.OutsideSources;

/// <summary>
/// One outside source's circuit breaker (docs/adr/0026, L2-049): after
/// <see cref="OutsideSourceOptions.FailuresToOpen"/> failures in a row it is open for
/// <see cref="OutsideSourceOptions.BreakerOpenFor"/>, and the source is not called meanwhile; one
/// success closes the count. Time comes from <see cref="TimeProvider"/>. Each source's decorator
/// holds its own, so one failing source never stops another.
/// </summary>
internal sealed class SourceBreaker(IOptions<OutsideSourceOptions> options, TimeProvider time)
{
    private readonly Lock gate = new();
    private int failures;
    private DateTimeOffset openUntil = DateTimeOffset.MinValue;

    /// <summary>Whether the source is left alone now.</summary>
    public bool IsOpen
    {
        get
        {
            lock (gate)
            {
                return time.GetUtcNow() < openUntil;
            }
        }
    }

    public void Succeeded()
    {
        lock (gate)
        {
            failures = 0;
        }
    }

    public void Failed()
    {
        lock (gate)
        {
            if (++failures >= Math.Max(1, options.Value.FailuresToOpen))
            {
                openUntil = time.GetUtcNow() + options.Value.BreakerOpenFor;
                failures = 0;
            }
        }
    }
}
