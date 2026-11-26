using Microsoft.AspNetCore.Mvc;
using Mondino.Application.Persistence;

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
    public Task<int> SaveChangesAsync(CancellationToken cancellationToken) =>
        throw new InvalidOperationException("The database is down.");
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
