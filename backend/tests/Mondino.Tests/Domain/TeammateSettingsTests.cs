// Traces to: L2-019, L2-033, L2-034, L2-022
// Description: A new teammate's settings start from their country, one case per row

using Mondino.Domain.Moments;
using Mondino.Domain.Teams;

namespace Mondino.Tests.Domain;

public sealed class TeammateSettingsTests
{
    [Theory]
    [InlineData("US", TemperatureUnit.Fahrenheit, ClockFormat.TwelveHour)]
    [InlineData("CA", TemperatureUnit.Celsius, ClockFormat.TwelveHour)]
    [InlineData("IT", TemperatureUnit.Celsius, ClockFormat.TwentyFourHour)]
    [InlineData("MX", TemperatureUnit.Celsius, ClockFormat.TwentyFourHour)]
    [InlineData("GB", TemperatureUnit.Celsius, ClockFormat.TwentyFourHour)]
    public void A_new_teammates_unit_and_clock_follow_their_country(string countryCode, TemperatureUnit unit, ClockFormat clock)
    {
        var settings = TeammateSettings.DefaultsFor(countryCode);

        Assert.Equal(unit, settings.TemperatureUnit);
        Assert.Equal(clock, settings.ClockFormat);
        Assert.Equal([MomentKind.Holiday, MomentKind.Formula1, MomentKind.LocalEvent, MomentKind.Sport], settings.MomentKinds);
        Assert.True(settings.SharesWeather);
        Assert.True(settings.SharesStatus);
    }
}
