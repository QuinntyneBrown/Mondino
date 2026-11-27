using Microsoft.AspNetCore.Authorization;
using Mondino.Api.Errors;
using Mondino.Api.Health;
using Mondino.Api.Hosting;
using Mondino.Api.RateLimiting;
using Mondino.Api.Security;
using Mondino.Application;
using Mondino.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// The server does not name itself or its version.
builder.WebHost.ConfigureKestrel(options => options.AddServerHeader = false);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddControllers(options => options.Filters.Add<AntiforgeryFilter>());
builder.Services.AddProblemDetails(options => options.CustomizeProblemDetails = ProblemCodes.Customize);
builder.Services.AddExceptionHandler<RefusalHandler>();
builder.Services.AddMondinoHealth();
builder.Services.AddSingleton<AppShell>();
builder.Services.AddRateLimitPolicies();
builder.Services.AddAppCompression();

// Closed by default: every endpoint needs a teammate's session unless it is marked open with
// [AllowAnonymous] and a rate limit, or, for making a team alone, with no limit (L2-045,
// docs/adr/0010, docs/adr/0016).
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

var app = builder.Build();

// The security headers go on every answer, the refusals included, so they are added first.
app.UseMiddleware<SecurityHeadersMiddleware>();

// Every body that is text, the page and the globe's model among them, is compressed (docs/adr/0030).
app.UseResponseCompression();

// Every error is ProblemDetails with a code. No migration is applied here: `Mondino.Cli migrate` does.
app.UseExceptionHandler();
app.UseStatusCodePages();

// In a deployment the Angular build is published into wwwroot and served from the same origin,
// so the browser calls only this backend. Its files are open to anyone; index.html is served by
// AppShell, with this answer's nonce, wherever it is asked for.
app.Use((context, next) =>
{
    if (context.Request.Path.Equals("/index.html", StringComparison.OrdinalIgnoreCase))
    {
        context.Request.Path = "/";
    }

    return next(context);
});
// A file named by its content's hash is kept by the browser for a year (docs/adr/0030).
app.UseStaticFiles(AppFiles.StaticFiles());

app.UseRouting();
// The limiter runs after authentication, so a teammate's own lookups are counted for them (docs/adr/0022).
app.UseAuthentication();
app.UseRateLimiter();
app.UseAuthorization();

// Liveness and readiness, each a status and nothing else (L2-051).
app.MapMondinoHealth();
app.MapControllers();

// An unknown /api route stays a 404, never the app shell.
app.Map("/api/{**rest}", () => Results.Problem(statusCode: StatusCodes.Status404NotFound)).AllowAnonymous();
app.MapFallback((HttpContext context) => context.RequestServices.GetRequiredService<AppShell>().ServeAsync(context))
    .AllowAnonymous();

await app.RunAsync();

/// <summary>The API's entry point, public so the acceptance tests can host it.</summary>
public partial class Program;
