namespace Mondino.Infrastructure.OutsideSources;

/// <summary>How a call to an outside source ended (L2-051, docs/adr/0031).</summary>
public enum SourceOutcome
{
    /// <summary>The source answered, whether or not it knew what it was asked.</summary>
    Success,

    /// <summary>The source answered with an error, or with something that could not be used.</summary>
    Failure,

    /// <summary>The source did not answer within its 5 seconds.</summary>
    Timeout,

    /// <summary>The source was not called: its breaker had left it alone (docs/adr/0026).</summary>
    CircuitOpen,
}
