using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Filters;
using Mondino.Application.Errors;
using Mondino.Infrastructure.Teammates;

namespace Mondino.Api.Security;

/// <summary>
/// Protects what a session changes against cross-site request forgery (L2-043, docs/adr/0010). On
/// every endpoint that needs a session, a <c>POST</c>, <c>PUT</c>, <c>PATCH</c> or <c>DELETE</c>
/// must return the antiforgery token in <c>X-XSRF-TOKEN</c>, or it is refused with 403 and
/// <c>cross_site_request</c> before anything is read; a read gives the token again. Open endpoints
/// carry no session and keep <see cref="SameSiteOnlyAttribute"/>.
/// </summary>
internal sealed class AntiforgeryFilter(IAntiforgery antiforgery) : IAsyncAuthorizationFilter
{
    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var http = context.HttpContext;
        if (context.ActionDescriptor.EndpointMetadata.OfType<IAllowAnonymous>().Any()
            || http.User.Identity?.IsAuthenticated != true)
        {
            return;
        }

        var method = http.Request.Method;
        if (HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsOptions(method))
        {
            TeammateSessionHandler.IssueAntiforgeryToken(http);
            return;
        }

        if (!await antiforgery.IsRequestValidAsync(http))
        {
            throw new RefusedException(StatusCodes.Status403Forbidden, ErrorCodes.CrossSiteRequest);
        }
    }
}
