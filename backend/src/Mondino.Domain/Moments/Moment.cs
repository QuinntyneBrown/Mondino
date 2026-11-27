namespace Mondino.Domain.Moments;

/// <summary>
/// Something happening where a teammate lives (L2-020): its kind, a title, a date local to its
/// place, one line of detail, and the key of an emblem Mondino holds the right to show, or none
/// (docs/adr/0019). The title and the detail come from a calendar and are data, never markup.
/// </summary>
public sealed record Moment(MomentKind Kind, string Title, DateOnly Date, string Detail, string? EmblemKey)
{
    public const int TitleLimit = 80;
    public const int DetailLimit = 160;

    /// <summary>A moment with its title cut to 80 characters and its detail to 160, each ending in an ellipsis when cut.</summary>
    public static Moment Create(MomentKind kind, string title, DateOnly date, string detail, string? emblemKey) =>
        new(kind, Cut(title, TitleLimit), date, Cut(detail, DetailLimit), emblemKey);

    private static string Cut(string text, int limit)
    {
        var trimmed = (text ?? string.Empty).Trim();
        return trimmed.Length <= limit ? trimmed : string.Concat(trimmed.AsSpan(0, limit - 1).TrimEnd(), "…");
    }
}
