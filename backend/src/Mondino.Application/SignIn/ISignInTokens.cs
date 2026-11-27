using Mondino.Domain.Teams;

namespace Mondino.Application.SignIn;

/// <summary>
/// The random value in a sign-in link, and what is kept of it (docs/adr/0011): a token of at least
/// 128 bits, encoded for a URL; its hash, which is stored; and the email sealed under a key only
/// the token gives.
/// </summary>
public interface ISignInTokens
{
    string Create();

    string Hash(string token);

    byte[] Seal(string token, EmailAddress email);

    /// <summary>The email sealed by <paramref name="token"/>, or null when it was sealed by another.</summary>
    EmailAddress? Unseal(string token, byte[] sealedEmail);
}
