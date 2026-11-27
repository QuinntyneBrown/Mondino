using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mondino.Application.Persistence;
using Mondino.Application.Teammates;
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
public sealed class TestOnlyController : ControllerBase
{
    public const string Secret = "Sofia Bianchi 20121";

    [HttpGet("unhandled")]
    public IActionResult Unhandled() => throw new InvalidOperationException(Secret);
}
