using Microsoft.EntityFrameworkCore;
using Mondino.Application.Persistence;

namespace Mondino.Infrastructure.Persistence;

internal sealed class DatabaseMigrator(AppDbContext database) : IDatabaseMigrator
{
    public async Task<MigrationOutcome> MigrateAsync(CancellationToken cancellationToken)
    {
        if (!database.Database.IsRelational())
        {
            return MigrationOutcome.NothingToApply;
        }

        await database.Database.MigrateAsync(cancellationToken);
        return MigrationOutcome.Applied;
    }
}
