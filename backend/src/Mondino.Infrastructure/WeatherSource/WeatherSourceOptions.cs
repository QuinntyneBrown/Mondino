namespace Mondino.Infrastructure.WeatherSource;

/// <summary>The weather source's settings, <c>WeatherSource:*</c> (docs/adr/0015).</summary>
public sealed class WeatherSourceOptions
{
    public const string Section = "WeatherSource";

    /// <summary>Open-Meteo's API; a commercial subscription uses <c>https://customer-api.open-meteo.com/</c>.</summary>
    public Uri BaseAddress { get; set; } = new("https://api.open-meteo.com/");

    /// <summary>A commercial subscription's key, sent as <c>apikey</c>; none for the free API.</summary>
    public string? ApiKey { get; set; }
}
