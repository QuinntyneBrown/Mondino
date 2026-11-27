using System.Globalization;
using Mondino.Domain.Teams;

namespace Mondino.Application.Joining;

/// <summary>
/// The colour of a new teammate's pin: the teammate colour of the palette (<c>teammate-1</c> to
/// <c>teammate-13</c>) the fewest teammates of the team have, the lowest number first.
/// </summary>
public static class PinColourPicker
{
    public const int Colours = 13;

    public static string Pick(Team team)
    {
        ArgumentNullException.ThrowIfNull(team);
        var used = team.Teammates.GroupBy(t => t.Colour).ToDictionary(g => g.Key, g => g.Count());
        return Enumerable.Range(1, Colours)
            .Select(n => string.Create(CultureInfo.InvariantCulture, $"teammate-{n}"))
            .OrderBy(colour => used.GetValueOrDefault(colour))
            .First();
    }
}
