namespace Mondino.Application.Teammates;

/// <summary>
/// Ends the asker's session (L2-036): the answer expires the session cookie and the antiforgery
/// cookie. Sessions are not stored (docs/adr/0008); any other copy of the session is refused once
/// its teammate is gone (docs/adr/0010, docs/adr/0024).
/// </summary>
public interface ITeammateSessions
{
    Task EndAsync();
}
