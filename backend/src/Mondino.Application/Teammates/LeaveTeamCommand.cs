using MediatR;
using Microsoft.EntityFrameworkCore;
using Mondino.Application.Errors;
using Mondino.Application.Persistence;

namespace Mondino.Application.Teammates;

/// <summary>
/// Leaves the team (L2-036). It names no teammate: the one who leaves is always the asker, so no
/// request can remove another teammate's pin (L2-043).
/// </summary>
public sealed record LeaveTeamCommand(Guid TeamId) : IRequest, ITeamScopedRequest;

/// <summary>
/// Deletes the asker's teammate row, with their name, postal code, city, email fingerprint and
/// settings, and the sign-in links of their fingerprint that no other teammate holds, in one unit
/// of work; then ends their session. A team whose last teammate leaves is kept (docs/adr/0024).
/// </summary>
internal sealed class LeaveTeamCommandHandler(
    IAppDbContext database,
    ICurrentTeammate currentTeammate,
    ITeammateSessions sessions) : IRequestHandler<LeaveTeamCommand>
{
    public async Task Handle(LeaveTeamCommand request, CancellationToken cancellationToken)
    {
        var teammate = await database.Teammates
            .SingleOrDefaultAsync(t => t.Id == currentTeammate.TeammateId && t.TeamId == request.TeamId, cancellationToken)
            ?? throw RefusedException.NotFound(ErrorCodes.TeamNotFound);

        database.Teammates.Remove(teammate);
        if (teammate.EmailFingerprint is { } fingerprint
            && !await database.Teammates.AnyAsync(t => t.Id != teammate.Id && t.EmailFingerprint == fingerprint, cancellationToken))
        {
            database.SignInLinks.RemoveRange(
                await database.SignInLinks.Where(l => l.EmailFingerprint == fingerprint).ToListAsync(cancellationToken));
        }

        await database.SaveChangesAsync(cancellationToken);
        await sessions.EndAsync();
    }
}
