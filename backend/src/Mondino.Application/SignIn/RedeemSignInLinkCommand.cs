using MediatR;
using Microsoft.EntityFrameworkCore;
using Mondino.Application.Errors;
using Mondino.Application.Joining;
using Mondino.Application.Persistence;

namespace Mondino.Application.SignIn;

/// <summary>Opens a sign-in link by its token (L2-052).</summary>
public sealed record RedeemSignInLinkCommand(string? SignInToken) : IRequest<SignInResultDto>;

/// <summary>The team signed in to, by random ids and its name. Never an email.</summary>
public sealed record MembershipDto(Guid TeamId, Guid TeammateId, string TeamName);

/// <summary>
/// What opening a good link came to: the team its teammate is signed in to, or, when the email is
/// on no team, that email, for "You need an invite link" (L2-038). Never both.
/// </summary>
public sealed record SignInResultDto(MembershipDto? Membership, string? Email);

/// <summary>
/// Uses a link once, within 15 minutes by <see cref="TimeProvider"/>. A link that was never issued,
/// was used or has expired is refused alike with <c>sign_in_link_unusable</c>. An email on several
/// teams opens the team its teammate joined or made last (docs/adr/0011).
/// </summary>
internal sealed class RedeemSignInLinkCommandHandler(
    IAppDbContext database,
    ISignInTokens tokens,
    TeamJoinGate gate,
    TimeProvider time) : IRequestHandler<RedeemSignInLinkCommand, SignInResultDto>
{
    /// <summary>Longer than any token Mondino makes; anything longer is not one.</summary>
    public const int MaxTokenLength = 128;

    public async Task<SignInResultDto> Handle(RedeemSignInLinkCommand request, CancellationToken cancellationToken)
    {
        var token = request.SignInToken;
        if (string.IsNullOrWhiteSpace(token) || token.Length > MaxTokenLength)
        {
            throw Unusable();
        }

        var hash = tokens.Hash(token);

        // One opening of a token at a time in this instance; across instances, UsedAt's concurrency check.
        using var _ = await gate.EnterAsync("sign-in " + hash, cancellationToken);
        var link = await database.SignInLinks.SingleOrDefaultAsync(l => l.TokenHash == hash, cancellationToken);
        if (link is null || !link.TryUse(time.GetUtcNow()))
        {
            throw Unusable();
        }

        try
        {
            await database.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw Unusable();
        }

        var membership = await database.Teammates.AsNoTracking()
            .Where(teammate => teammate.EmailFingerprint == link.EmailFingerprint)
            .OrderByDescending(teammate => teammate.JoinedAt)
            .Join(
                database.Teams.AsNoTracking(),
                teammate => teammate.TeamId,
                team => team.Id,
                (teammate, team) => new MembershipDto(team.Id, teammate.Id, team.Name))
            .FirstOrDefaultAsync(cancellationToken);
        return membership is not null
            ? new SignInResultDto(membership, null)
            : new SignInResultDto(null, tokens.Unseal(token, link.SealedEmail)?.Value);
    }

    private static RefusedException Unusable() => new(410, ErrorCodes.SignInLinkUnusable);
}
