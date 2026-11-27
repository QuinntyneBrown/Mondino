using Microsoft.AspNetCore.Mvc.Filters;
using Mondino.Application.Errors;

namespace Mondino.Api.Security;

/// <summary>
/// Refuses a request that changes something when another site sent it (docs/adr/0008): its
/// <c>Sec-Fetch-Site</c> is neither <c>same-origin</c> nor <c>none</c>, or, with no
/// <c>Sec-Fetch-Site</c>, its <c>Origin</c> is not the API's own. Refused with 403 and the code
/// <c>cross_site_request</c> before the body is read.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
internal sealed class SameSiteOnlyAttribute : Attribute, IResourceFilter
{
    public void OnResourceExecuting(ResourceExecutingContext context)
    {
        var request = context.HttpContext.Request;
        var site = request.Headers["Sec-Fetch-Site"].ToString();
        var origin = request.Headers.Origin.ToString();
        var fromElsewhere = site.Length > 0
            ? site is not ("same-origin" or "none")
            : origin.Length > 0 && !string.Equals(origin, $"{request.Scheme}://{request.Host}", StringComparison.OrdinalIgnoreCase);
        if (fromElsewhere)
        {
            throw new RefusedException(403, ErrorCodes.CrossSiteRequest);
        }
    }

    public void OnResourceExecuted(ResourceExecutedContext context)
    {
    }
}
