using Microsoft.EntityFrameworkCore;
using Mondino.Application.Persistence;
using Mondino.Domain.Teams;

namespace Mondino.Infrastructure.Persistence;

/// <summary>The database through EF Core: PostgreSQL when deployed (docs/adr/0004), InMemory in tests.</summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<Team> Teams => Set<Team>();

    public DbSet<Teammate> Teammates => Set<Teammate>();

    public DbSet<City> Cities => Set<City>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        ArgumentNullException.ThrowIfNull(modelBuilder);

        modelBuilder.Entity<Team>(team =>
        {
            team.HasKey(t => t.Id);
            team.Property(t => t.Id).ValueGeneratedNever();
            team.Property(t => t.Name).HasMaxLength(80).IsRequired();
            team.Property(t => t.InviteToken).HasMaxLength(64).IsRequired();
            team.HasIndex(t => t.InviteToken).IsUnique();
            team.HasMany(t => t.Teammates).WithOne().HasForeignKey(t => t.TeamId);
            team.Navigation(t => t.Teammates).HasField("teammates");
        });

        modelBuilder.Entity<Teammate>(teammate =>
        {
            teammate.HasKey(t => t.Id);
            teammate.Property(t => t.Id).ValueGeneratedNever();
            teammate.Property(t => t.Name).HasMaxLength(60).IsRequired();
            teammate.Property(t => t.Colour).HasMaxLength(16).IsRequired();
            teammate.Ignore(t => t.Initials);
            teammate.HasOne(t => t.City).WithMany().HasForeignKey(t => t.CityId);
            teammate.HasIndex(t => new { t.TeamId, t.JoinedAt });
        });

        modelBuilder.Entity<City>(city =>
        {
            city.HasKey(c => c.Id);
            city.Property(c => c.Id).ValueGeneratedNever();
            city.Property(c => c.Name).HasMaxLength(120).IsRequired();
            city.Property(c => c.CountryCode).HasMaxLength(2).IsRequired();
            city.Property(c => c.TimeZoneId).HasMaxLength(64).IsRequired();
            city.Ignore(c => c.Position);
            city.HasIndex(c => new { c.CountryCode, c.Name });
        });
    }
}
