// Traces to: L2-018
// Description: Each WMO weather code maps to one of the eight conditions, by the table in weather/show-weather; a strong wind makes a dry sky windy

using Mondino.Application.Teams;
using Mondino.Domain.Teams;

namespace Mondino.Tests.Weather;

public sealed class WeatherConditionMapperTests
{
    [Theory]
    [InlineData(0, WeatherCondition.Clear)]
    [InlineData(1, WeatherCondition.Clear)]
    [InlineData(2, WeatherCondition.PartlyCloudy)]
    [InlineData(3, WeatherCondition.Cloudy)]
    [InlineData(45, WeatherCondition.Fog)]
    [InlineData(48, WeatherCondition.Fog)]
    [InlineData(51, WeatherCondition.Rain)]
    [InlineData(57, WeatherCondition.Rain)]
    [InlineData(61, WeatherCondition.Rain)]
    [InlineData(67, WeatherCondition.Rain)]
    [InlineData(71, WeatherCondition.Rain)]
    [InlineData(77, WeatherCondition.Rain)]
    [InlineData(80, WeatherCondition.Showers)]
    [InlineData(82, WeatherCondition.Showers)]
    [InlineData(85, WeatherCondition.Showers)]
    [InlineData(86, WeatherCondition.Showers)]
    [InlineData(95, WeatherCondition.Storm)]
    [InlineData(99, WeatherCondition.Storm)]
    [InlineData(4, WeatherCondition.Cloudy)]
    [InlineData(-1, WeatherCondition.Cloudy)]
    [InlineData(100, WeatherCondition.Cloudy)]
    public void Each_code_maps_to_its_condition(int code, WeatherCondition condition) =>
        Assert.Equal(condition, WeatherConditionMapper.Map(code, windSpeedKmh: 10));

    [Theory]
    [InlineData(0, 39, WeatherCondition.Wind)]
    [InlineData(2, 50, WeatherCondition.Wind)]
    [InlineData(3, 39, WeatherCondition.Wind)]
    [InlineData(0, 38.9, WeatherCondition.Clear)]
    [InlineData(61, 60, WeatherCondition.Rain)]
    [InlineData(95, 60, WeatherCondition.Storm)]
    [InlineData(45, 60, WeatherCondition.Fog)]
    public void A_wind_of_39_kmh_or_more_makes_a_dry_sky_windy(int code, double wind, WeatherCondition condition) =>
        Assert.Equal(condition, WeatherConditionMapper.Map(code, wind));
}
