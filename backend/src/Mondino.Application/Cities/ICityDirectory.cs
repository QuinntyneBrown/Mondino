namespace Mondino.Application.Cities;

/// <summary>The cities Mondino holds itself, for the thirteen supported countries (docs/adr/0006).</summary>
public interface ICityDirectory
{
    /// <summary>
    /// The cities of the country whose names start with <paramref name="text"/>, accents and case
    /// ignored, largest first, at most <paramref name="max"/>.
    /// </summary>
    IReadOnlyList<KnownCity> Search(string countryCode, string text, int max);

    /// <summary>One city by its id, or null.</summary>
    KnownCity? Find(string cityId);

    /// <summary>Every city of one country.</summary>
    IReadOnlyList<KnownCity> InCountry(string countryCode);
}
