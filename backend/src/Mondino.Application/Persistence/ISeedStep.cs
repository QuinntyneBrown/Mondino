namespace Mondino.Application.Persistence;

/// <summary>
/// One part of the seed data. A step is idempotent: it adds only what is missing, so running
/// the seed twice leaves what the first run left.
/// </summary>
public interface ISeedStep
{
    Task SeedAsync(IAppDbContext database, CancellationToken cancellationToken);
}
