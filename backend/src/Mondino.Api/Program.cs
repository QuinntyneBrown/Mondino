using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Mondino.Api.Errors;
using Mondino.Api.RateLimiting;
using Mondino.Application;
using Mondino.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

// The server does not name itself or its version.
builder.WebHost.ConfigureKestrel(options => options.AddServerHeader = false);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddControllers();
builder.Services.AddProblemDetails(options => options.CustomizeProblemDetails = ProblemCodes.Customize);
builder.Services.AddExceptionHandler<RefusalHandler>();
builder.Services.AddHealthChecks();
builder.Services.AddRateLimitPolicies();

// Closed by default: every endpoint needs a teammate's session unless it is marked open with
// [AllowAnonymous] and a rate limit (L2-045, docs/adr/0010).
builder.Services.AddAuthorizationBuilder()
    .SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

var app = builder.Build();

// Every error is ProblemDetails with a code. No migration is applied here: `Mondino.Cli migrate` does.
app.UseExceptionHandler();
app.UseStatusCodePages();

// In a deployment the Angular build is published into wwwroot and served from the same origin,
// so the browser calls only this backend. Its files are open to anyone.
app.UseDefaultFiles();
app.UseStaticFiles();

app.UseRouting();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Liveness: the process is running. It checks nothing else, so it never fails with a dependency.
app.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false }).AllowAnonymous();
app.MapControllers();

// An unknown /api route stays a 404, never the app shell.
app.Map("/api/{**rest}", () => Results.Problem(statusCode: StatusCodes.Status404NotFound)).AllowAnonymous();
app.MapFallbackToFile("index.html").AllowAnonymous();

await app.RunAsync();

/// <summary>The API's entry point, public so the acceptance tests can host it.</summary>
public partial class Program;
