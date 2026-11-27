using System.Globalization;
using System.Net.Http.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using Mondino.Application.Teams;
using Mondino.Domain.Teams;

namespace Mondino.Infrastructure.WeatherSource;

/// <summary>
/// The weather source: Open-Meteo's forecast API (docs/adr/0015). It is given a position, rounded
/// to two decimal places, and nothing else about a teammate (L2-050), and asked for the current
/// temperature, WMO weather code and wind, which <see cref="WeatherConditionMapper"/> turns into
/// one of the eight conditions. No answer, an error, a status other than 200 or an answer without
/// a temperature or a code is no weather.
/// </summary>
internal sealed class OpenMeteoWeatherSource(IHttpClientFactory clients, IOptions<WeatherSourceOptions> options)
    : IWeatherSource
{
    public const string ClientName = "weather-source";

    public async Task<Weather?> GetCurrentAsync(Position position, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(position);
        var place = WeatherPlaces.Of(position.Latitude, position.Longitude);
        var key = options.Value.ApiKey;
        var address = new Uri(
            options.Value.BaseAddress,
            "v1/forecast"
            + $"?latitude={place.Latitude.ToString(CultureInfo.InvariantCulture)}"
            + $"&longitude={place.Longitude.ToString(CultureInfo.InvariantCulture)}"
            + "&current=temperature_2m,weather_code,wind_speed_10m"
            + (string.IsNullOrWhiteSpace(key) ? string.Empty : $"&apikey={Uri.EscapeDataString(key)}"));

        Answer? answer;
        try
        {
            using var response = await clients.CreateClient(ClientName).GetAsync(address, cancellationToken);
            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            answer = await response.Content.ReadFromJsonAsync<Answer>(cancellationToken);
        }
        catch (Exception exception) when (exception is HttpRequestException or System.Text.Json.JsonException
                                              or NotSupportedException)
        {
            return null;
        }

        var current = answer?.Current;
        if (current?.Temperature is not { } temperature || current.WeatherCode is not { } code)
        {
            return null;
        }

        var observedAt = DateTime.TryParse(
            current.Time, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var time)
            ? new DateTimeOffset(time, TimeSpan.Zero)
            : DateTimeOffset.MinValue;
        return new Weather(temperature, WeatherConditionMapper.Map(code, current.WindSpeed ?? 0), observedAt);
    }

    private sealed record Answer([property: JsonPropertyName("current")] Current? Current);

    private sealed record Current(
        [property: JsonPropertyName("time")] string? Time,
        [property: JsonPropertyName("temperature_2m")] double? Temperature,
        [property: JsonPropertyName("weather_code")] int? WeatherCode,
        [property: JsonPropertyName("wind_speed_10m")] double? WindSpeed);
}
