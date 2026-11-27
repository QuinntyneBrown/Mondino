using System.Text.Json.Serialization;
using Mondino.Application.Moments;
using Mondino.Domain.Teams;

namespace Mondino.Application.Teammates;

/// <summary>
/// A teammate's own settings as Profile &amp; Settings reads them (docs/adr/0023). Only their own
/// teammate receives them: another teammate's read carries their effect, never the switches.
/// </summary>
public sealed record SettingsDto(
    TemperatureUnitName TemperatureUnit,
    ClockFormatName ClockFormat,
    IReadOnlyList<MomentKindName> MomentKinds,
    bool SharesWeather,
    bool SharesStatus)
{
    public static SettingsDto From(TeammateSettings settings) => new(
        (TemperatureUnitName)settings.TemperatureUnit,
        (ClockFormatName)settings.ClockFormat,
        settings.MomentKinds.Select(kind => (MomentKindName)kind).ToList(),
        settings.SharesWeather,
        settings.SharesStatus);
}

/// <summary>
/// The settings as a save sends them, the whole set. A field left out is null and refused; a word
/// outside the lists does not bind.
/// </summary>
public sealed record SettingsUpdate(
    TemperatureUnitName? TemperatureUnit,
    ClockFormatName? ClockFormat,
    IReadOnlyList<MomentKindName>? MomentKinds,
    bool? SharesWeather,
    bool? SharesStatus)
{
    /// <summary>Only the type: what a teammate sent is never written to a log (L2-051).</summary>
    public override string ToString() => nameof(SettingsUpdate);
}

/// <summary>A unit as the web app names it: <c>celsius</c>, <c>fahrenheit</c>.</summary>
[JsonConverter(typeof(JsonStringEnumConverter<TemperatureUnitName>))]
public enum TemperatureUnitName
{
    [JsonStringEnumMemberName("celsius")]
    Celsius = TemperatureUnit.Celsius,

    [JsonStringEnumMemberName("fahrenheit")]
    Fahrenheit = TemperatureUnit.Fahrenheit,
}

/// <summary>A clock as the web app names it: <c>24-hour</c>, <c>12-hour</c>.</summary>
[JsonConverter(typeof(JsonStringEnumConverter<ClockFormatName>))]
public enum ClockFormatName
{
    [JsonStringEnumMemberName("24-hour")]
    TwentyFourHour = ClockFormat.TwentyFourHour,

    [JsonStringEnumMemberName("12-hour")]
    TwelveHour = ClockFormat.TwelveHour,
}
