using Mondino.Domain.Moments;

namespace Mondino.Domain.Teams;

/// <summary>Someone in a team, with their pin at their city.</summary>
public sealed class Teammate
{
    private Teammate()
    {
        Name = string.Empty;
        Colour = string.Empty;
        City = null!;
        MomentKinds = TeammateSettings.AllKinds;
    }

    internal Teammate(
        Guid id,
        Guid teamId,
        string name,
        string colour,
        City city,
        DateTimeOffset joinedAt,
        string? postalCode = null,
        Guid? joinRequestId = null)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(colour);
        ArgumentNullException.ThrowIfNull(city);
        Id = id;
        TeamId = teamId;
        Name = name;
        Colour = colour;
        City = city;
        CityId = city.Id;
        JoinedAt = joinedAt;
        PostalCode = postalCode;
        JoinRequestId = joinRequestId;
        MomentKinds = TeammateSettings.AllKinds;
        ChangeSettings(TeammateSettings.DefaultsFor(city.CountryCode));
    }

    public Guid Id { get; private set; }

    public Guid TeamId { get; private set; }

    public string Name { get; private set; }

    /// <summary>The teammate's colour: a teammate colour of the palette, <c>teammate-1</c> to <c>teammate-13</c>.</summary>
    public string Colour { get; private set; }

    public Guid CityId { get; private set; }

    public City City { get; private set; }

    public DateTimeOffset JoinedAt { get; private set; }

    /// <summary>
    /// The postal code the pin was placed from, in its country's canonical spelling. It is the
    /// teammate's own and is returned to no one else. A teammate placed through "Your city" has none.
    /// </summary>
    public string? PostalCode { get; private set; }

    /// <summary>
    /// A keyed fingerprint of the teammate's work email, by which a sign-in request recognises them.
    /// The address itself is kept nowhere (docs/adr/0009). Only a teammate who made a team has one.
    /// </summary>
    public string? EmailFingerprint { get; private set; }

    public void SetEmailFingerprint(string fingerprint)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(fingerprint);
        EmailFingerprint = fingerprint;
    }

    /// <summary>The unit the teammate reads temperatures in (L2-019).</summary>
    public TemperatureUnit TemperatureUnit { get; private set; }

    /// <summary>The clock the teammate reads times on (L2-033).</summary>
    public ClockFormat ClockFormat { get; private set; }

    /// <summary>The kinds of moment that mark pins for the teammate (L2-022), in their fixed order.</summary>
    public IReadOnlyList<MomentKind> MomentKinds { get; private set; }

    /// <summary>
    /// Whether the teammate shares if they are working or asleep ("Share whether I’m working or
    /// asleep", L2-015, L2-034): on to begin with. Off, their teammates are shown no status for them.
    /// </summary>
    public bool SharesStatus { get; private set; } = true;

    /// <summary>
    /// Whether the teammate shares their weather ("Share my local weather", L2-011, L2-034): on to
    /// begin with. Off, their teammates are shown no weather for them (docs/adr/0015).
    /// </summary>
    public bool SharesWeather { get; private set; } = true;

    /// <summary>The teammate's settings as one value (docs/adr/0023); a new teammate's follow their country.</summary>
    public TeammateSettings Settings => new(TemperatureUnit, ClockFormat, MomentKinds, SharesWeather, SharesStatus);

    /// <summary>Replaces the teammate's settings whole, as Profile &amp; Settings saves them (L2-035).</summary>
    public void ChangeSettings(TeammateSettings settings)
    {
        ArgumentNullException.ThrowIfNull(settings);
        TemperatureUnit = settings.TemperatureUnit;
        ClockFormat = settings.ClockFormat;
        MomentKinds = settings.MomentKinds;
        SharesWeather = settings.SharesWeather;
        SharesStatus = settings.SharesStatus;
    }

    /// <summary>The id the browser gave its join request, so a repeated request makes no second pin. Never returned.</summary>
    public Guid? JoinRequestId { get; private set; }

    /// <summary>
    /// Moves the pin to the city of a new postal code (L2-032). The pin takes the city's own
    /// position and time zone, so a new postal code in the same city leaves it where it was.
    /// </summary>
    public void MoveTo(string postalCode, City city)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(postalCode);
        ArgumentNullException.ThrowIfNull(city);
        PostalCode = postalCode;
        City = city;
        CityId = city.Id;
    }

    /// <summary>The first character of up to the first two words of the name: "Liam O’Connor" is "LO".</summary>
    public string Initials => TeammateInitials.Of(Name);
}
