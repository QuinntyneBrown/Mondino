namespace Mondino.Application.Persistence;

/// <summary>Applies the database's migrations. A CLI command calls it; the API never does.</summary>
public interface IDatabaseMigrator
{
    Task<MigrationOutcome> MigrateAsync(CancellationToken cancellationToken);
}

public enum MigrationOutcome
{
    /// <summary>The database is at the latest migration.</summary>
    Applied,

    /// <summary>The store keeps no schema (EF Core InMemory), so there was nothing to apply.</summary>
    NothingToApply,
}
