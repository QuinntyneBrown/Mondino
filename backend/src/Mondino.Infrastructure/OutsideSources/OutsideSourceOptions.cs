namespace Mondino.Infrastructure.OutsideSources;

/// <summary>
/// The breaker every outside source has, <c>OutsideSources:*</c> (docs/adr/0026): each source
/// counts its own failures with these values.
/// </summary>
public sealed class OutsideSourceOptions
{
    public const string Section = "OutsideSources";

    /// <summary>Failures in a row after which a source is left alone.</summary>
    public int FailuresToOpen { get; set; } = 5;

    /// <summary>How long a source whose breaker opened is left alone before it is asked again.</summary>
    public TimeSpan BreakerOpenFor { get; set; } = TimeSpan.FromSeconds(30);
}
