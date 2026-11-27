using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Mondino.Application.Errors;
using Mondino.Application.Persistence;
using Mondino.Application.Teams;
using Mondino.Domain.SignIn;
using Mondino.Domain.Teams;

namespace Mondino.Application.SignIn;

/// <summary>Asks for a sign-in link for an email (L2-052). The answer is the same whatever the email.</summary>
public sealed record RequestSignInLinkCommand(string? Email) : IRequest;

/// <summary>
/// Runs the same steps for every email in the form of an address, so neither the answer nor what
/// is stored says whether the email is a teammate's (L2-043). Mail is handed to the outbox only for
/// a teammate's email, and never waited for (docs/adr/0011).
/// </summary>
internal sealed class RequestSignInLinkCommandHandler(
    IAppDbContext database,
    IEmailFingerprints fingerprints,
    ISignInTokens tokens,
    ISignInMailOutbox outbox,
    IOptions<SignInLinkOptions> options,
    TimeProvider time) : IRequestHandler<RequestSignInLinkCommand>
{
    /// <summary>At most 3 links for one email in 15 minutes, from any number of clients (L2-045).</summary>
    public const int LinksPerEmail = 3;

    public async Task Handle(RequestSignInLinkCommand request, CancellationToken cancellationToken)
    {
        if (!EmailAddress.TryParse(request.Email, out var email))
        {
            throw new RefusedException(400, ErrorCodes.ValidationFailed);
        }

        var now = time.GetUtcNow();
        var fingerprint = fingerprints.FingerprintOf(email!);

        // 1. This email's expired links go; those of the last 15 minutes are counted.
        var links = await database.SignInLinks
            .Where(link => link.EmailFingerprint == fingerprint)
            .ToListAsync(cancellationToken);
        database.SignInLinks.RemoveRange(links.Where(link => link.ExpiresAt <= now));
        if (links.Count(link => link.ExpiresAt > now) >= LinksPerEmail)
        {
            await database.SaveChangesAsync(cancellationToken);
            return;
        }

        // 2. A token, of which only the hash and the sealed email are kept. 3. The link, saved.
        var token = tokens.Create();
        database.SignInLinks.Add(new SignInLink(tokens.Hash(token), fingerprint, tokens.Seal(token, email!), now));
        await database.SaveChangesAsync(cancellationToken);

        // 4. A teammate's email is mailed its link; any other is not.
        var isTeammate = await database.Teammates.AsNoTracking()
            .AnyAsync(teammate => teammate.EmailFingerprint == fingerprint, cancellationToken);
        if (isTeammate && options.Value.AppAddress is { } app)
        {
            outbox.Enqueue(new SignInMail(email!, new Uri(app, "/sign-in#" + token)));
        }
    }
}
