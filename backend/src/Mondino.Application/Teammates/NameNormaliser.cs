namespace Mondino.Application.Teammates;

/// <summary>A name as it is stored: control characters removed and the ends trimmed (L2-044).</summary>
public static class NameNormaliser
{
    public static string Normalise(string? name) =>
        name is null ? string.Empty : string.Concat(name.Where(c => !char.IsControl(c))).Trim();
}
