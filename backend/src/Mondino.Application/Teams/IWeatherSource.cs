using System.Text.Json.Serialization;
using Mondino.Domain.Teams;

namespace Mondino.Application.Teams;

/// <summary>
/// The weather source: Open-Meteo, behind a 5-second timeout and a 15-minute cache
/// (docs/adr/0015). It is given a position and nothing about a teammate, and answers the weather
/// there, or null when it has none.
/// </summary>
public interface IWeatherSource
{
    Task<Weather?> GetCurrentAsync(Position position, CancellationToken cancellationToken);
}

/// <summary>
/// The weather at a pin's city, or at the city a postal code was found in: the temperature in °C
/// only, the condition as the web app names it ("partly-cloudy"), and when it was observed.
/// </summary>
public sealed record WeatherDto(double TemperatureC, string Condition, DateTimeOffset ObservedAt)
{
    public static WeatherDto? From(Weather? weather) =>
        weather is null ? null : new(weather.TemperatureC, NameOf(weather.Condition), weather.ObservedAt);

    private static string NameOf(WeatherCondition condition) => condition switch
    {
        WeatherCondition.Clear => "clear",
        WeatherCondition.PartlyCloudy => "partly-cloudy",
        WeatherCondition.Cloudy => "cloudy",
        WeatherCondition.Rain => "rain",
        WeatherCondition.Showers => "showers",
        WeatherCondition.Storm => "storm",
        WeatherCondition.Fog => "fog",
        WeatherCondition.Wind => "wind",
        _ => "cloudy",
    };
}

/// <summary>Whether a pin's weather is there, could not be had, or is not shared with the viewer.</summary>
[JsonConverter(typeof(JsonStringEnumConverter<WeatherState>))]
public enum WeatherState
{
    Available,
    Unavailable,
    NotShared,
}

/// <summary>How the cities are told apart when weather is asked for: a position rounded to two decimal places.</summary>
public static class WeatherPlaces
{
    public static Position Of(double latitude, double longitude) =>
        new(Math.Round(latitude, 2), Math.Round(longitude, 2));
}
