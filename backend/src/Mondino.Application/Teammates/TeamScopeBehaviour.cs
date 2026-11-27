using MediatR;
using Mondino.Application.Errors;

namespace Mondino.Application.Teammates;

/// <summary>A request about one team, which only a teammate of that team may make (L2-043).</summary>
public interface ITeamScopedRequest
{
    Guid TeamId { get; }
}

/// <summary>
/// Refuses a request about a team that is not the current teammate's with 404 and
/// <c>team_not_found</c> before its handler runs: a team that exists and one that does not answer
/// alike, so a teammate learns nothing of another team, not even that it exists.
/// </summary>
internal sealed class TeamScopeBehaviour<TRequest, TResponse>(ICurrentTeammate currentTeammate)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(next);
        if (request is ITeamScopedRequest scoped
            && (!currentTeammate.IsAuthenticated || scoped.TeamId != currentTeammate.TeamId))
        {
            throw RefusedException.NotFound(ErrorCodes.TeamNotFound);
        }

        return next(cancellationToken);
    }
}
