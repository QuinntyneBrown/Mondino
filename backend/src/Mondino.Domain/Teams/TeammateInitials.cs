using System.Globalization;

namespace Mondino.Domain.Teams;

/// <summary>A teammate's initials: the first character of up to the first two words of the name.</summary>
public static class TeammateInitials
{
    public static string Of(string name)
    {
        ArgumentNullException.ThrowIfNull(name);
        var words = name.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
        return string.Concat(words.Take(2).Select(word =>
            StringInfo.GetNextTextElement(word).ToUpper(CultureInfo.InvariantCulture)));
    }
}
