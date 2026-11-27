using Mondino.Domain.Moments;

namespace Mondino.Domain.Teams;

/// <summary>The unit a teammate reads temperatures in (L2-019).</summary>
public enum TemperatureUnit
{
    Celsius,
    Fahrenheit,
}

/// <summary>The clock a teammate reads times on (L2-033).</summary>
public enum ClockFormat
{
    TwentyFourHour,
    TwelveHour,
}

/// <summary>
/// A teammate's settings, chosen on Profile &amp; Settings (docs/adr/0023): how temperatures and times
/// are shown to them (L2-019, L2-033), which kinds of moment mark pins for them (L2-022), and what
/// their teammates see of them (L2-034). The kinds are kept in their fixed order, each once.
/// </summary>
public sealed record TeammateSettings
{
    /// <summary>The four kinds, in the order Profile &amp; Settings lists their switches.</summary>
    public static readonly IReadOnlyList<MomentKind> AllKinds =
        [MomentKind.Holiday, MomentKind.Formula1, MomentKind.LocalEvent, MomentKind.Sport];

    public TeammateSettings(
        TemperatureUnit temperatureUnit,
        ClockFormat clockFormat,
        IEnumerable<MomentKind> momentKinds,
        bool sharesWeather,
        bool sharesStatus)
    {
        ArgumentNullException.ThrowIfNull(momentKinds);
        var kinds = momentKinds.ToHashSet();
        TemperatureUnit = temperatureUnit;
        ClockFormat = clockFormat;
        MomentKinds = AllKinds.Where(kinds.Contains).ToList();
        SharesWeather = sharesWeather;
        SharesStatus = sharesStatus;
    }

    public TemperatureUnit TemperatureUnit { get; }

    public ClockFormat ClockFormat { get; }

    public IReadOnlyList<MomentKind> MomentKinds { get; }

    /// <summary>"Share my local weather": off, teammates are shown no weather for them.</summary>
    public bool SharesWeather { get; }

    /// <summary>"Share whether I’m working or asleep": off, teammates are shown no status for them.</summary>
    public bool SharesStatus { get; }

    /// <summary>
    /// A new teammate's settings: °F in the United States and °C elsewhere, the 12-hour clock in the
    /// United States and Canada and the 24-hour clock elsewhere, every kind on and both switches on.
    /// </summary>
    public static TeammateSettings DefaultsFor(string countryCode) => new(
        countryCode == "US" ? TemperatureUnit.Fahrenheit : TemperatureUnit.Celsius,
        countryCode is "US" or "CA" ? ClockFormat.TwelveHour : ClockFormat.TwentyFourHour,
        AllKinds,
        sharesWeather: true,
        sharesStatus: true);

    public bool Equals(TeammateSettings? other) =>
        other is not null
        && TemperatureUnit == other.TemperatureUnit
        && ClockFormat == other.ClockFormat
        && MomentKinds.SequenceEqual(other.MomentKinds)
        && SharesWeather == other.SharesWeather
        && SharesStatus == other.SharesStatus;

    public override int GetHashCode() =>
        HashCode.Combine(TemperatureUnit, ClockFormat, MomentKinds.Count, SharesWeather, SharesStatus);
}
