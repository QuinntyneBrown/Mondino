namespace Mondino.Application.Teams;

/// <summary>Makes the random value of a team's invite link: at least 128 bits, encoded for a URL.</summary>
public interface IInviteTokens
{
    string Create();
}
