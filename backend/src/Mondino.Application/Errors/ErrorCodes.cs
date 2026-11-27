namespace Mondino.Application.Errors;

/// <summary>
/// The <c>code</c> a ProblemDetails carries where a client branches on it. A screen shows its
/// own message for a code; the backend's text is never shown.
/// </summary>
public static class ErrorCodes
{
    public const string InvalidRequest = "invalid_request";
    public const string Unauthorized = "unauthorized";
    public const string Forbidden = "forbidden";
    public const string NotFound = "not_found";
    public const string MethodNotAllowed = "method_not_allowed";
    public const string RateLimited = "rate_limited";
    public const string Unexpected = "unexpected";

    /// <summary>An invite token that matches no team: never issued, mistyped or reset.</summary>
    public const string InviteNotFound = "invite_not_found";

    /// <summary>A request whose values break a rule of its own: an unsupported country, a value too long.</summary>
    public const string ValidationFailed = "validation_failed";

    /// <summary>A postal code that does not fit its country's form, or that the source does not know.</summary>
    public const string PostalCodeNotFound = "postal_code_not_found";

    /// <summary>The postal code source did not answer in time, or its breaker is open.</summary>
    public const string PostalCodeUnavailable = "postal_code_unavailable";

    /// <summary>A team that already has all 500 of its places taken.</summary>
    public const string TeamFull = "team_full";

    /// <summary>A team that is not the current teammate's, or that does not exist: the two answer alike.</summary>
    public const string TeamNotFound = "team_not_found";

    /// <summary>A request that changes something, sent from another site (docs/adr/0008).</summary>
    public const string CrossSiteRequest = "cross_site_request";

    /// <summary>The code for a status that no handler gave a code of its own.</summary>
    public static string? ForStatus(int status) => status switch
    {
        400 => InvalidRequest,
        401 => Unauthorized,
        403 => Forbidden,
        404 => NotFound,
        405 => MethodNotAllowed,
        429 => RateLimited,
        >= 500 => Unexpected,
        _ => null,
    };
}
