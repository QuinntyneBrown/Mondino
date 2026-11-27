using Mondino.Application.Cities;

namespace Mondino.Application.Joining;

/// <summary>
/// The postal code source, behind its timeout, cache and breaker. It is given a country and a
/// postal code and nothing else (L2-050). The city it answers is the municipality the postal code
/// lies in, or the nearest city Mondino holds when it lies in none, always at the city's own
/// position (L2-006).
/// </summary>
public interface IPostalCodeLookup
{
    Task<PostalCodeLookupOutcome> FindCityAsync(PostalCode postalCode, CancellationToken cancellationToken);
}

public enum PostalCodeLookupStatus
{
    Found,
    NotFound,
    Unavailable,
}

/// <summary>What the source said: the city when it was found.</summary>
public sealed record PostalCodeLookupOutcome(PostalCodeLookupStatus Status, KnownCity? City)
{
    public static PostalCodeLookupOutcome Found(KnownCity city) => new(PostalCodeLookupStatus.Found, city);

    public static PostalCodeLookupOutcome NotFound { get; } = new(PostalCodeLookupStatus.NotFound, null);

    public static PostalCodeLookupOutcome Unavailable { get; } = new(PostalCodeLookupStatus.Unavailable, null);
}
