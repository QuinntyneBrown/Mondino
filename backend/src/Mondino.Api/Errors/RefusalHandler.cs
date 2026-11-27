using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Mondino.Application.Errors;

namespace Mondino.Api.Errors;

/// <summary>Writes a handler's refusal as ProblemDetails with its status and its <c>code</c>.</summary>
internal sealed class RefusalHandler(IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        if (exception is not RefusedException refusal)
        {
            return false;
        }

        httpContext.Response.StatusCode = refusal.Status;
        var problem = new ProblemDetails { Status = refusal.Status };
        problem.Extensions["code"] = refusal.Code;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problem,
            Exception = exception,
        });
    }
}
