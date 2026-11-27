using System.Security.Cryptography;

namespace Mondino.Api.Security;

/// <summary>
/// Adds the security headers to every answer, the app's files and every refusal included (L2-044,
/// docs/adr/0010): a Content-Security-Policy of the app's own origin, whose inline scripts and
/// styles are allowed by a nonce made for this answer alone, <c>nosniff</c>, <c>no-referrer</c>, so
/// an invite link is never sent to another site, and HSTS.
/// </summary>
internal sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    private const string NonceKey = "mondino.csp-nonce";

    /// <summary>The nonce of this answer's policy, which <see cref="AppShell"/> writes into the page.</summary>
    public static string NonceOf(HttpContext context) => (string)context.Items[NonceKey]!;

    public Task InvokeAsync(HttpContext context)
    {
        var nonce = Convert.ToBase64String(RandomNumberGenerator.GetBytes(16));
        context.Items[NonceKey] = nonce;
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers.ContentSecurityPolicy =
                $"default-src 'self'; script-src 'self' 'nonce-{nonce}'; style-src 'self' 'nonce-{nonce}'; " +
                "font-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; " +
                "form-action 'self'; frame-ancestors 'none'";
            headers.XContentTypeOptions = "nosniff";
            headers["Referrer-Policy"] = "no-referrer";
            headers.StrictTransportSecurity = "max-age=31536000; includeSubDomains";
            return Task.CompletedTask;
        });
        return next(context);
    }
}
