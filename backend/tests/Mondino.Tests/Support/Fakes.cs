using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mondino.Application.Persistence;
using Mondino.Application.Teammates;
using Mondino.Domain.SignIn;
using Mondino.Domain.Teams;

namespace Mondino.Tests.Support;

/// <summary>Counts the migrations asked for, and applies none.</summary>
public sealed class SpyDatabaseMigrator : IDatabaseMigrator
{
    public int Calls { get; private set; }

    public Task<MigrationOutcome> MigrateAsync(CancellationToken cancellationToken)
    {
        Calls++;
        return Task.FromResult(MigrationOutcome.Applied);
    }
}

/// <summary>A database that is down: every use of it throws.</summary>
public sealed class FailingAppDbContext : IAppDbContext
{
    public DbSet<Team> Teams => throw Down();

    public DbSet<Teammate> Teammates => throw Down();

    public DbSet<City> Cities => throw Down();

    public DbSet<SignInLink> SignInLinks => throw Down();

    public Task<int> SaveChangesAsync(CancellationToken cancellationToken) =>
        throw Down();

    private static InvalidOperationException Down() => new("The database is down.");
}

/// <summary>Who is asking, as the test says: no one until the test signs a teammate in.</summary>
public sealed class FakeCurrentTeammate : ICurrentTeammate
{
    public bool IsAuthenticated => TeammateId != Guid.Empty;

    public Guid TeammateId { get; set; }

    public Guid TeamId { get; set; }
}

/// <summary>Throws, carrying what must never reach a response.</summary>
[ApiController]
[Route("api/test-only")]
[AllowAnonymous]
public sealed class TestOnlyController : ControllerBase
{
    public const string Secret = "Sofia Bianchi 20121";

    [HttpGet("unhandled")]
    public IActionResult Unhandled() => throw new InvalidOperationException(Secret);
}

/// <summary>What the test-only change below was asked to do, so a test can see that nothing changed.</summary>
public sealed class TestOnlyChanges
{
    private int made;

    public int Made => made;

    public void Make() => Interlocked.Increment(ref made);
}

/// <summary>
/// A change that needs a session, as Profile &amp; Settings' will (journeys 22 to 24): it stands in
/// for them so the protection every such request gets can be proven before they exist.
/// </summary>
[ApiController]
[Route("api/test-only/teams/{teamId:guid}/changes")]
public sealed class TestOnlySessionController(TestOnlyChanges changes) : ControllerBase
{
    [HttpPost]
    public IActionResult Change()
    {
        changes.Make();
        return NoContent();
    }
}
