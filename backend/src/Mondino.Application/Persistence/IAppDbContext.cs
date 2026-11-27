namespace Mondino.Application.Persistence;

/// <summary>
/// The database as handlers see it. Each entity joins as a set with the journey that adds it.
/// Tests inject a database fault by replacing this.
/// </summary>
public interface IAppDbContext
{
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
