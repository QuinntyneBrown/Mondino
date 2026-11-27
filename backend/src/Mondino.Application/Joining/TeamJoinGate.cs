namespace Mondino.Application.Joining;

/// <summary>
/// Lets one join at a time into one team, within one API instance, so a double-click cannot add
/// two teammates and the 500th place cannot be taken twice. A fixed set of locks, chosen by the
/// team's id, so it holds no more memory however many teams there are. Across instances the unique
/// index on (<c>TeamId</c>, <c>JoinRequestId</c>) holds.
/// </summary>
public sealed class TeamJoinGate : IDisposable
{
    private const int Stripes = 64;
    private readonly SemaphoreSlim[] locks = Enumerable.Range(0, Stripes).Select(_ => new SemaphoreSlim(1, 1)).ToArray();

    public async Task<IDisposable> EnterAsync(string inviteToken, CancellationToken cancellationToken)
    {
        ArgumentNullException.ThrowIfNull(inviteToken);
        var gate = locks[(int)((uint)StringComparer.Ordinal.GetHashCode(inviteToken) % Stripes)];
        await gate.WaitAsync(cancellationToken);
        return new Release(gate);
    }

    public void Dispose()
    {
        foreach (var gate in locks)
        {
            gate.Dispose();
        }
    }

    private sealed class Release(SemaphoreSlim gate) : IDisposable
    {
        public void Dispose() => gate.Release();
    }
}
