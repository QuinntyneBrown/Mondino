using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Mondino.Infrastructure.Persistence;

/// <summary>
/// Gives `dotnet ef` a PostgreSQL context to make migrations from. It never connects: the
/// connection string only names the provider. `Mondino.Cli migrate` applies the migrations.
/// </summary>
internal sealed class DesignTimeAppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<AppDbContext>()
            .UseNpgsql("Host=localhost;Database=mondino_design_time")
            .Options);
}
