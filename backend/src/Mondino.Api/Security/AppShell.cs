using Microsoft.Net.Http.Headers;

namespace Mondino.Api.Security;

/// <summary>
/// Serves the Angular build's <c>index.html</c> for every address of a screen, with its nonce
/// placeholder replaced by this answer's nonce, so Angular's own scripts and styles are the only
/// inline ones the policy allows (docs/adr/0010). It is never cached; the hashed files are served
/// as they are.
/// </summary>
internal sealed class AppShell(IWebHostEnvironment environment)
{
    /// <summary>What the build writes where the nonce goes: on <c>mo-root</c>'s <c>ngCspNonce</c> and each inline script and style.</summary>
    public const string Placeholder = "MONDINO_CSP_NONCE";

    private readonly Lazy<string?> page = new(() =>
    {
        var file = environment.WebRootFileProvider.GetFileInfo("index.html");
        if (!file.Exists)
        {
            return null;
        }

        using var reader = new StreamReader(file.CreateReadStream());
        return reader.ReadToEnd();
    });

    public async Task ServeAsync(HttpContext context)
    {
        if (page.Value is not { } html)
        {
            context.Response.StatusCode = StatusCodes.Status404NotFound;
            return;
        }

        context.Response.ContentType = "text/html; charset=utf-8";
        context.Response.Headers.CacheControl = "no-cache";
        await context.Response.WriteAsync(
            html.Replace(Placeholder, SecurityHeadersMiddleware.NonceOf(context), StringComparison.Ordinal),
            context.RequestAborted);
    }
}
