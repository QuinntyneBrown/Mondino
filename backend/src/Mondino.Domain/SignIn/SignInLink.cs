namespace Mondino.Domain.SignIn;

/// <summary>
/// A sign-in link that was asked for (L2-052): the hash of its token, the fingerprint of the email
/// it was asked for, that email sealed by the token, and when it expires and was used. The token
/// and the address themselves are kept nowhere (docs/adr/0009, docs/adr/0011).
/// </summary>
public sealed class SignInLink
{
    /// <summary>A link works for 15 minutes after it is asked for.</summary>
    public static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(15);

    private SignInLink()
    {
        TokenHash = string.Empty;
        EmailFingerprint = string.Empty;
        SealedEmail = [];
    }

    public SignInLink(string tokenHash, string emailFingerprint, byte[] sealedEmail, DateTimeOffset createdAt)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(tokenHash);
        ArgumentException.ThrowIfNullOrWhiteSpace(emailFingerprint);
        ArgumentNullException.ThrowIfNull(sealedEmail);
        Id = Guid.NewGuid();
        TokenHash = tokenHash;
        EmailFingerprint = emailFingerprint;
        SealedEmail = sealedEmail;
        CreatedAt = createdAt;
        ExpiresAt = createdAt + Lifetime;
    }

    public Guid Id { get; private set; }

    /// <summary>The SHA-256 of the token, from which the link cannot be rebuilt.</summary>
    public string TokenHash { get; private set; }

    /// <summary>The keyed fingerprint of the email the link was asked for.</summary>
    public string EmailFingerprint { get; private set; }

    /// <summary>The email, encrypted under a key only the link's token gives.</summary>
    public byte[] SealedEmail { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public DateTimeOffset ExpiresAt { get; private set; }

    /// <summary>When the link was opened; a link is used once.</summary>
    public DateTimeOffset? UsedAt { get; private set; }

    /// <summary>Uses the link, when it is unused and <paramref name="now"/> is before it expires.</summary>
    public bool TryUse(DateTimeOffset now)
    {
        if (UsedAt is not null || now >= ExpiresAt)
        {
            return false;
        }

        UsedAt = now;
        return true;
    }
}
