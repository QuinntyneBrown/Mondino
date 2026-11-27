using Microsoft.EntityFrameworkCore;
using Mondino.Domain.Teams;

namespace Mondino.Application.Persistence;

/// <summary>
/// The database as handlers see it. Each entity joins as a set with the journey that adds it.
/// Tests inject a database fault by replacing this.
/// </summary>
public interface IAppDbContext
{
    DbSet<Team> Teams { get; }

    DbSet<Teammate> Teammates { get; }

    DbSet<City> Cities { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
