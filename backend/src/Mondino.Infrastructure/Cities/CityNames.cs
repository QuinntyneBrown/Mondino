using System.Text;

namespace Mondino.Infrastructure.Cities;

/// <summary>
/// How two names of a place are compared: accents, case and punctuation set aside. The API runs in
/// invariant globalization mode, where Unicode normalisation does not separate accents, so the
/// Latin letters with accents the thirteen countries use are folded from a table.
/// </summary>
internal static class CityNames
{
    private static readonly Dictionary<char, string> Folds = BuildFolds();

    /// <summary>"São Paulo" and "sao paulo" fold to "sao paulo"; "Saint-Laurent" to "saint laurent".</summary>
    public static string Fold(string name)
    {
        ArgumentNullException.ThrowIfNull(name);
        var builder = new StringBuilder(name.Length);
        foreach (var c in name.Trim())
        {
            var lower = char.ToLowerInvariant(c);
            if (Folds.TryGetValue(lower, out var folded))
            {
                builder.Append(folded);
            }
            else if (char.IsLetterOrDigit(lower))
            {
                builder.Append(lower);
            }
            else if (builder.Length > 0 && builder[^1] != ' ')
            {
                builder.Append(' ');
            }
        }

        return builder.ToString().TrimEnd();
    }

    private static Dictionary<char, string> BuildFolds()
    {
        var folds = new Dictionary<char, string>();
        foreach (var (letters, plain) in new[]
                 {
                     ("àáâãäåāăą", "a"), ("çćĉċč", "c"), ("ďđ", "d"), ("èéêëēĕėęě", "e"), ("ĝğġģ", "g"),
                     ("ĥħ", "h"), ("ìíîïĩīĭįı", "i"), ("ĵ", "j"), ("ķ", "k"), ("ĺļľŀł", "l"),
                     ("ñńņňŉ", "n"), ("òóôõöøōŏő", "o"), ("ŕŗř", "r"), ("śŝşšș", "s"), ("ţťŧț", "t"),
                     ("ùúûüũūŭůűų", "u"), ("ŵ", "w"), ("ýÿŷ", "y"), ("źżž", "z"),
                     ("ß", "ss"), ("æ", "ae"), ("œ", "oe"), ("þ", "th"), ("ð", "d"),
                     ("’'", ""),
                 })
        {
            foreach (var letter in letters)
            {
                folds[letter] = plain;
            }
        }

        return folds;
    }
}
