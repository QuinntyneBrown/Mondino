namespace Mondino.Domain.Teams;

/// <summary>
/// The weather at a city now (L2-018): the temperature, held in °C only, since °F is a matter of
/// display (L2-019), one of the eight conditions, and when it was observed.
/// </summary>
public sealed record Weather(double TemperatureC, WeatherCondition Condition, DateTimeOffset ObservedAt);

/// <summary>The eight conditions a pin can show, each an icon with its word (L2-018).</summary>
public enum WeatherCondition
{
    Clear,
    PartlyCloudy,
    Cloudy,
    Rain,
    Showers,
    Storm,
    Fog,
    Wind,
}
