using System.Diagnostics;
using Mondino.Application.Errors;

namespace Mondino.Api.Errors;

internal static class ProblemCodes
{
    private const string Code = "code";
    private const string CorrelationIdKey = "correlationId";

    /// <summary>
    /// Gives every ProblemDetails a <c>code</c> where its handler gave none, and makes sure an
    /// unexpected error says nothing of what went wrong: no message, no stack trace, no request
    /// data. The correlation id, the request's trace id, is what a person quotes: it is on the
    /// request's span and logs too (docs/adr/0031). It takes the place of the framework's <c>traceId</c>.
    /// </summary>
    public static void Customize(ProblemDetailsContext context)
    {
        var problem = context.ProblemDetails;
        var status = problem.Status ?? context.HttpContext.Response.StatusCode;

        if (!problem.Extensions.ContainsKey(Code) && ErrorCodes.ForStatus(status) is { } code)
        {
            problem.Extensions[Code] = code;
        }

        problem.Extensions.Remove("traceId");
        problem.Extensions[CorrelationIdKey] = CorrelationId(context.HttpContext);

        if (status >= StatusCodes.Status500InternalServerError)
        {
            problem.Detail = null;
        }
    }

    /// <summary>The request's trace id, or, with no trace, the request's own identifier.</summary>
    public static string CorrelationId(HttpContext context) =>
        Activity.Current is { } activity ? activity.TraceId.ToHexString() : context.TraceIdentifier;
}
