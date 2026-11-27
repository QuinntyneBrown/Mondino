namespace Mondino.Application.Teammates;

/// <summary>
/// The teammate the request's session belongs to, or none. Handlers read who is asking from
/// here, never from a request's body. The session is issued on joining, on making a team and on
/// signing in.
/// </summary>
public interface ICurrentTeammate
{
    bool IsAuthenticated { get; }

    Guid TeammateId { get; }

    Guid TeamId { get; }
}
