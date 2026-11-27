namespace Mondino.Domain.Teams;

/// <summary>A team: its name, its invite link's token and its teammates.</summary>
public sealed class Team
{
    private readonly List<Teammate> teammates = [];

    private Team()
    {
        Name = string.Empty;
        InviteToken = string.Empty;
    }

    public Team(Guid id, string name, string inviteToken)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(inviteToken);
        Id = id;
        Name = name;
        InviteToken = inviteToken;
    }

    /// <summary>
    /// Makes a team with a random id and no teammates, for the request that asked for it (L2-053).
    /// </summary>
    public static Team Create(string name, string inviteToken, Guid createRequestId) =>
        new(Guid.NewGuid(), name, inviteToken) { CreateRequestId = createRequestId };

    public Guid Id { get; private set; }

    public string Name { get; private set; }

    /// <summary>The id the browser gave the request that made the team, so a repeated request makes no second team. Never returned.</summary>
    public Guid? CreateRequestId { get; private set; }

    /// <summary>The random value in the team's invite link. It gives no access beyond joining this team.</summary>
    public string InviteToken { get; private set; }

    /// <summary>A team holds up to 500 teammates (L2-005).</summary>
    public const int MaxTeammates = 500;

    public IReadOnlyList<Teammate> Teammates => teammates;

    public Teammate Add(Guid id, string name, string colour, City city, DateTimeOffset joinedAt)
    {
        var teammate = new Teammate(id, Id, name, colour, city, joinedAt);
        teammates.Add(teammate);
        return teammate;
    }

    /// <summary>
    /// Adds a teammate who joined through the invite link, with a random id. Throws
    /// <see cref="TeamFullException"/> when the team has all its places taken.
    /// </summary>
    public Teammate AddTeammate(
        string name, string? postalCode, City city, string colour, Guid joinRequestId, DateTimeOffset joinedAt)
    {
        if (teammates.Count >= MaxTeammates)
        {
            throw new TeamFullException();
        }

        var teammate = new Teammate(Guid.NewGuid(), Id, name, colour, city, joinedAt, postalCode, joinRequestId);
        teammates.Add(teammate);
        return teammate;
    }
}
