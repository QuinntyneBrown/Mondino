using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Mondino.Api.Telemetry;

namespace Mondino.Api.Errors;

/// <summary>
/// The last exception handler (L2-051, docs/adr/0031): logs an unhandled error's type and the
/// correlation id, and neither its message nor anything of the request, since either can hold what
/// a person typed; then answers 500 with the code <c>unexpected</c> and the same correlation id.
/// </summary>
internal sealed class UnhandledExceptionHandler(IProblemDetailsService problemDetails, ILogger<UnhandledExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(httpContext);
        ArgumentNullException.ThrowIfNull(exception);
        logger.UnhandledError(exception.GetType().FullName ?? exception.GetType().Name, ProblemCodes.CorrelationId(httpContext));

        httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
        return await problemDetails.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = new ProblemDetails { Status = StatusCodes.Status500InternalServerError },
            Exception = exception,
        });
    }
}
