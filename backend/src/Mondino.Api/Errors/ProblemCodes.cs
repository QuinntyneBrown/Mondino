using Mondino.Application.Errors;

namespace Mondino.Api.Errors;

internal static class ProblemCodes
{
    private const string Code = "code";

    /// <summary>
    /// Gives every ProblemDetails a <c>code</c> where its handler gave none, and makes sure an
    /// unexpected error says nothing of what went wrong: no message, no stack trace, no request
    /// data. The correlation id (<c>traceId</c>) is what a person quotes.
    /// </summary>
    public static void Customize(ProblemDetailsContext context)
    {
        var problem = context.ProblemDetails;
        var status = problem.Status ?? context.HttpContext.Response.StatusCode;

        if (!problem.Extensions.ContainsKey(Code) && ErrorCodes.ForStatus(status) is { } code)
        {
            problem.Extensions[Code] = code;
        }

        if (status >= StatusCodes.Status500InternalServerError)
        {
            problem.Detail = null;
        }
    }
}
