namespace Mondino.Application.Moments;

/// <summary>
/// The emblems Mondino holds the right to show: a team's or a series' own logo, by the subject a
/// calendar entry is about (L2-021). Mondino holds none (docs/adr/0019), so every moment shows
/// Mondino's own icon for its kind. A right is added here only once it is recorded in an ADR.
/// </summary>
public sealed class EmblemCatalogue
{
    private readonly Dictionary<string, string> held = new(StringComparer.OrdinalIgnoreCase);

    public string? KeyFor(string? subject) =>
        subject is not null && held.TryGetValue(subject, out var key) ? key : null;
}
