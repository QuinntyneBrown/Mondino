using Mondino.Application.Teams;
using Mondino.Domain.Teams;
using Reading = Mondino.Domain.Teams.Weather;

namespace Mondino.Tests.Support;

/// <summary>
/// The weather source, answering as the test tells it: a reading at a city's position (rounded to
/// two decimals, as the cities are told apart), one reading for everywhere else, or nothing. It
/// records every position it was asked for.
/// </summary>
public sealed class FakeWeatherSource : IWeatherSource
{
    private readonly Dictionary<(double, double), Reading?> readings = [];
    private readonly List<Position> asked = [];
    private Reading? everywhere;

    public IReadOnlyList<Position> Asked
    {
        get
        {
            lock (asked)
            {
                return [.. asked];
            }
        }
    }

    public void Reports(double latitude, double longitude, double temperatureC, WeatherCondition condition) =>
        readings[(latitude, longitude)] = new(temperatureC, condition, MondinoApi.Now);

    public void ReportsEverywhere(double temperatureC, WeatherCondition condition) =>
        everywhere = new(temperatureC, condition, MondinoApi.Now);

    public void HasNothingAt(double latitude, double longitude) => readings[(latitude, longitude)] = null;

    public Task<Reading?> GetCurrentAsync(Position position, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(position);
        lock (asked)
        {
            asked.Add(position);
        }

        var key = (Math.Round(position.Latitude, 2), Math.Round(position.Longitude, 2));
        return Task.FromResult(readings.TryGetValue(key, out var reading) ? reading : everywhere);
    }
}
