namespace Mondino.Domain.Teams;

/// <summary>
/// A work email, trimmed and lower-cased: where a teammate's sign-in links are sent. It is never
/// stored; a teammate keeps only its fingerprint (docs/adr/0009).
/// </summary>
public sealed record EmailAddress
{
    /// <summary>The most characters an address may have.</summary>
    public const int MaxLength = 254;

    private EmailAddress(string value) => Value = value;

    public string Value { get; }

    /// <summary>
    /// Reads an address in the form <c>local@domain.tld</c>: one <c>@</c>, something on each side,
    /// a dot inside the domain and no space, in at most 254 characters once trimmed.
    /// </summary>
    public static bool TryParse(string? text, out EmailAddress? email)
    {
        email = null;
        var value = text?.Trim().ToLowerInvariant() ?? string.Empty;
        var at = value.IndexOf('@', StringComparison.Ordinal);
        if (value.Length is 0 or > MaxLength
            || at <= 0
            || at != value.LastIndexOf('@')
            || value.Any(char.IsWhiteSpace))
        {
            return false;
        }

        var domain = value[(at + 1)..];
        var dot = domain.IndexOf('.', StringComparison.Ordinal);
        if (dot <= 0 || domain.EndsWith('.'))
        {
            return false;
        }

        email = new EmailAddress(value);
        return true;
    }

    public override string ToString() => Value;
}
