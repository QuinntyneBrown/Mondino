namespace Mondino.Infrastructure.PostalCodes;

/// <summary>The postal code source's settings, <c>PostalCodeSource:*</c> (docs/adr/0006).</summary>
public sealed class PostalCodeSourceOptions
{
    public const string Section = "PostalCodeSource";

    /// <summary>The GeoNames account. Without it every lookup is <c>Unavailable</c> and Join offers "Your city".</summary>
    public string? Username { get; set; }

    public Uri BaseAddress { get; set; } = new("https://secure.geonames.org/");
}
