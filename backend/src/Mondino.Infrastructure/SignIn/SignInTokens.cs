using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.WebUtilities;
using Mondino.Application.SignIn;
using Mondino.Domain.Teams;

namespace Mondino.Infrastructure.SignIn;

/// <summary>
/// 32 random bytes (256 bits), base64url without padding: 43 characters. Kept as its SHA-256, hex
/// encoded. The email is sealed with AES-GCM under <c>HMAC-SHA256(token, "mondino sign-in email")</c>,
/// so the stored hash cannot open it and only the link's holder can (docs/adr/0011).
/// </summary>
internal sealed class SignInTokens : ISignInTokens
{
    private const int NonceSize = 12;
    private const int TagSize = 16;
    private static readonly byte[] SealPurpose = Encoding.UTF8.GetBytes("mondino sign-in email");

    public string Create() => WebEncoders.Base64UrlEncode(RandomNumberGenerator.GetBytes(32));

    public string Hash(string token)
    {
        ArgumentNullException.ThrowIfNull(token);
        return Convert.ToHexStringLower(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    }

    public byte[] Seal(string token, EmailAddress email)
    {
        ArgumentNullException.ThrowIfNull(email);
        var plain = Encoding.UTF8.GetBytes(email.Value);
        var sealedEmail = new byte[NonceSize + TagSize + plain.Length];
        var nonce = sealedEmail.AsSpan(0, NonceSize);
        RandomNumberGenerator.Fill(nonce);
        using var aes = new AesGcm(KeyOf(token), TagSize);
        aes.Encrypt(nonce, plain, sealedEmail.AsSpan(NonceSize + TagSize), sealedEmail.AsSpan(NonceSize, TagSize));
        return sealedEmail;
    }

    public EmailAddress? Unseal(string token, byte[] sealedEmail)
    {
        ArgumentNullException.ThrowIfNull(sealedEmail);
        if (sealedEmail.Length <= NonceSize + TagSize)
        {
            return null;
        }

        var plain = new byte[sealedEmail.Length - NonceSize - TagSize];
        try
        {
            using var aes = new AesGcm(KeyOf(token), TagSize);
            aes.Decrypt(
                sealedEmail.AsSpan(0, NonceSize),
                sealedEmail.AsSpan(NonceSize + TagSize),
                sealedEmail.AsSpan(NonceSize, TagSize),
                plain);
        }
        catch (AuthenticationTagMismatchException)
        {
            return null;
        }

        return EmailAddress.TryParse(Encoding.UTF8.GetString(plain), out var email) ? email : null;
    }

    private static byte[] KeyOf(string token)
    {
        ArgumentNullException.ThrowIfNull(token);
        return HMACSHA256.HashData(Encoding.UTF8.GetBytes(token), SealPurpose);
    }
}
