using Microsoft.EntityFrameworkCore;
using Mondino.Application.Persistence;

namespace Mondino.Infrastructure.Persistence;

/// <summary>
/// The database through EF Core. It holds no entity yet: the first journey that holds a team
/// adds its sets here and to <see cref="IAppDbContext"/>, with their configurations.
/// </summary>
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options), IAppDbContext;
