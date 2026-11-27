using Mondino.Domain.Teams;

namespace Mondino.Application.Teams;

/// <summary>
/// Turns the weather source's WMO weather code into one of the eight conditions, so there is
/// always an icon and a word to show (L2-018). A code outside the table is <c>Cloudy</c>. The codes
/// hold none for wind: a dry sky with a wind of 39 km/h or more is <c>Wind</c> (docs/adr/0015).
/// </summary>
public static class WeatherConditionMapper
{
    /// <summary>Beaufort force 6, a strong breeze, at 10 m.</summary>
    public const double WindyFromKmh = 39;

    public static WeatherCondition Map(int weatherCode, double windSpeedKmh)
    {
        var condition = weatherCode switch
        {
            0 or 1 => WeatherCondition.Clear,
            2 => WeatherCondition.PartlyCloudy,
            3 => WeatherCondition.Cloudy,
            45 or 48 => WeatherCondition.Fog,
            >= 51 and <= 57 => WeatherCondition.Rain,
            >= 61 and <= 67 => WeatherCondition.Rain,
            >= 71 and <= 77 => WeatherCondition.Rain,
            >= 80 and <= 82 => WeatherCondition.Showers,
            85 or 86 => WeatherCondition.Showers,
            >= 95 and <= 99 => WeatherCondition.Storm,
            _ => WeatherCondition.Cloudy,
        };
        var dry = condition is WeatherCondition.Clear or WeatherCondition.PartlyCloudy or WeatherCondition.Cloudy;
        return dry && windSpeedKmh >= WindyFromKmh ? WeatherCondition.Wind : condition;
    }
}
