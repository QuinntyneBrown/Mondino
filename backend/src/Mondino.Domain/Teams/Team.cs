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

    public Guid Id { get; private set; }

    public string Name { get; private set; }

    /// <summary>The random value in the team's invite link. It gives no access beyond joining this team.</summary>
    public string InviteToken { get; private set; }

    public IReadOnlyList<Teammate> Teammates => teammates;

    public Teammate Add(Guid id, string name, string colour, City city, DateTimeOffset joinedAt)
    {
        var teammate = new Teammate(id, Id, name, colour, city, joinedAt);
        teammates.Add(teammate);
        return teammate;
    }
}
