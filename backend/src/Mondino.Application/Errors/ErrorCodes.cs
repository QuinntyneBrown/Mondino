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
