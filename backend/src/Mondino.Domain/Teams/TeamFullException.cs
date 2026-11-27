namespace Mondino.Domain.Teams;

/// <summary>A team that already has all <see cref="Team.MaxTeammates"/> of its places taken.</summary>
public sealed class TeamFullException() : Exception("The team has all of its places taken.");
