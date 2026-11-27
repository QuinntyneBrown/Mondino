namespace Mondino.Domain.Teams;

/// <summary>Someone in a team, with their pin at their city.</summary>
public sealed class Teammate
{
    private Teammate()
    {
        Name = string.Empty;
        Colour = string.Empty;
        City = null!;
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

    /// <summary>
    /// Whether the teammate shares if they are working or asleep ("Share whether I’m working or
    /// asleep", L2-015, L2-034): on to begin with. Off, their teammates are shown no status for them.
    /// </summary>
    public bool SharesStatus { get; private set; } = true;

    /// <summary>The id the browser gave its join request, so a repeated request makes no second pin. Never returned.</summary>
    public Guid? JoinRequestId { get; private set; }

    /// <summary>The first character of up to the first two words of the name: "Liam O’Connor" is "LO".</summary>
    public string Initials => TeammateInitials.Of(Name);
}
