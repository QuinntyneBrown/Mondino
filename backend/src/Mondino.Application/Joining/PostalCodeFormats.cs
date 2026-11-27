using System.Diagnostics.CodeAnalysis;
using System.Globalization;
using System.Text.RegularExpressions;

namespace Mondino.Application.Joining;

/// <summary>
/// The form one country's postal codes take: the pattern a normalised postal code fits (spaces and
/// hyphens removed, letters upper-cased), its canonical spelling, the part the source is given,
/// and the sentence that tells a person the form, with an example.
/// </summary>
public sealed class PostalCodeFormat(
    string countryCode,
    string countryName,
    string nameInText,
    string pattern,
    string form,
    Func<string, string>? canonical = null,
    Func<string, string>? forSource = null)
{
    private readonly Regex regex = new(pattern, RegexOptions.CultureInvariant, TimeSpan.FromMilliseconds(100));
    private readonly Func<string, string> canonical = canonical ?? (value => value);
    private readonly Func<string, string> forSource = forSource ?? (value => value);

    /// <summary>ISO 3166-1 alpha-2: "IT".</summary>
    public string CountryCode { get; } = countryCode;

    public string CountryName { get; } = countryName;

    /// <summary>The name as a sentence uses it: "the United States".</summary>
    public string NameInText { get; } = nameInText;

    /// <summary>"Italian postal codes have five digits, like 20121."</summary>
    public string Form { get; } = form;

    internal bool TryNormalise(string typed, [NotNullWhen(true)] out PostalCode? postalCode)
    {
        var normalised = string.Concat(typed.Where(c => c is not (' ' or '-' or '\t')))
            .ToUpper(CultureInfo.InvariantCulture);
        if (!regex.IsMatch(normalised))
        {
            postalCode = null;
            return false;
        }

        var value = canonical(normalised);
        postalCode = new PostalCode(CountryCode, value, forSource(value));
        return true;
    }
}

/// <summary>
/// The supported countries and the form of each one's postal codes, in alphabetical order of their
/// names. A postal code is checked against its country's form before any source is asked (L2-004).
/// </summary>
public static class PostalCodeFormats
{
    public static IReadOnlyList<PostalCodeFormat> All { get; } =
    [
        new("AU", "Australia", "Australia", @"^\d{4}$", "Australian postal codes have four digits, like 2000."),
        new("BR", "Brazil", "Brazil", @"^\d{8}$", "Brazilian postal codes have eight digits, like 01310-100.",
            canonical: value => $"{value[..5]}-{value[5..]}"),
        new("CA", "Canada", "Canada", @"^[ABCEGHJ-NPRSTVXY]\d[ABCEGHJ-NPRSTV-Z]\d[ABCEGHJ-NPRSTV-Z]\d$",
            "Canadian postal codes look like A1A 1A1.",
            canonical: value => $"{value[..3]} {value[3..]}",
            forSource: value => value[..3]),
        new("DE", "Germany", "Germany", @"^\d{5}$", "German postal codes have five digits, like 10115."),
        new("GH", "Ghana", "Ghana", @"^[A-Z]{2}\d{3,4}$",
            "Ghanaian postal codes are two letters and three or four digits, like GA543."),
        new("IN", "India", "India", @"^[1-9]\d{5}$", "Indian PIN codes have six digits, like 560001."),
        new("IE", "Ireland", "Ireland", @"^(?:[AC-FHKNPRTV-Y]\d{2}|D6W)[0-9AC-FHKNPRTV-Y]{4}$",
            "Irish Eircodes look like D02 X285.",
            canonical: value => $"{value[..3]} {value[3..]}",
            forSource: value => value[..3]),
        new("IT", "Italy", "Italy", @"^\d{5}$", "Italian postal codes have five digits, like 20121."),
        new("JP", "Japan", "Japan", @"^\d{7}$", "Japanese postal codes have seven digits, like 100-0001.",
            canonical: value => $"{value[..3]}-{value[3..]}"),
        new("MX", "Mexico", "Mexico", @"^\d{5}$", "Mexican postal codes have five digits, like 06000."),
        new("SE", "Sweden", "Sweden", @"^\d{5}$", "Swedish postal codes have five digits, like 111 22.",
            canonical: value => $"{value[..3]} {value[3..]}"),
        new("AE", "United Arab Emirates", "the United Arab Emirates", @"^\d{1,6}$",
            "UAE addresses use a P.O. Box number of up to six digits, like 12345."),
        new("US", "United States", "the United States", @"^\d{5}(?:\d{4})?$",
            "US ZIP codes have five digits, like 78701.",
            canonical: value => value.Length == 9 ? $"{value[..5]}-{value[5..]}" : value,
            forSource: value => value[..5]),
    ];

    public static PostalCodeFormat? Find(string? countryCode) =>
        All.FirstOrDefault(format => format.CountryCode == countryCode);

    /// <summary>
    /// The postal code in its country's canonical spelling when it fits the country's form:
    /// "l5b3c1" and "L5B 3C1" are both "L5B 3C1".
    /// </summary>
    public static bool TryNormalise(string countryCode, string typed, [NotNullWhen(true)] out PostalCode? postalCode)
    {
        ArgumentNullException.ThrowIfNull(typed);
        var format = Find(countryCode);
        if (format is null)
        {
            postalCode = null;
            return false;
        }

        return format.TryNormalise(typed, out postalCode);
    }
}
